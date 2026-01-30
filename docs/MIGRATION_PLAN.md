# Babel Migration Plan

**Goal**: Transform HTML prototype into Next.js + Supabase multi-user application  
**Strategy**: Incremental migration with minimal UI changes  
**Timeline**: 4 phases, ~2-4 weeks total (with multiple developers)

---

## Migration Strategy

### Core Principles

1. **Preserve Working Code**: Don't rewrite what works—extract and wrap it
2. **Test Continuously**: Each task should leave the app in a working state
3. **Minimal UI Changes**: Keep exact same look and feel
4. **Progressive Enhancement**: Anonymous → Authenticated → Multi-project → Sharing

### Risk Mitigation

- Keep vanilla JavaScript core logic intact initially
- Create parallel Next.js pages before removing HTML file
- Test each feature in isolation before integration
- Maintain version control with frequent commits

---

## Phase 1: Foundation Setup

**Duration**: 2-3 days  
**Goal**: Set up Next.js project structure and Supabase integration without touching diagram functionality

### Task 1.1: Initialize Next.js Project

**Assigned to**: [Developer Name]  
**Estimated time**: 1 hour  
**Branch**: `feature/nextjs-setup`

**Steps**:
1. Create Next.js 14+ app with TypeScript in project root:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
   ```
   Answer prompts:
   - TypeScript: Yes
   - ESLint: Yes
   - Tailwind CSS: Yes
   - App Router: Yes
   - Import alias (@/*): Yes

2. Install required dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
   npm install --save-dev @types/node
   ```

3. Create environment file:
   ```bash
   cp .env.example .env.local
   ```
   Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Update `.gitignore`:
   ```
   .env*.local
   .next
   node_modules
   ```

**Acceptance Criteria**:
- [ ] `npm run dev` starts Next.js server successfully
- [ ] http://localhost:3000 shows default Next.js page
- [ ] No TypeScript errors in console
- [ ] Environment variables are loaded (test with `console.log`)

**Testing**:
```bash
npm run dev
# Visit http://localhost:3000
# Check browser console for errors
```

---

### Task 1.2: Set Up Supabase

**Assigned to**: [Developer Name]  
**Estimated time**: 1 hour  
**Branch**: `feature/supabase-setup`

**Steps**:
1. Create Supabase project at https://supabase.com
2. Copy project URL and anon key to `.env.local`
3. Run database migration from `docs/DATABASE_SCHEMA.md`:
   - Go to Supabase SQL Editor
   - Copy entire "Initial Migration" section
   - Execute SQL
   - Verify tables created in Table Editor

4. Create Supabase client utility:
   ```typescript
   // lib/supabase/client.ts
   import { createBrowserClient } from '@supabase/ssr'
   
   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   }
   ```

5. Create server-side client utility:
   ```typescript
   // lib/supabase/server.ts
   import { createServerClient, type CookieOptions } from '@supabase/ssr'
   import { cookies } from 'next/headers'
   
   export async function createClient() {
     const cookieStore = await cookies()
     
     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           get(name: string) {
             return cookieStore.get(name)?.value
           },
         },
       }
     )
   }
   ```

**Acceptance Criteria**:
- [ ] Supabase project created successfully
- [ ] All 4 tables exist in Supabase Table Editor
- [ ] RLS policies are enabled (check in Authentication > Policies)
- [ ] Supabase client can be imported without errors
- [ ] Test connection:
     ```typescript
     const supabase = createClient()
     const { data } = await supabase.from('profiles').select('*')
     console.log(data)
     ```

**Testing**:
- Test auth: Create test user in Supabase Authentication
- Test RLS: Try to query tables from browser console

---

### Task 1.3: Create Project Structure

**Assigned to**: [Developer Name]  
**Estimated time**: 30 minutes  
**Branch**: `feature/project-structure`

**Steps**:
1. Create folder structure:
   ```
   mkdir -p lib/{xml,diagram,diff,supabase,utils}
   mkdir -p types
   mkdir -p components/{auth,editor,projects,ui}
   mkdir -p styles
   mkdir -p docs
   ```

