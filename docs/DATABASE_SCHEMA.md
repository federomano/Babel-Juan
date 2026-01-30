# Babel Database Schema

**Database**: Supabase PostgreSQL  
**Version**: 1.0  
**Last Updated**: January 2025

---

## Overview

This document defines the complete database schema for Babel's multi-user functionality. The schema supports:

- User authentication and profiles
- Multi-project management per user
- Unlimited versions per project
- Project sharing with collaborators
- Full XML storage for each version

---

## Entity Relationship Diagram

```
┌─────────────┐
│   profiles  │
│             │
│ - id (PK)   │───────┐
│ - email     │       │
│ - full_name │       │
└─────────────┘       │
                      │ 1:N
                      │
                ┌─────▼──────┐
                │  projects  │
                │            │
                │ - id (PK)  │───────┐
                │ - owner_id │       │
                │ - name     │       │
                │ - xml      │       │
                └────────────┘       │ 1:N
                      │              │
                      │ 1:N          │
                      │              │
                ┌─────▼────────┐     │
                │   versions   │     │
                │              │     │
                │ - id (PK)    │     │
                │ - project_id │     │
                │ - name       │     │
                │ - xml        │     │
                └──────────────┘     │
                                     │
                                     │
                            ┌────────▼──────────┐
                            │ project_sharing   │
                            │                   │
                            │ - id (PK)         │
                            │ - project_id (FK) │
                            │ - user_id (FK)    │
                            │ - permission      │
                            └───────────────────┘
```

---

## Tables

### 1. `profiles`

Extends Supabase Auth's `auth.users` table with additional user information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns**:
- `id`: User's UUID from `auth.users` (primary key)
- `email`: User's email address (must match auth.users)
- `full_name`: Display name (optional)
- `avatar_url`: Profile picture URL (optional, for future use)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp

**Indexes**:
```sql
CREATE INDEX idx_profiles_email ON profiles(email);
```

**Triggers**:
```sql
-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

### 2. `projects`

Stores user projects with their current working XML.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  xml TEXT NOT NULL DEFAULT '<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <Diagram>
    <ObjectMap>
    </ObjectMap>
    <SiteMap>
    </SiteMap>
  </Diagram>
</xml>',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  last_edited_by UUID REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT xml_valid_format CHECK (xml LIKE '<?xml version="1.0"%')
);
```

**Columns**:
- `id`: Project UUID (primary key)
- `owner_id`: User who created the project (foreign key to profiles)
- `name`: Project name (required, cannot be empty)
- `description`: Optional project description
- `xml`: Current working XML document (defaults to blank template)
- `is_public`: Whether project is publicly viewable (future feature)
- `last_edited_by`: User ID of last editor (tracks collaboration)
- `last_edited_at`: Timestamp of last edit
- `created_at`: Project creation timestamp
- `updated_at`: Last modification timestamp

**Indexes**:
```sql
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_last_edited_at ON projects(last_edited_at DESC NULLS LAST);
```

