# Babel Project Context

**Last Updated**: January 2025  
**Status**: Migration from HTML prototype to Next.js + Supabase  
**Primary Goal**: Enable multi-user project management with authentication and version control

---

## Table of Contents

1. [What is Babel?](#what-is-babel)
2. [Current State](#current-state)
3. [Migration Goals](#migration-goals)
4. [How the Tool Works Today](#how-the-tool-works-today)
5. [Key Terminology](#key-terminology)
6. [Technical Architecture](#technical-architecture)
7. [File Structure](#file-structure)
8. [Quick Start for Developers](#quick-start-for-developers)

---

## What is Babel?

Babel is an XML-based diagram editor designed for product governance and software architecture planning. It enables teams to map complex software systems through two interconnected perspectives:

- **Object Map**: Backend structures (database schemas, business entities, taxonomies)
- **Site Map**: Frontend hierarchies (pages, information architecture, user-facing features)

The tool uses **XML as the single source of truth**, with a visual post-it note interface that remains accessible to both technical and non-technical stakeholders.

### Core Value Proposition

Unlike traditional UML tools that remain siloed in technical teams, Babel bridges the gap by:
- Using business-friendly terminology
- Providing bidirectional Object Map ↔ Site Map relationships via instances
- Generating structured XML suitable for AI-powered UI generation
- Tracking architectural changes through version comparison

---

## Current State

### What We Have

A fully functional **single-file HTML prototype** (v2.2 - improved by collaborator) that includes:

**Core Functionality**:
- ✅ XML parsing and bidirectional XML ↔ UI synchronization
- ✅ Instance system (Site Map items can reference Object Map items)
- ✅ Smart arrow routing with 6 different path algorithms
- ✅ Version control (2 versions: V1 and V2)
- ✅ Diff detection with visual change indicators
- ✅ AI chat integration (Claude API for natural language modifications)

**Advanced UX Features** (v1.1-v2.2):
- ✅ Drag & drop system with smart drop zones (top/middle/bottom)
- ✅ Multi-selection (Shift+Click) with batch operations
- ✅ Multi-paste feature (Ctrl+Shift+V) for rapid item creation
- ✅ Item control bar (move, convert, delete buttons)
- ✅ Undo system (Ctrl+Z, 50-state stack)
- ✅ Quick creation workflow (Enter key to create next item)
- ✅ Instance navigation (double-click to jump to original)
- ✅ Object reference display in SiteMap (shows parent OBJECT)
- ✅ Advanced item operations (Unnest, Duplicate, Delete)
- ✅ 9 keyboard shortcuts for efficiency

### What We Need

Transform this into a **multi-user SaaS application** with:

- 🎯 User authentication (email/password via Supabase Auth)
- 🎯 Project management (1 user → many projects)
- 🎯 Unlimited versions per project (not just 2)
- 🎯 Project sharing (owner can invite collaborators with view/edit permissions)
- 🎯 Persistent storage (all data in Supabase PostgreSQL)

### What We're NOT Doing (Yet)

- ❌ Real-time collaborative editing (like Google Docs)
- ❌ FlowMap tab (third perspective - planned for future)
- ❌ Major UI redesign (keep current look & feel)
- ❌ Mobile-first responsive design (desktop-focused for now)
- ❌ Advanced role-based permissions (just owner/collaborator for now)

---

## Migration Goals

### Phase 1: Foundation (Current Focus)

**Goal**: Preserve all existing functionality while adding user accounts and project persistence.

**Success Criteria**:
- Users can sign up, log in, and log out
- Anonymous users can use the tool without saving
- Authenticated users can create/save/load projects
- All existing features work identically to the HTML prototype

### Phase 2: Multi-Project Management

**Goal**: Enable users to work on multiple projects simultaneously.

**Success Criteria**:
- Project list dashboard shows all user's projects
- Create/rename/delete projects
- Each project maintains independent Object Maps and Site Maps
- Switch between projects seamlessly

### Phase 3: Unlimited Versions

**Goal**: Replace 2-version limit with unlimited version history per project.

**Success Criteria**:
- Create new versions with descriptive names/timestamps
- View version history as a timeline
- Compare any two versions (not just V1 vs V2)
- Restore/branch from any previous version

### Phase 4: Collaborative Sharing

**Goal**: Enable project owners to invite collaborators.

**Success Criteria**:
- Share project via email invitation
- Collaborators see shared projects in their dashboard
- Turn-taking edit model (one editor at a time)
- Clear indication of who last edited and when

---

## How the Tool Works Today

### Core Data Model

Everything revolves around **XML as the authoritative data structure**. Here's the hierarchy:

```
XML Document
└── Diagram
    ├── ObjectMap
    │   └── Column (multiple)
    │       └── Object (L1I items)
    │           └── Info/Function/Case (NL1I items, 1 level deep only)
    │
    └── SiteMap
        └── Column (multiple)
            └── Page (L1I items)
                └── Info/Function/Case (NL1I items, infinite nesting)
                    └── Info/Function/Case (can nest deeper)
                        └── ...
```

### Item Types Explained

**L1I (Level 1 Items)**: Root-level containers
- `Object` (in ObjectMap): Represents database entities, business concepts, or user mental models
- `Page` (in SiteMap): Represents UI pages or sections

**NL1I (Non-Level 1 Items)**: Nested content
- `Info`: Informational content (data fields, descriptions)
- `Function`: Interactive elements (buttons, forms, actions)
- `Case`: Conditional logic or states (error states, success messages)

**Key Difference**: 
- In **ObjectMap**: NL1I items can only be **1 level deep** (Objects contain Info/Function/Case directly, no further nesting)
- In **SiteMap**: NL1I items can **nest infinitely** (Pages can contain Info, which contains Function, which contains Case, etc.)

### Instance System

The **instance system** creates the critical bridge between backend (ObjectMap) and frontend (SiteMap):

```xml
<!-- ObjectMap: Define a User entity -->
<ObjectMap>
  <Column>
    <Object id="obj_user_001" title="User">
      <Info id="info_name_001" title="Full Name"/>
      <Info id="info_email_001" title="Email Address"/>
    </Object>
  </Column>
</ObjectMap>

<!-- SiteMap: Reuse User fields via instances -->
<SiteMap>
  <Column>
    <Page id="page_profile_001" title="User Profile">
      <!-- Instance: References ObjectMap item, inherits title -->
      <Info id="inst_name_001" instanceOf="info_name_001"/>
      <Info id="inst_email_001" instanceOf="info_email_001"/>
      
      <!-- Regular item: Has its own title -->
      <Function id="func_save_001" title="Save Changes"/>
    </Page>
  </Column>
</SiteMap>
```

**Instance Rules**:
- Instances have `instanceOf` attribute (references an ObjectMap NL1I id)
- Instances do NOT have a `title` attribute (title inherited from original)
- When original item's title changes, all instances reflect the change immediately
- If original is deleted, all instances are deleted cascadingly
- Instances can only reference NL1I items from ObjectMap (not Objects or Pages)

### XML Structure Rules

**Critical for Claude agents to understand**:

1. **Proper XML Nesting**: Must use opening/closing tags (not self-closing) for items with children
   ```xml
   <!-- CORRECT -->
   <Page id="page_001" title="Home">
     <Info id="info_001" title="Welcome"/>
   </Page>
   
   <!-- INCORRECT (will break parser) -->
   <Page id="page_001" title="Home">
     <Info id="info_001" title="Welcome"></Info>
   </Page>
   ```

2. **Globally Unique IDs**: Every item must have a unique ID across the entire document
   - Format: `prefix_randomstring` (e.g., `page_a3f2c`, `info_x9z1m`)
   - Use JavaScript: `generateUniqueId(prefix)` function

3. **Required Attributes**:
   - All items: `id` (required)
   - Non-instances: `title` (required)
   - Instances only: `instanceOf` (required), NO `title`
   - Optional: `linkTo` (comma-separated IDs for navigation/flow)

4. **LinkTo Connections**: Represents navigation or flow between items
   - Format: `linkTo="id1,id2,id3"` (comma-separated)
   - Can only link within same map (ObjectMap items link to ObjectMap items, SiteMap to SiteMap)
   - Circular references are allowed
   - Used to draw arrows between items

### UI Components

**Layout** (3-column):
1. **Instances Panel** (200px, SiteMap only): Lists all ObjectMap items for insertion as instances
2. **Diagram Builder** (flexible): Main canvas with columns and items
3. **Editor Panel** (500px): 4 subtabs - XML Editor, Diff List, Thread (mock), AI Chat

**Diagram Builder Features**:
- **Columns**: Flexible width (300px base + 30px per nesting level), 100px gaps
- **Items**: 300px fixed width, color-coded badges (PAGE=pink, OBJECT=blue, INFO=yellow, FUNCTION=green, CASE=purple)
- **Nesting**: Visual indent (30px per level) for child items
- **Selection**: 
  - Single: Green highlight, enables action buttons and title editor
  - Multi (Shift+Click): Orange border with badge showing count
- **Item Control Bar**: Shows action buttons based on selection:
  - Single selection: ↑ ↓ ⬅ ⧉ 🗑 (move up/down, unnest, duplicate, delete)
  - Multi-selection: ⬅ ⧉ 🗑 (unnest, duplicate, delete batch)
  - Type dropdown for batch type changes
- **Drag & Drop**: 
  - Three drop zones: TOP (green), MIDDLE/INSIDE (blue), BOTTOM (green)
  - Auto-converts OBJECT/PAGE to INFO when dropped inside items
  - Multi-drag supported
- **Object References**: INFO instances display "> PARENT_OBJECT" in gray tertiary text
- **Linking Mode**: Click arrow button → source becomes semi-transparent → click valid target → creates linkTo connection

**Keyboard Navigation** (requires item selection):
- `Arrow Up/Down`: Move item within same parent (reorders in XML)
- `Arrow Left`: 
  - L1I: Move to previous column
  - NL1I: Move out of parent to become sibling
- `Arrow Right`:
  - L1I: Move to next column
  - NL1I: Move into sibling above to become its child
- `Delete/Backspace`: Delete selected item(s) (supports multi-selection)
- `Escape`: Deselect or exit linking mode
- `Ctrl/Cmd + Z`: Undo last action (50-state stack)
- `Ctrl/Cmd + Shift + V`: Open multi-paste modal
- `Shift + Click`: Multi-select items (batch operations)
- `Enter` (in title field): Create next item of same type

**Drag & Drop System**:
- Click and drag items to reorder or move
- Three drop zones: TOP (25%), MIDDLE (50%), BOTTOM (25%)
- Visual feedback: green borders (reorder), blue background (nest inside)
- Automatic type conversion: OBJECT/PAGE → INFO when dropped inside
- Multi-drag supported (drag any item from multi-selection)
- Smart validation prevents invalid operations

**Arrow Routing System**:

The tool uses intelligent arrow routing with 3 main scenarios:

1. **Adjacent Column** (target is sourceColumn + 1):
   - Go right to lane between columns
   - If same height: straight line
   - If different height: route up/down in lane

2. **Multiple Columns Right** (target > sourceColumn + 1):
   - Go right to first lane
   - Route below all intervening columns
   - Come up to target from left lane

3. **Left or Same Column**:
   - Go right to first lane
   - Route below all columns (including source)
   - Approach target from left lane

All turns use 12px radius for smooth curves. Arrows show as dashed grey when unselected, solid dark grey when selected, green for added links, red for removed links.

### Version Control & Diff Detection

**Current Implementation** (2 versions):
- Version 1 and Version 2 stored as separate XML strings
- Switch between versions updates entire UI
- Changes made in one version don't affect the other

**Diff Detection** tracks:
- ✅ **Added items**: New in V2, not in V1
- ✅ **Removed items**: In V1, not in V2
- ✅ **Modified items**: Title changes, linkTo changes
- ✅ **Moved items**: Different parent or location (NL1I only)
- ✅ **Link changes**: Individual link additions/removals

**Diff Display**:
- Visual indicators: Dashed borders, background colors (green=added, red=removed, yellow=modified/moved)
- Badges: + (added), - (removed), ↵ (modified), ↔ (moved)
- Diff List: Grouped changes with full path descriptions
- Hover highlighting: Hovering diff item highlights it in diagram

**NOT Tracked**:
- L1I movements between columns (these are presentational)
- Order changes within same parent (not semantically significant)
- instanceOf changes (instances should be deleted and recreated)

### AI Chat Integration

**Current Implementation**:
- Uses Claude Sonnet 4 API directly from browser
- User stores API key in localStorage (24-hour expiry)
- System prompt provides full XML context and domain terminology
- Claude can analyze architecture and generate modified XML
- Updates wrapped in `<xml_update>` tags are parsed and applied
- Undo functionality stores previous XML state

**Natural Language Operations**:
Users can say things like:
- "Add a Login page with email and password fields"
- "Create a User object with name and email info"
- "Link the Login page to the Dashboard page"
- "Rename all references to 'customer' to 'client'"

---

## Key Terminology

### Domain Concepts

| Term | Definition |
|------|------------|
| **L1I** | Level 1 Items: Root-level items (Object in ObjectMap, Page in SiteMap) |
| **NL1I** | Non-Level 1 Items: Nested items (Info, Function, Case) |
| **Instance** | A SiteMap item that references an ObjectMap NL1I via `instanceOf` |
| **linkTo** | XML attribute defining navigation/flow connections (comma-separated IDs) |
| **Column** | Organizational grouping within ObjectMap/SiteMap (presentational, not semantic) |
| **Nesting Level** | Depth of an item (0 = L1I, 1+ = NL1I) |
| **Registry** | JavaScript object mapping all item IDs to their data structures |

### Multi-Axis Thinking

The tool operates across different levels of abstraction:

**ObjectMap Axis**:
- Tactical: Database schema implementation
- Strategic: Business taxonomies, user mental models

**SiteMap Axis**:
- Tactical: Actual sitemap with page hierarchy and inner structure
- Strategic: Business value map, requirements organized by presentation

**Future: FlowMap Axis** (not in current scope):
- Tactical: UX flow maps (sequential user steps)
- Strategic: Service blueprints (organizational value delivery)

---

## Technical Architecture

### Current (HTML Prototype)

```
┌─────────────────────────────────────────┐
│   Single HTML File (15,000+ lines)      │
├─────────────────────────────────────────┤
│  • Vanilla JavaScript                   │
│  • No build process                     │
│  • No external dependencies             │
│  • All state in window.* globals        │
│  • localStorage for API key only        │
└─────────────────────────────────────────┘
```

**Global State Variables**:
```javascript
window.activeTab          // 'ObjectMap' or 'SiteMap'
window.xmlContent         // Current XML string
window.parsedData        // { objectMap: [], siteMap: [] }
window.selectedItem      // Currently selected item ID
window.registry          // { id: itemObject } lookup map
window.isUpdatingFromUI  // Flag to prevent circular updates
window.linkingMode       // Boolean: in linking mode?
window.linkingSource     // Source item ID for linking
window.currentVersion    // 1 or 2
window.versions          // { 1: xmlString, 2: xmlString }
window.highlightedDiffItem // Hover state for diff highlighting
window.activeEditorTab   // 'xml' | 'diff' | 'thread' | 'ai-chat'
window.aiChatHistory     // Array of chat messages
window.aiApiKey          // Claude API key
```

### Target (Next.js + Supabase)

```
┌──────────────────────────────────────────────────┐
│              Next.js Application                  │
├──────────────────────────────────────────────────┤
│  • App Router (Next.js 14+)                      │
│  • React Server Components where possible        │
│  • Client Components for interactive diagram     │
│  • Supabase Auth for user management             │
│  • Supabase Database for persistence             │
│  • Supabase RLS for security                     │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│              Supabase Backend                     │
├──────────────────────────────────────────────────┤
│  • PostgreSQL database                           │
│  • Row Level Security (RLS) policies             │
│  • Authentication (email/password)               │
│  • Real-time subscriptions (optional later)      │
└──────────────────────────────────────────────────┘
```

**Key Architectural Decisions**:

1. **Preserve Vanilla JS Core**: Keep XML parsing, diagram rendering, and arrow routing as vanilla JavaScript modules (not React components yet) to minimize migration risk

2. **React Wrapper Pattern**: 
   - Next.js page components handle routing, auth, data fetching
   - Main diagram component wraps vanilla JS in `useEffect` hooks
   - State management bridges React ↔ vanilla JS

3. **Progressive Enhancement**:
   - Phase 1: Anonymous users get full functionality (no save)
   - Phase 2: "Sign up to save" CTA appears after meaningful work
   - Phase 3: Authenticated users see "Save Project" button
   - Phase 4: Project list dashboard

4. **Minimal UI Changes**:
   - Keep exact same CSS (copy from HTML prototype)
   - Same color scheme, spacing, fonts
   - Same keyboard shortcuts
   - Same visual feedback

---

## File Structure

### Planned Next.js Structure

```
babel-juan/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with auth provider
│   ├── page.tsx                 # Landing/login page
│   ├── editor/                  # Main diagram editor
│   │   └── page.tsx             # Anonymous + authenticated editor
│   ├── projects/                # Project management
│   │   ├── page.tsx             # Project list dashboard
│   │   └── [id]/                # Individual project
│   │       └── page.tsx         # Load project into editor
│   └── api/                     # API routes (if needed)
│       └── ...
│
├── components/                   # React components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── editor/
│   │   ├── DiagramCanvas.tsx    # Wraps vanilla JS diagram
│   │   ├── InstancesPanel.tsx
│   │   ├── EditorPanel.tsx
│   │   └── ActionButtons.tsx
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectCard.tsx
│   │   └── ShareDialog.tsx
│   └── ui/                      # Reusable UI components
│       └── ...
│
├── lib/                         # Core business logic (vanilla JS)
│   ├── xml/
│   │   ├── parser.ts            # XML parsing logic
│   │   ├── generator.ts         # XML generation from data
│   │   └── validator.ts         # XML validation rules
│   ├── diagram/
│   │   ├── renderer.ts          # Diagram rendering
│   │   ├── arrows.ts            # Arrow routing algorithms
│   │   └── navigation.ts        # Keyboard navigation
│   ├── diff/
│   │   ├── detector.ts          # Change detection
│   │   └── formatter.ts         # Diff display formatting
│   ├── supabase/
│   │   ├── client.ts            # Supabase client setup
│   │   ├── auth.ts              # Auth helpers
│   │   ├── projects.ts          # Project CRUD operations
│   │   ├── versions.ts          # Version CRUD operations
│   │   └── sharing.ts           # Sharing/collaboration logic
│   └── utils/
│       ├── idGenerator.ts       # Unique ID generation
│       └── constants.ts         # Global constants
│
├── types/                       # TypeScript types
│   ├── diagram.ts               # Item, Column, ParsedData types
│   ├── database.ts              # Supabase table types
│   └── index.ts                 # Barrel exports
│
├── styles/                      # CSS (copied from HTML prototype)
│   ├── globals.css
│   └── diagram.css
│
├── docs/                        # Documentation (this file and others)
│   ├── PROJECT_CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── MIGRATION_PLAN.md
│   └── CONTRIBUTING.md
│
├── public/                      # Static assets
│   └── ...
│
├── .env.local                   # Local environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Quick Start for Developers

### Prerequisites

- Node.js 18+ installed
- GitHub account with access to `federomano/Babel-Juan` repository
- Supabase account (free tier works)
- Claude API key (optional, for AI chat feature)

### Initial Setup

1. **Clone and Install**:
   ```bash
   git clone https://github.com/federomano/Babel-Juan.git
   cd Babel-Juan
   npm install
   ```

2. **Set Up Supabase**:
   - Create new project at supabase.com
   - Copy `.env.example` to `.env.local`
   - Add your Supabase URL and anon key
   - Run database migrations (see DATABASE_SCHEMA.md)

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

### Development Workflow

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**: Follow the MIGRATION_PLAN.md for task breakdown

3. **Test Locally**: Ensure existing functionality still works

4. **Commit and Push**:
   ```bash
   git add .
   git commit -m "feat: describe your changes"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**: For team review

### Testing Checklist

Before committing, verify:
- [ ] XML parsing works (paste complex XML into editor)
- [ ] Diagram renders correctly (ObjectMap and SiteMap tabs)
- [ ] Item selection/deselection works
- [ ] Keyboard navigation works (arrow keys, delete)
- [ ] Instance system works (insert instance from panel)
- [ ] Linking mode works (create linkTo connections)
- [ ] Arrow rendering works (all 6 routing scenarios)
- [ ] Version switching works (V1 ↔ V2)
- [ ] Diff detection shows changes correctly
- [ ] AI chat works (if API key configured)

### Common Issues

**Issue**: "Cannot find module '@/lib/...' "  
**Solution**: Check `tsconfig.json` has correct path aliases

**Issue**: Circular update loop (UI → XML → UI → ...)  
**Solution**: Ensure `isUpdatingFromUI` flag is properly managed

**Issue**: Arrow routing looks wrong  
**Solution**: Check that columns have `data-column-index` attribute and items have correct `nestingLevel`

**Issue**: Instance doesn't inherit title  
**Solution**: Verify `instanceOf` references a valid ObjectMap NL1I id

---

## Next Steps

1. **Read Companion Documents**:
   - `ARCHITECTURE.md` - Deep dive into technical decisions
   - `DATABASE_SCHEMA.md` - Complete Supabase schema
   - `MIGRATION_PLAN.md` - Step-by-step implementation tasks
   - `CONTRIBUTING.md` - Team collaboration guidelines

2. **Set Up Your Environment**: Follow Quick Start guide above

3. **Pick a Task**: Check MIGRATION_PLAN.md for available tasks

4. **Ask Questions**: Use GitHub Issues or team communication channel

---

**Document Maintenance**: This file should be updated whenever core concepts change. Last review: January 2025.