2. Copy CSS from HTML prototype:
   - Extract all `<style>` content from `xml-diagram-editor-with-ai-chat-v4.html`
   - Save to `styles/diagram.css`
   - Import in `app/layout.tsx`:
     ```typescript
     import '../styles/diagram.css'
     ```

3. Create TypeScript types:
   ```typescript
   // types/diagram.ts
   export interface DiagramItem {
     id: string
     type: 'object' | 'page' | 'info' | 'function' | 'case'
     title: string
     nestingLevel: number
     instanceOf?: string
     linkTo?: string
     children: DiagramItem[]
     columnIndex?: number
   }
   
   export interface ParsedData {
     objectMap: DiagramItem[][]
     siteMap: DiagramItem[][]
   }
   
   export interface Registry {
     [id: string]: DiagramItem
   }
   ```

   ```typescript
   // types/database.ts
   export interface Profile {
     id: string
     email: string
     full_name: string | null
     avatar_url: string | null
     created_at: string
     updated_at: string
   }
   
   export interface Project {
     id: string
     owner_id: string
     name: string
     description: string | null
     xml: string
     is_public: boolean
     last_edited_by: string | null
     last_edited_at: string | null
     created_at: string
     updated_at: string
   }
   
   export interface Version {
     id: string
     project_id: string
     name: string
     description: string | null
     xml: string
     version_number: number
     created_by: string
     created_at: string
   }
   
   export interface ProjectSharing {
     id: string
     project_id: string
     user_id: string
     permission: 'view' | 'edit'
     invited_by: string
     invited_at: string
     accepted_at: string | null
   }
   ```

**Acceptance Criteria**:
- [ ] All folders exist
- [ ] CSS imported and visible (test with a styled div)
- [ ] TypeScript types can be imported without errors
- [ ] No linting errors

---

## Phase 2: Extract Core Functionality

**Duration**: 3-5 days  
**Goal**: Extract XML parsing, diagram rendering, and core logic from HTML into reusable TypeScript modules

### Task 2.1: Extract XML Parser

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/xml-parser`

**Steps**:
1. Create `lib/xml/parser.ts`
2. Extract these functions from HTML file:
   - `parseXML()`
   - `parseColumns()`
   - `parseItem()`
   - `showXMLValid()`
   - `showXMLError()`

3. Convert to TypeScript:
   ```typescript
   // lib/xml/parser.ts
   import { DiagramItem, ParsedData, Registry } from '@/types/diagram'
   
   export function parseXML(xmlContent: string): {
     success: boolean
     data?: ParsedData
     registry?: Registry
     error?: string
   } {
     // Implementation here
   }
   ```

4. Create unit tests:
   ```typescript
   // lib/xml/__tests__/parser.test.ts
   import { parseXML } from '../parser'
   
   describe('XML Parser', () => {
     it('should parse blank XML', () => {
       const xml = `<?xml version="1.0" encoding="UTF-8"?>
   <xml><Diagram><ObjectMap></ObjectMap><SiteMap></SiteMap></Diagram></xml>`
       
       const result = parseXML(xml)
       expect(result.success).toBe(true)
       expect(result.data?.objectMap).toEqual([])
       expect(result.data?.siteMap).toEqual([])
     })
     
     // Add more tests...
   })
   ```

**Acceptance Criteria**:
- [ ] Parser extracts without errors
- [ ] All test cases pass
- [ ] Can parse blank XML template
- [ ] Can parse complex XML with nesting
- [ ] Handles malformed XML gracefully
- [ ] Registry correctly maps all IDs

**Testing**:
```bash
npm run test
```

---

### Task 2.2: Extract XML Generator

**Assigned to**: [Developer Name]  
**Estimated time**: 2 hours  
**Branch**: `feature/xml-generator`

**Steps**:
1. Create `lib/xml/generator.ts`
2. Extract these functions:
   - `updateXMLFromData()`
   - `itemToXML()`

3. Convert to TypeScript:
   ```typescript
   export function generateXML(parsedData: ParsedData): string {
     // Implementation
   }
   
   function itemToXML(item: DiagramItem, indent: number): string {
     // Implementation
   }
   ```

4. Create tests for round-trip parsing:
   ```typescript
   it('should generate valid XML from parsed data', () => {
     const xml = parseXML(originalXML)
     const generated = generateXML(xml.data!)
     const reparsed = parseXML(generated)
     
     expect(reparsed.success).toBe(true)
     expect(reparsed.data).toEqual(xml.data)
   })
   ```

**Acceptance Criteria**:
- [ ] Generator creates valid XML
- [ ] Round-trip tests pass (parse → generate → parse)
- [ ] Handles instances correctly (no title attribute)
- [ ] Preserves linkTo attributes
- [ ] Proper XML formatting with indentation

---

### Task 2.3: Extract Diagram Renderer

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/diagram-renderer`