**Triggers**:
```sql
CREATE TRIGGER on_project_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

### 3. `versions`

Stores version history for each project.

```sql
CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  xml TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT xml_valid_format CHECK (xml LIKE '<?xml version="1.0"%'),
  CONSTRAINT version_number_positive CHECK (version_number > 0),
  CONSTRAINT unique_version_number UNIQUE (project_id, version_number)
);
```

**Columns**:
- `id`: Version UUID (primary key)
- `project_id`: Parent project (foreign key, cascades on delete)
- `name`: Version name (e.g., "Initial Design", "Sprint 3 Release")
- `description`: Optional version notes
- `xml`: Complete XML snapshot at this version
- `version_number`: Sequential version number (1, 2, 3, ...)
- `created_by`: User who created this version
- `created_at`: Version creation timestamp (immutable)

**Indexes**:
```sql
CREATE INDEX idx_versions_project_id ON versions(project_id);
CREATE INDEX idx_versions_created_at ON versions(created_at DESC);
CREATE INDEX idx_versions_project_version ON versions(project_id, version_number);
```

**Notes**:
- Versions are **immutable** once created (no UPDATE operations)
- Version numbers are auto-incremented per project
- Deleting a project cascades to delete all its versions

---

### 4. `project_sharing`

Manages project access for collaborators.

```sql
CREATE TABLE project_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  CONSTRAINT permission_valid CHECK (permission IN ('view', 'edit')),
  CONSTRAINT unique_user_project UNIQUE (project_id, user_id),
  CONSTRAINT not_owner CHECK (user_id != (SELECT owner_id FROM projects WHERE id = project_id))
);
```

**Columns**:
- `id`: Sharing record UUID (primary key)
- `project_id`: Shared project (foreign key, cascades on delete)
- `user_id`: User being granted access (foreign key)
- `permission`: Access level ('view' or 'edit')
- `invited_by`: User who sent the invitation
- `invited_at`: Invitation timestamp
- `accepted_at`: When user accepted invitation (NULL = pending)

**Indexes**:
```sql
CREATE INDEX idx_sharing_project_id ON project_sharing(project_id);
CREATE INDEX idx_sharing_user_id ON project_sharing(user_id);
CREATE INDEX idx_sharing_pending ON project_sharing(accepted_at) WHERE accepted_at IS NULL;
```

**Constraints**:
- Cannot share with project owner (owner has implicit full access)
- One sharing record per user per project (enforced by UNIQUE constraint)
- Permission must be 'view' or 'edit' (enum-like constraint)

---

## Row Level Security (RLS) Policies

All tables have RLS enabled to ensure users can only access their own data or shared data.

### Enable RLS

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sharing ENABLE ROW LEVEL SECURITY;
```

---

### Profiles Policies

```sql
-- Users can view all profiles (for sharing/collaboration)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

### Projects Policies

```sql
-- Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can view projects shared with them
CREATE POLICY "Users can view shared projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id 
      FROM project_sharing 
      WHERE user_id = auth.uid() 
        AND accepted_at IS NOT NULL
    )
  );

-- Users can insert their own projects
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users with edit permission can update shared projects
CREATE POLICY "Users can update shared projects with edit permission"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT project_id 
      FROM project_sharing 
      WHERE user_id = auth.uid() 
        AND permission = 'edit'
        AND accepted_at IS NOT NULL
    )
  )
  WITH CHECK (
    id IN (
      SELECT project_id 
      FROM project_sharing 
      WHERE user_id = auth.uid() 
        AND permission = 'edit'
        AND accepted_at IS NOT NULL
    )
  );

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
```

---

### Versions Policies

```sql
-- Users can view versions of their own projects
CREATE POLICY "Users can view own project versions"
  ON versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Users can view versions of shared projects
CREATE POLICY "Users can view shared project versions"
  ON versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_sharing 
      WHERE user_id = auth.uid() 
        AND accepted_at IS NOT NULL
    )
  );

-- Users can create versions for their own projects
CREATE POLICY "Users can create versions for own projects"
  ON versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Users with edit permission can create versions for shared projects
CREATE POLICY "Users can create versions for shared projects with edit"
  ON versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_sharing 
      WHERE user_id = auth.uid() 
        AND permission = 'edit'
        AND accepted_at IS NOT NULL
    )
  );

-- Versions cannot be updated or deleted (immutable)
-- No UPDATE or DELETE policies needed
```

---

### Project Sharing Policies

```sql
-- Project owners can view all sharing records for their projects
CREATE POLICY "Owners can view sharing for own projects"
  ON project_sharing FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Users can view sharing records where they are the shared user
CREATE POLICY "Users can view own sharing records"
  ON project_sharing FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Project owners can create sharing records
CREATE POLICY "Owners can share projects"
  ON project_sharing FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Project owners can update sharing records (change permissions)
CREATE POLICY "Owners can update sharing"
  ON project_sharing FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Users can update their own sharing record (accept invitation)
CREATE POLICY "Users can accept invitations"
  ON project_sharing FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Project owners can delete sharing records (revoke access)
CREATE POLICY "Owners can revoke sharing"
  ON project_sharing FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Users can delete their own sharing record (leave project)
CREATE POLICY "Users can leave shared projects"
  ON project_sharing FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

---

## Database Functions

### Auto-increment Version Numbers

```sql
CREATE OR REPLACE FUNCTION get_next_version_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_number
  FROM versions
  WHERE project_id = p_project_id;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;
```

