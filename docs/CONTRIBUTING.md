# Contributing to Babel

Welcome! This guide will help you contribute effectively to the Babel project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Git Workflow](#git-workflow)
3. [Code Standards](#code-standards)
4. [Working with Claude Agents](#working-with-claude-agents)
5. [Communication](#communication)
6. [Pull Request Process](#pull-request-process)
7. [Common Issues](#common-issues)

---

## Getting Started

### Prerequisites

- **Node.js 18+**: `node --version`
- **Git**: `git --version`
- **GitHub account** with access to `federomano/Babel-Juan`
- **Supabase account**: Free tier works fine
- **Claude API key** (optional): For AI chat feature testing

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/federomano/Babel-Juan.git
   cd Babel-Juan
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials from https://supabase.com

4. **Run database migrations**:
   - Open Supabase SQL Editor
   - Copy/paste SQL from `docs/DATABASE_SCHEMA.md` → "Initial Migration" section
   - Execute

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

6. **Verify setup**:
   - Check browser console for errors
   - Try signing up with test email
   - Check `profiles` table in Supabase has new record

---

## Git Workflow

### Branching Strategy

```
main
  ├── dev (integration branch)
  │   ├── feature/task-name-1
  │   ├── feature/task-name-2
  │   └── bugfix/issue-name
```

**Branch naming convention**:
- `feature/` - New features (e.g., `feature/auth-pages`)
- `bugfix/` - Bug fixes (e.g., `bugfix/arrow-rendering`)
- `refactor/` - Code refactoring (e.g., `refactor/xml-parser`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)

### Daily Workflow

1. **Start your day**: Pull latest changes
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-task-name
   ```

3. **Make changes**: Follow code standards (see below)

4. **Commit frequently**: Small, atomic commits
   ```bash
   git add .
   git commit -m "feat: add user authentication form"
   ```

5. **Push to GitHub**:
   ```bash
   git push origin feature/your-task-name
   ```

6. **Create Pull Request**: See [Pull Request Process](#pull-request-process)

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format**: `type(scope): description`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no functionality change)
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `test`: Adding tests
- `chore`: Maintenance (dependencies, build config)

**Examples**:
```bash
git commit -m "feat(auth): add login form component"
git commit -m "fix(diagram): correct arrow routing for same-column links"
git commit -m "refactor(xml): extract parser into separate module"
git commit -m "docs(readme): update setup instructions"
git commit -m "test(diff): add unit tests for change detection"
```

### Syncing Your Branch

Keep your feature branch up-to-date with `dev`:

```bash
# On your feature branch
git fetch origin
git rebase origin/dev
```

If conflicts occur:
1. Resolve conflicts in your editor
2. `git add .`
3. `git rebase --continue`

**When to sync**:
- Before creating a PR
- Daily if working on long-running feature
- After major changes merged to `dev`

---

## Code Standards

### TypeScript

**Use strict typing**: Avoid `any` unless absolutely necessary
```typescript
// ❌ Bad
function processItem(item: any) { ... }

// ✅ Good
function processItem(item: DiagramItem) { ... }
```

**Define interfaces for all data structures**:
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
}
```

**Use explicit return types for public functions**:
```typescript
// ✅ Good
export function parseXML(xml: string): ParseResult {
  // ...
}
```

### File Organization

```
lib/
  ├── xml/
  │   ├── parser.ts           # XML → Data structure
  │   ├── generator.ts        # Data structure → XML
  │   └── validator.ts        # XML validation rules
  ├── diagram/
  │   ├── renderer.ts         # DOM manipulation for diagram
  │   ├── arrows.ts           # SVG arrow routing
  │   └── navigation.ts       # Keyboard navigation handlers
  └── ...
```

**One module = one responsibility**:
- Keep files under 500 lines
- Extract utilities if a file grows too large
- Clear separation of concerns

### Naming Conventions

**Variables & Functions**: `camelCase`
```typescript
const selectedItem = null
function renderDiagram() { ... }
```

**Types & Interfaces**: `PascalCase`
```typescript
interface DiagramItem { ... }
type ParseResult = { ... }
```

**Constants**: `SCREAMING_SNAKE_CASE`
```typescript
const DEFAULT_XML_TEMPLATE = '...'
const MAX_NESTING_LEVEL = 20
```

**Components** (React): `PascalCase`
```typescript
export function DiagramCanvas() { ... }
```

**CSS Classes**: `kebab-case` (matching HTML prototype)
```css
.diagram-item { ... }
.instance-indicator { ... }
```

### Code Comments

**When to comment**:
- Complex algorithms (especially arrow routing)
- Non-obvious business logic
- Workarounds for known issues
- TODO items

**When NOT to comment**:
- Obvious code (let code be self-documenting)
- Outdated comments (remove or update)

**Examples**:
```typescript
// ✅ Good - Explains WHY
// Use 12px radius for all turns to ensure smooth curves
// This was empirically determined to work best across all scenarios
const CURVE_RADIUS = 12

// ❌ Bad - Explains WHAT (code already shows this)
// Set radius to 12
const CURVE_RADIUS = 12

// ✅ Good - Non-obvious algorithm
/**
 * Routes arrow from source to target using 3 scenarios:
 * 1. Adjacent column (sourceColumn + 1): Go right, up/down in lane
 * 2. Multiple columns right: Route below all intervening columns
 * 3. Left or same column: Route below including source column
 * 
 * See docs/arrow-routing-algorithm.md for detailed explanation
 */
function drawArrow(sourceId: string, targetId: string) { ... }
```

### Error Handling

**Always handle errors gracefully**:
```typescript
// ✅ Good
try {
  const result = await supabase.from('projects').insert(data)
  if (result.error) {
    console.error('Failed to save project:', result.error)
    toast.error('Could not save project. Please try again.')
    return
  }
  toast.success('Project saved!')
} catch (error) {
  console.error('Unexpected error:', error)
  toast.error('Something went wrong.')
}
```

**Don't swallow errors silently**:
```typescript
// ❌ Bad
try {
  await saveProject()
} catch {
  // Silent failure
}

// ✅ Good
try {
  await saveProject()
} catch (error) {
  console.error('Save failed:', error)
  notifyUser('Could not save project')
}
```

---

## Working with Claude Agents

### Using Claude in GitHub Codespaces

1. **Enable Claude**: In your Codespace, press `Ctrl+I` or click "Build with Agent"
2. **Provide context**: Claude reads `docs/PROJECT_CONTEXT.md` automatically
3. **Reference specific tasks**: "Implement Task 2.1 from MIGRATION_PLAN.md"

### Best Practices with Claude

**DO**:
- ✅ Reference specific task numbers: "Complete Task 3.2 from MIGRATION_PLAN.md"
- ✅ Ask for clarification: "What's the expected behavior when X happens?"
- ✅ Request tests: "Add unit tests for this function"
- ✅ Verify output: Always review Claude's code before committing

**DON'T**:
- ❌ Assume Claude remembers past context (it doesn't)
- ❌ Accept code without testing it first
- ❌ Ask vague questions like "make it better"
- ❌ Use Claude for decisions requiring human judgment (UX choices, priorities)

### Effective Claude Prompts

**Bad prompt**:
> "Fix the diagram"

**Good prompt**:
> "The arrow routing is broken when linking from column 0 to column 2 in ObjectMap. Looking at lib/diagram/arrows.ts, the issue seems to be in the getVerticalLaneX function. Can you debug and fix this while preserving all existing test cases?"

**Bad prompt**:
> "Add database stuff"

**Good prompt**:
> "Implement Task 3.3 from MIGRATION_PLAN.md: Add save project functionality. This requires creating a save button in the editor header, implementing the saveProject function in lib/supabase/projects.ts using the schema from DATABASE_SCHEMA.md, and showing a success toast on save."

### When to Use Claude vs. Manual Coding

**Use Claude for**:
- Boilerplate code (type definitions, CRUD functions)
- Repetitive tasks (creating similar components)
- Converting existing code (HTML → React)
- Writing tests

**Code manually for**:
- Critical business logic (XML parsing algorithm)
- Complex state management
- Performance-critical code (arrow rendering)
- Final integration and debugging

---

## Communication

### Team Channels

- **GitHub Issues**: Bug reports, feature requests
- **Pull Request Comments**: Code-specific discussions
- **Project Board**: Task assignments and status tracking
- **[Your communication channel]**: Quick questions, blockers, daily sync

### Asking for Help

**Good question format**:
```
**Problem**: Arrow doesn't render when linking from ObjectMap item to itself
**What I tried**: 
  1. Checked that linkTo attribute is set correctly
  2. Verified item is in registry
  3. Stepped through drawArrow function
**Code location**: lib/diagram/arrows.ts line 234
**Error message**: [paste error or "no error, just wrong behavior"]
**Screenshot**: [if applicable]
```

### Reporting Bugs

Use GitHub Issues with this template:
```markdown
**Bug Description**
[Clear description of the issue]

**Steps to Reproduce**
1. Go to editor page
2. Click + PAGE button
3. Click arrow button on new page
4. Select same page as target

**Expected Behavior**
Arrow should draw from right side back to left side

**Actual Behavior**
No arrow appears

**Environment**
- Browser: Chrome 120
- OS: macOS Sonoma
- Branch: feature/arrow-routing

**Screenshots**
[If applicable]

**Console Errors**
[If any]
```

### Daily Standup (Async)

Post daily update in team channel:
```
**Yesterday**: 
  - ✅ Completed Task 2.1 (XML Parser extraction)
  - ✅ Added unit tests for parser
  
**Today**:
  - 🔨 Starting Task 2.2 (XML Generator)
  - 📝 Will update types/diagram.ts as needed
  
**Blockers**:
  - ⚠️ Need clarification on how to handle malformed XML (fail fast or try to recover?)
```

---

## Pull Request Process

### Before Creating PR

**Checklist**:
- [ ] Code follows style guide
- [ ] All tests pass: `npm run test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Manual testing completed (see task acceptance criteria)
- [ ] Updated relevant documentation
- [ ] Synced with latest `dev` branch

### Creating PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-task-name
   ```

2. **Open PR on GitHub**: 
   - Base: `dev` ← Compare: `your-branch`
   - Use PR template (create `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Task Reference
Implements Task X.X from MIGRATION_PLAN.md

## Changes Made
- Added authentication pages (login/signup)
- Implemented Supabase auth integration
- Created auth middleware for protected routes

## Testing Done
- [x] Users can sign up with email/password
- [x] Email confirmation works
- [x] Users can log in
- [x] Session persists across page reload
- [x] Protected routes redirect to login

## Screenshots
[If applicable]

## Notes
- Using Supabase Auth Helpers for Next.js 14
- Added error handling for common auth failures
- Need to configure email templates in production Supabase

## Breaking Changes
None
```

3. **Request review**: Assign at least one team member

### PR Review Guidelines

**As Reviewer**:
- ✅ Check code follows standards
- ✅ Verify acceptance criteria met
- ✅ Test functionality locally (pull branch)
- ✅ Look for edge cases not covered
- ✅ Suggest improvements (politely!)
- ✅ Approve when satisfied OR request changes

**Providing Feedback**:
```markdown
<!-- Good feedback -->
**Suggestion**: Consider extracting this validation logic into a separate function for reusability:
```typescript
// Current
if (!email || !email.includes('@')) { ... }

// Suggested
function validateEmail(email: string): boolean {
  return !!email && email.includes('@')
}
```

**Question**: What happens if the Supabase request fails due to network error? Should we show a retry button?

**Nitpick**: Variable name `x` is unclear - consider `parsedItem` instead
```

**As PR Author**:
- Respond to all comments
- Make requested changes OR explain why not
- Re-request review after changes
- Be open to feedback (it makes the code better!)

### Merging

**When to merge**:
- ✅ At least one approval
- ✅ All conversations resolved
- ✅ CI checks pass (if set up)
- ✅ No merge conflicts

**How to merge**:
1. Use "Squash and merge" for cleaner history
2. Edit commit message to follow convention
3. Delete branch after merge

---

## Common Issues

### Issue: "Cannot find module '@/lib/...'"

**Cause**: TypeScript path alias not configured

**Fix**: Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

### Issue: Circular update loop (UI → XML → UI → ...)

**Cause**: `isUpdatingFromUI` flag not properly managed

**Fix**: Ensure flag is set before UI-triggered XML updates:
```typescript
function updateXMLFromUI() {
  window.isUpdatingFromUI = true
  const newXML = generateXML(parsedData)
  setXmlContent(newXML)
  // Flag will be cleared on next XML input handler
}
```

---

### Issue: Arrow routing looks wrong after adding items

**Cause**: Arrow drawing depends on item positions which need time to render

**Fix**: Delay arrow drawing:
```typescript
useEffect(() => {
  if (parsedData) {
    renderDiagram(...)
    // Wait for DOM to update
    setTimeout(() => drawAllArrows(), 100)
  }
}, [parsedData])
```

---

### Issue: Supabase RLS blocking legitimate queries

**Cause**: Missing or incorrect RLS policy

**Fix**: 
1. Check Supabase logs for specific RLS error
2. Review policies in `docs/DATABASE_SCHEMA.md`
3. Test policy in SQL editor:
   ```sql
   -- Test as specific user
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claims.sub = 'user-uuid-here';
   
   SELECT * FROM projects WHERE owner_id = 'user-uuid-here';
   ```

---

### Issue: Instance doesn't inherit title from original

**Cause**: instanceOf references incorrect item or original item not in registry

**Fix**: Verify in browser console:
```javascript
const instance = window.registry['inst_123']
const original = window.registry[instance.instanceOf]
console.log('Original title:', original?.title)
```

If original is undefined:
- Check that instanceOf ID matches an ObjectMap NL1I
- Check that item exists before instance is rendered

---

### Issue: Changes not saving to database

**Cause**: Multiple possible reasons

**Debug steps**:
1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify user is authenticated:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user)
   ```
4. Check RLS policies allow UPDATE
5. Verify project ID is correct:
   ```typescript
   console.log('Saving to project:', projectId)
   ```

---

## Code Review Checklist

Use this when reviewing PRs:

**Functionality**:
- [ ] Code works as intended
- [ ] Acceptance criteria met
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] No console errors

**Code Quality**:
- [ ] Follows style guide
- [ ] No code duplication
- [ ] Functions are focused (one responsibility)
- [ ] Variables well-named
- [ ] Comments where needed (not excessive)

**Testing**:
- [ ] Manual testing done
- [ ] Unit tests added (if applicable)
- [ ] Tests pass

**Integration**:
- [ ] No merge conflicts
- [ ] Doesn't break existing features
- [ ] Documentation updated
- [ ] Types defined properly

**Performance**:
- [ ] No unnecessary re-renders (React)
- [ ] Database queries optimized
- [ ] No blocking operations on main thread

---

## Getting Unstuck

If you're stuck for more than 2 hours:

1. **Review documentation**: Re-read PROJECT_CONTEXT.md and related docs
2. **Check similar code**: Look for similar implementations in codebase
3. **Ask Claude**: Provide specific context about your issue
4. **Ask team**: Post in communication channel with [good question format](#asking-for-help)
5. **Take a break**: Sometimes stepping away helps
6. **Pair program**: Schedule time with teammate to work through it together

Remember: Asking for help is not a weakness—it's efficient collaboration! 🚀

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Document Maintenance**: Update as team discovers new best practices. Last review: January 2025.