**Steps**:
1. Create `lib/diagram/renderer.ts`
2. Extract rendering functions:
   - `renderDiagram()`
   - `renderItem()`
   - `getMaxNesting()`

3. Convert to DOM-manipulation functions:
   ```typescript
   export function renderDiagram(
     canvasElement: HTMLElement,
     parsedData: ParsedData,
     activeTab: 'ObjectMap' | 'SiteMap',
     selectedItem: string | null,
     registry: Registry,
     options: {
       showDiff?: boolean
       linkingMode?: boolean
       linkingSource?: string | null
     }
   ): void {
     // Implementation
   }
   ```

**Acceptance Criteria**:
- [ ] Renders columns correctly
- [ ] Renders items with proper nesting
- [ ] Applies correct CSS classes
- [ ] Shows instance indicators
- [ ] Visual diff indicators work

---

### Task 2.4: Extract Arrow Routing

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/arrow-routing`

**Steps**:
1. Create `lib/diagram/arrows.ts`
2. Extract arrow functions:
   - `drawAllArrows()`
   - `drawArrow()`
   - `getVerticalLaneX()`
   - `getLeftLaneX()`
   - `getMaxColumnHeight()`

3. Keep complex routing logic intact—this is battle-tested!

**Acceptance Criteria**:
- [ ] All 6 arrow routing scenarios work
- [ ] Arrows update when diagram changes
- [ ] Selected arrows highlight correctly
- [ ] Diff-colored arrows work (green/red)

---

### Task 2.5: Extract Diff Detection

**Assigned to**: [Developer Name]  
**Estimated time**: 3 hours  
**Branch**: `feature/diff-detection`

**Steps**:
1. Create `lib/diff/detector.ts`
2. Extract diff functions:
   - `detectChanges()`
   - `getItemDiffStatus()`
   - `collectMovedItems()`

3. Create `lib/diff/formatter.ts`:
   - `buildPathString()`
   - `formatPath()`

**Acceptance Criteria**:
- [ ] Detects added items
- [ ] Detects removed items
- [ ] Detects modified items (title, linkTo)
- [ ] Detects moved items
- [ ] Groups related changes
- [ ] Formats paths correctly

---

## Phase 3: Build Next.js UI

**Duration**: 4-6 days  
**Goal**: Create Next.js pages and components that use the extracted modules

### Task 3.1: Create Authentication Pages

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/auth-pages`

**Steps**:
1. Create `app/login/page.tsx`:
   ```typescript
   import { LoginForm } from '@/components/auth/LoginForm'
   
   export default function LoginPage() {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <LoginForm />
       </div>
     )
   }
   ```

2. Create `components/auth/LoginForm.tsx`:
   - Email input
   - Password input
   - "Sign In" button
   - Link to signup page
   - Error display
   - Use Supabase auth: `supabase.auth.signInWithPassword()`

3. Create `app/signup/page.tsx` and `components/auth/SignupForm.tsx`:
   - Email, password, confirm password, full name
   - Use Supabase auth: `supabase.auth.signUp()`

4. Create auth middleware:
   ```typescript
   // middleware.ts
   import { createServerClient } from '@/lib/supabase/server'
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'
   
   export async function middleware(request: NextRequest) {
     const supabase = await createServerClient()
     const { data: { session } } = await supabase.auth.getSession()
     
     if (!session && request.nextUrl.pathname.startsWith('/projects')) {
       return NextResponse.redirect(new URL('/login', request.url))
     }
     
     return NextResponse.next()
   }
   ```

