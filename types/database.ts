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