**Usage**: Call before inserting a new version to get the next sequential number.

---

### Check User Project Permission

```sql
CREATE OR REPLACE FUNCTION user_can_edit_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- User is owner
    SELECT 1 FROM projects 
    WHERE id = p_project_id AND owner_id = p_user_id
  ) OR EXISTS (
    -- User has edit permission
    SELECT 1 FROM project_sharing
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND permission = 'edit'
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Check if a user can edit a project (either owner or shared with edit permission).

---

## Initial Migration

Run this SQL in your Supabase SQL Editor to set up the complete schema:

```sql
-- 1. Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- 2. Create auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  xml TEXT NOT NULL DEFAULT '<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <Diagram>
    <ObjectMap>
    </ObjectMap>
    <SiteMap>
    </SiteMap>
  </Diagram>
</xml>',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  last_edited_by UUID REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT xml_valid_format CHECK (xml LIKE '<?xml version="1.0"%')
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_last_edited_at ON projects(last_edited_at DESC NULLS LAST);

CREATE TRIGGER on_project_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Create versions table
CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  xml TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT xml_valid_format CHECK (xml LIKE '<?xml version="1.0"%'),
  CONSTRAINT version_number_positive CHECK (version_number > 0),
  CONSTRAINT unique_version_number UNIQUE (project_id, version_number)
);

CREATE INDEX idx_versions_project_id ON versions(project_id);
CREATE INDEX idx_versions_created_at ON versions(created_at DESC);
CREATE INDEX idx_versions_project_version ON versions(project_id, version_number);

-- 6. Create project_sharing table
CREATE TABLE project_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  CONSTRAINT permission_valid CHECK (permission IN ('view', 'edit')),
  CONSTRAINT unique_user_project UNIQUE (project_id, user_id)
);

CREATE INDEX idx_sharing_project_id ON project_sharing(project_id);
CREATE INDEX idx_sharing_user_id ON project_sharing(user_id);
CREATE INDEX idx_sharing_pending ON project_sharing(accepted_at) WHERE accepted_at IS NULL;

-- 7. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sharing ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (see individual sections above for full policy definitions)

-- 9. Create helper functions
CREATE OR REPLACE FUNCTION get_next_version_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_number
  FROM versions
  WHERE project_id = p_project_id;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION user_can_edit_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = p_project_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM project_sharing
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND permission = 'edit'
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Example Queries

### User Authentication

```sql
-- Get user profile after login
SELECT * FROM profiles WHERE id = auth.uid();
```

### Project Management

```sql
-- List all projects user owns
SELECT * FROM projects 
WHERE owner_id = auth.uid() 
ORDER BY updated_at DESC;

-- List all projects shared with user
SELECT p.*, ps.permission, prof.full_name AS owner_name
FROM projects p
INNER JOIN project_sharing ps ON ps.project_id = p.id
INNER JOIN profiles prof ON prof.id = p.owner_id
WHERE ps.user_id = auth.uid() 
  AND ps.accepted_at IS NOT NULL
ORDER BY ps.accepted_at DESC;

-- Create new project
INSERT INTO projects (owner_id, name, description)
VALUES (auth.uid(), 'My New Project', 'Project description')
RETURNING *;

-- Update project XML
UPDATE projects
SET xml = '<?xml version="1.0" encoding="UTF-8"?>...',
    last_edited_by = auth.uid(),
    last_edited_at = NOW()
WHERE id = 'project-uuid-here';

-- Delete project (cascades to versions and sharing)
DELETE FROM projects WHERE id = 'project-uuid-here';
```

### Version Management

```sql
-- Get all versions for a project
SELECT * FROM versions
WHERE project_id = 'project-uuid-here'
ORDER BY version_number DESC;

-- Create new version
INSERT INTO versions (project_id, name, description, xml, version_number, created_by)
VALUES (
  'project-uuid-here',
  'Sprint 3 Release',
  'Added user authentication flow',
  '<?xml version="1.0" encoding="UTF-8"?>...',
  (SELECT get_next_version_number('project-uuid-here')),
  auth.uid()
)
RETURNING *;

-- Get specific version
SELECT * FROM versions 
WHERE id = 'version-uuid-here';

-- Compare two versions (client-side logic needed for XML diff)
SELECT v1.xml AS version_1_xml, v2.xml AS version_2_xml
FROM versions v1
CROSS JOIN versions v2
WHERE v1.id = 'version-1-uuid' AND v2.id = 'version-2-uuid';
```