**Acceptance Criteria**:
- [ ] Users can sign up with email/password
- [ ] Email confirmation works (check Supabase email settings)
- [ ] Users can log in
- [ ] Profile record is auto-created in database
- [ ] Auth session persists across page reloads
- [ ] Protected routes redirect to login

**Testing**:
1. Sign up with test email
2. Check profiles table in Supabase
3. Log in with credentials
4. Verify session in browser cookies
5. Try accessing /projects without login (should redirect)

---

### Task 3.2: Create Anonymous Editor Page

**Assigned to**: [Developer Name]  
**Estimated time**: 6 hours  
**Branch**: `feature/anonymous-editor`

**Steps**:
1. Create `app/editor/page.tsx`:
   - Check if user is authenticated
   - If not, show "Sign up to save" banner
   - Render diagram using extracted modules

2. Create `components/editor/DiagramCanvas.tsx`:
   ```typescript
   'use client'
   import { useEffect, useRef, useState } from 'react'
   import { parseXML } from '@/lib/xml/parser'
   import { renderDiagram } from '@/lib/diagram/renderer'
   import { drawAllArrows } from '@/lib/diagram/arrows'
   
   export function DiagramCanvas({ initialXML }: { initialXML: string }) {
     const canvasRef = useRef<HTMLDivElement>(null)
     const [xmlContent, setXmlContent] = useState(initialXML)
     const [parsedData, setParsedData] = useState(null)
     
     useEffect(() => {
       const result = parseXML(xmlContent)
       if (result.success) {
         setParsedData(result.data)
       }
     }, [xmlContent])
     
     useEffect(() => {
       if (canvasRef.current && parsedData) {
         renderDiagram(canvasRef.current, parsedData, 'SiteMap', null, {})
         drawAllArrows(canvasRef.current)
       }
     }, [parsedData])
     
     return <div ref={canvasRef} className="diagram-builder" />
   }
   ```

3. Copy all HTML structure but use React components:
   - Header with tabs
   - Instances panel
   - Diagram canvas
   - Editor panel (XML editor, Diff, Thread, AI)
   - Title editor
   - Action buttons

4. Wire up all existing interactions:
   - Tab switching
   - Item selection
   - Title editing
   - Insert buttons
   - Keyboard navigation
   - Linking mode

**Acceptance Criteria**:
- [ ] Page loads with blank XML template
- [ ] All tabs work (ObjectMap, SiteMap)
- [ ] Can insert L1I and NL1I items
- [ ] Can select items
- [ ] Can edit titles
- [ ] Keyboard navigation works
- [ ] Linking mode works
- [ ] Arrows render correctly
- [ ] XML editor shows changes
- [ ] UI looks identical to HTML prototype

**Testing**:
Go through entire workflow from HTML prototype:
1. Add Object with Info children
2. Add Page with Function
3. Create instance from ObjectMap
4. Link Page to another Page
5. Move items with keyboard
6. Delete items
7. Check XML matches expected structure

---

### Task 3.3: Add "Save Project" Functionality

**Assigned to**: [Developer Name]  
**Estimated time**: 3 hours  
**Branch**: `feature/save-project`

**Steps**:
1. Add save button to header (only shows when authenticated)
2. Create save dialog:
   ```typescript
   // components/projects/SaveDialog.tsx
   - Project name input
   - Description textarea (optional)
   - "Save" button
   ```

3. Implement save logic:
   ```typescript
   // lib/supabase/projects.ts
   export async function saveProject(
     supabase: SupabaseClient,
     name: string,
     xml: string,
     description?: string
   ) {
     const { data, error } = await supabase
       .from('projects')
       .insert({
         name,
         xml,
         description,
         owner_id: (await supabase.auth.getUser()).data.user?.id
       })
       .select()
       .single()
     
     return { data, error }
   }
   ```

4. Show success message and redirect to projects list

**Acceptance Criteria**:
- [ ] Save button appears only when logged in
- [ ] Save dialog opens with inputs
- [ ] Project saves to database
- [ ] Success message shows
- [ ] Can load project after saving

---

### Task 3.4: Create Projects Dashboard

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/projects-dashboard`

**Steps**:
1. Create `app/projects/page.tsx`:
   - Fetch user's projects from Supabase
   - Display in grid/list view
   - "Create New Project" button

2. Create `components/projects/ProjectCard.tsx`:
   ```typescript
   interface Props {
     project: Project
   }
   
   export function ProjectCard({ project }: Props) {
     return (
       <div className="project-card">
         <h3>{project.name}</h3>
         <p>{project.description}</p>
         <p>Last edited: {formatDate(project.updated_at)}</p>
         <div className="actions">
           <button>Open</button>
           <button>Rename</button>
           <button>Delete</button>
         </div>
       </div>
     )
   }
   ```

3. Implement actions:
   - Open: Navigate to `/editor?project={id}`
   - Rename: Show inline edit
   - Delete: Confirm dialog → delete from database

**Acceptance Criteria**:
- [ ] Projects list loads from database
- [ ] Shows all user's projects
- [ ] Can create new project
- [ ] Can open project in editor
- [ ] Can rename project
- [ ] Can delete project (with confirmation)
- [ ] Empty state shows when no projects

---

### Task 3.5: Connect Editor to Projects

**Assigned to**: [Developer Name]  
**Estimated time**: 3 hours  
**Branch**: `feature/editor-project-loading`

**Steps**:
1. Update `app/editor/page.tsx`:
   ```typescript
   export default async function EditorPage({
     searchParams
   }: {
     searchParams: { project?: string }
   }) {
     const supabase = await createServerClient()
     let initialXML = defaultXML
     let projectId = null
     
     if (searchParams.project) {
       const { data } = await supabase
         .from('projects')
         .select('*')
         .eq('id', searchParams.project)
         .single()
       
       if (data) {
         initialXML = data.xml
         projectId = data.id
       }
     }
     
     return <EditorClient initialXML={initialXML} projectId={projectId} />
   }
   ```

2. Update save logic to:
   - If `projectId` exists → UPDATE existing project
   - If no `projectId` → INSERT new project

3. Add auto-save timer (optional):
   - Save every 30 seconds if changes detected
   - Show "Saving..." indicator

**Acceptance Criteria**:
- [ ] Can load project from URL parameter
- [ ] Loaded XML appears in editor
- [ ] Changes save back to database
- [ ] Auto-save works (if implemented)
- [ ] "Last saved" timestamp updates

---

## Phase 4: Versions & Sharing

**Duration**: 4-6 days  
**Goal**: Implement unlimited versions and project sharing

### Task 4.1: Version Management UI

**Assigned to**: [Developer Name]  
**Estimated time**: 5 hours  
**Branch**: `feature/version-management`

**Steps**:
1. Update version dropdown in editor:
   - Instead of "Version 1 / Version 2", show all versions
   - "Create New Version" button

2. Create `components/editor/VersionSelector.tsx`:
   ```typescript
   - Dropdown with all versions
   - Version number + name + date
   - Load selected version
   ```

3. Create `components/editor/CreateVersionDialog.tsx`:
   - Version name input
   - Description textarea
   - "Create" button

4. Implement version operations:
   ```typescript
   // lib/supabase/versions.ts
   export async function createVersion(
     supabase: SupabaseClient,
     projectId: string,
     name: string,
     xml: string,
     description?: string
   ) {
     // Get next version number
     const { data: nextNum } = await supabase
       .rpc('get_next_version_number', { p_project_id: projectId })
     
     // Insert version
     const { data, error } = await supabase
       .from('versions')
       .insert({
         project_id: projectId,
         name,
         xml,
         description,
         version_number: nextNum,
         created_by: (await supabase.auth.getUser()).data.user?.id
       })
       .select()
       .single()
     
     return { data, error }
   }
   
   export async function loadVersion(
     supabase: SupabaseClient,
     versionId: string
   ) {
     return await supabase
       .from('versions')
       .select('*')
       .eq('id', versionId)
       .single()
   }
   ```

**Acceptance Criteria**:
- [ ] Version dropdown shows all versions
- [ ] Can create new version with name
- [ ] Version number auto-increments
- [ ] Can switch between versions
- [ ] Loading version updates editor XML
- [ ] Creating version saves current state

---

### Task 4.2: Multi-Version Diff Comparison

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/multi-version-diff`