### Project Sharing

```sql
-- Invite user to project
INSERT INTO project_sharing (project_id, user_id, permission, invited_by)
VALUES (
  'project-uuid-here',
  'user-uuid-to-invite',
  'edit',
  auth.uid()
)
RETURNING *;

-- List pending invitations for current user
SELECT p.name AS project_name, p.description, ps.invited_at, prof.full_name AS invited_by_name
FROM project_sharing ps
INNER JOIN projects p ON p.id = ps.project_id
INNER JOIN profiles prof ON prof.id = ps.invited_by
WHERE ps.user_id = auth.uid() 
  AND ps.accepted_at IS NULL
ORDER BY ps.invited_at DESC;

-- Accept invitation
UPDATE project_sharing
SET accepted_at = NOW()
WHERE id = 'sharing-record-uuid' AND user_id = auth.uid();

-- List collaborators for a project
SELECT prof.full_name, prof.email, ps.permission, ps.accepted_at
FROM project_sharing ps
INNER JOIN profiles prof ON prof.id = ps.user_id
WHERE ps.project_id = 'project-uuid-here'
ORDER BY ps.accepted_at DESC NULLS LAST;

-- Change collaborator permission
UPDATE project_sharing
SET permission = 'view'
WHERE id = 'sharing-record-uuid';

-- Revoke access
DELETE FROM project_sharing WHERE id = 'sharing-record-uuid';

-- Leave shared project (as collaborator)
DELETE FROM project_sharing 
WHERE project_id = 'project-uuid-here' AND user_id = auth.uid();
```

---

## Performance Considerations

### Indexes

All critical query paths are indexed:
- User lookups: `profiles.email`
- Project listings: `projects.owner_id`, `projects.updated_at`
- Version history: `versions.project_id`, `versions.version_number`
- Sharing lookups: `project_sharing.project_id`, `project_sharing.user_id`

### XML Storage

Projects and versions store full XML documents (not diffs). This design prioritizes:
- **Simplicity**: Each version is self-contained, no complex reconstruction needed
- **Read Performance**: No need to apply diffs to get a version's XML
- **Data Integrity**: Each version is immutable and independent

**Trade-offs**:
- ❌ More storage space (XML is duplicated across versions)
- ✅ Faster reads (no diff computation)
- ✅ Simpler implementation (no diff algorithm needed)

For typical projects with 10-50 versions and XML documents of 50-200KB each, total storage per project is ~5-10MB, which is acceptable for Supabase free tier.

### RLS Performance

All RLS policies use indexed columns (`auth.uid()`, foreign keys) and simple EXISTS checks. Performance should be good for:
- Up to 1000 projects per user
- Up to 100 versions per project
- Up to 50 collaborators per project

For larger scales, consider:
- Materialized views for complex permission checks
- Caching user project lists in application layer
- Pagination for project/version lists

---

## Backup and Recovery

### Automated Backups

Supabase provides automated daily backups for Pro tier. For free tier, implement manual backups:

```sql
-- Export all data for a user
SELECT 
  json_build_object(
    'profile', (SELECT row_to_json(p.*) FROM profiles p WHERE id = auth.uid()),
    'projects', (SELECT json_agg(proj.*) FROM projects proj WHERE owner_id = auth.uid()),
    'versions', (
      SELECT json_agg(v.*) 
      FROM versions v 
      WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    )
  ) AS user_data;
```

### Disaster Recovery

In case of data loss:
1. Users can export individual projects as XML files (download button in UI)
2. Re-import XML files to recreate projects
3. Version history can be partially reconstructed from project XML exports

---

## Future Enhancements

Potential schema additions for future features:

### Real-time Collaboration

```sql
CREATE TABLE edit_locks (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES profiles(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  CONSTRAINT lock_not_expired CHECK (expires_at > NOW())
);
```

### Activity Log

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'version_created', 'shared', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Comments/Annotations

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES versions(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- XML item ID
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

**Document Maintenance**: Update this schema as tables or policies change. Last review: January 2025.