**Steps**:
1. Update Diff List UI:
   - Replace hardcoded "Version 1" / "Version 2"
   - Show dropdowns with all versions
   - "Compare" button

2. Update diff detection to work with any two versions:
   ```typescript
   export function compareVersions(
     version1XML: string,
     version2XML: string
   ): Change[] {
     const v1Data = parseXML(version1XML)
     const v2Data = parseXML(version2XML)
     return detectChanges(v1Data, v2Data)
   }
   ```

3. Update visual indicators:
   - Only show diff when two different versions selected
   - Clear indicators when viewing single version

**Acceptance Criteria**:
- [ ] Can select any two versions to compare
- [ ] Diff list shows changes between selected versions
- [ ] Visual indicators work for any comparison
- [ ] Can compare non-adjacent versions (e.g., V1 vs V5)

---

### Task 4.3: Project Sharing UI

**Assigned to**: [Developer Name]  
**Estimated time**: 5 hours  
**Branch**: `feature/project-sharing`

**Steps**:
1. Add "Share" button to project card (projects dashboard)
2. Create `components/projects/ShareDialog.tsx`:
   ```typescript
   - Search for user by email
   - Permission dropdown (View / Edit)
   - "Invite" button
   - List of current collaborators
   - Remove collaborator button
   ```

3. Implement sharing operations:
   ```typescript
   // lib/supabase/sharing.ts
   export async function inviteCollaborator(
     supabase: SupabaseClient,
     projectId: string,
     userEmail: string,
     permission: 'view' | 'edit'
   ) {
     // Find user by email
     const { data: user } = await supabase
       .from('profiles')
       .select('id')
       .eq('email', userEmail)
       .single()
     
     if (!user) throw new Error('User not found')
     
     // Create sharing record
     return await supabase
       .from('project_sharing')
       .insert({
         project_id: projectId,
         user_id: user.id,
         permission,
         invited_by: (await supabase.auth.getUser()).data.user?.id
       })
   }
   
   export async function revokeAccess(
     supabase: SupabaseClient,
     sharingId: string
   ) {
     return await supabase
       .from('project_sharing')
       .delete()
       .eq('id', sharingId)
   }
   ```

**Acceptance Criteria**:
- [ ] Can search for users by email
- [ ] Can invite user with permission level
- [ ] Invitation creates database record
- [ ] Can see list of collaborators
- [ ] Can change collaborator permission
- [ ] Can revoke access

---

### Task 4.4: Shared Projects View

**Assigned to**: [Developer Name]  
**Estimated time**: 3 hours  
**Branch**: `feature/shared-projects`

**Steps**:
1. Update projects dashboard:
   - Add "Shared with Me" tab
   - Fetch shared projects from database
   - Show owner name on shared project cards

2. Update query:
   ```typescript
   // Fetch shared projects
   const { data: sharedProjects } = await supabase
     .from('projects')
     .select(`
       *,
       owner:profiles!owner_id(full_name, email),
       sharing:project_sharing!inner(permission)
     `)
     .eq('sharing.user_id', user.id)
     .not('sharing.accepted_at', 'is', null)
   ```

3. Add "Accept/Decline" for pending invitations:
   ```typescript
   const { data: pendingInvites } = await supabase
     .from('project_sharing')
     .select(`
       *,
       project:projects(name, description),
       inviter:profiles!invited_by(full_name)
     `)
     .eq('user_id', user.id)
     .is('accepted_at', null)
   ```

**Acceptance Criteria**:
- [ ] "Shared with Me" tab shows all shared projects
- [ ] Shows owner name and permission level
- [ ] Pending invitations shown separately
- [ ] Can accept/decline invitations
- [ ] Can open shared projects in editor
- [ ] Can leave shared project

---

### Task 4.5: Edit Lock System

**Assigned to**: [Developer Name]  
**Estimated time**: 4 hours  
**Branch**: `feature/edit-lock`

**Steps**:
1. Add lock indicator to editor:
   - When opening project, check `last_edited_by` and `last_edited_at`
   - If edited by someone else in last 5 minutes → show "Currently being edited by [name]"
   - If edit permission and not locked → acquire lock

2. Update project on every change:
   ```typescript
   async function updateProject(xml: string) {
     await supabase
       .from('projects')
       .update({
         xml,
         last_edited_by: user.id,
         last_edited_at: new Date().toISOString()
       })
       .eq('id', projectId)
   }
   ```

3. Add heartbeat:
   - Every 60 seconds, update `last_edited_at`
   - Clear lock on tab close

4. Handle permissions:
   - View-only users: Disable all edit buttons
   - Show "Read-only" badge

**Acceptance Criteria**:
- [ ] Shows who is currently editing
- [ ] Prevents concurrent edits (informational)
- [ ] Heartbeat keeps lock alive
- [ ] Lock released after 5 minutes of inactivity
- [ ] View-only mode disables editing
- [ ] Clear indicators of edit vs view permission

---

## Testing Strategy

### Manual Testing Checklist

Run through this checklist before marking a phase complete:

**Authentication**:
- [ ] Sign up with new email
- [ ] Confirm email (if required)
- [ ] Log in
- [ ] Log out
- [ ] Session persists across page reload
- [ ] Protected routes redirect correctly

**Anonymous Editing**:
- [ ] Can use editor without login
- [ ] All features work (insert, edit, delete, link)
- [ ] Keyboard navigation works
- [ ] Arrows render correctly
- [ ] "Sign up to save" banner appears
- [ ] Cannot access save button

**Project Management**:
- [ ] Can create project
- [ ] Can save project
- [ ] Project appears in dashboard
- [ ] Can open project
- [ ] Can rename project
- [ ] Can delete project
- [ ] Empty state shows correctly

**Version Control**:
- [ ] Can create version
- [ ] Version number increments
- [ ] Can switch between versions
- [ ] Can compare any two versions
- [ ] Diff detection works correctly
- [ ] Visual indicators accurate

**Sharing**:
- [ ] Can invite collaborator
- [ ] Invitation appears for recipient
- [ ] Can accept invitation
- [ ] Shared project appears in "Shared with Me"
- [ ] View permission disables editing
- [ ] Edit permission allows changes
- [ ] Can revoke access
- [ ] Can leave shared project

### Automated Testing

**Unit Tests** (for each module):
```bash
npm run test
```

**E2E Tests** (with Playwright or Cypress):
```typescript
// Example test
test('complete workflow', async ({ page }) => {
  // Sign up
  await page.goto('/signup')
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Create project
  await page.goto('/projects')
  await page.click('text=Create New Project')
  await page.fill('input[name="name"]', 'Test Project')
  await page.click('text=Create')
  
  // Edit project
  await page.click('text=Open')
  await page.click('text=+ PAGE')
  await page.fill('input#titleInput', 'Homepage')
  
  // Save
  await page.click('text=Save')
  
  // Verify saved
  await page.goto('/projects')
  await expect(page.locator('text=Test Project')).toBeVisible()
})
```

---

## Deployment

### Environment Setup

1. **Supabase Production**:
   - Create production project
   - Run migrations
   - Update `.env.production`

2. **Vercel Deployment**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

3. **Environment Variables** (in Vercel dashboard):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Environment variables set
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Responsive design tested (desktop)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)

---

## Rollback Plan

If critical issues discovered after deployment:

1. **Immediate**: Revert Vercel deployment to previous version
2. **Database**: Supabase provides point-in-time recovery
3. **Users**: Notify via email/banner about temporary rollback
4. **Fix**: Address issue in development environment
5. **Re-deploy**: After thorough testing

---

## Success Metrics

After complete migration, verify:

- [ ] All HTML prototype features working in Next.js
- [ ] Users can sign up and manage account
- [ ] Projects save and load correctly
- [ ] Versions create and compare accurately
- [ ] Sharing invitations work end-to-end
- [ ] Performance acceptable (<3s page load, <500ms interactions)
- [ ] No console errors in production
- [ ] Database queries optimized (check Supabase logs)
- [ ] RLS policies prevent unauthorized access

---

**Document Maintenance**: Update task assignments and status as work progresses. Last review: January 2025.
