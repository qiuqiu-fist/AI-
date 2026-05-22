export interface Book {
  id: number
  title: string
  description: string
  author: string
  status: 'active' | 'paused' | 'completed'
  output_folder: string
  output_format: 'md' | 'txt' | 'docx'
  schedule_enabled: boolean
  schedule_time: string
  daily_chapters: number
  theme_config: ThemeConfig
  created_at: string
  updated_at: string
}

export interface ThemeConfig {
  genre?: string
  style?: string
  outline?: string
  characters?: Character[]
  world_setting?: string
  tone?: string
}

export interface Character {
  name: string
  role: string
  description: string
}

export interface Chapter {
  id: number
  book_id: number
  title: string
  content: string
  chapter_number: number
  status: 'draft' | 'generated' | 'exported'
  word_count: number
  ai_provider: string
  model_name: string
  prompt_used: string
  generated_date: string
  file_path: string
  created_at: string
  updated_at: string
}

export interface AIConfig {
  id: number
  provider_name: string
  display_name: string
  enabled: boolean
  is_default: boolean
  api_base_url: string
  api_key: string
  model_name: string
  max_tokens: number
  temperature: number
  top_p: number
  extra_params: Record<string, unknown>
  created_at: string
}

export interface ProviderType {
  name: string
  display_name: string
}

export interface GenerationLog {
  id: number
  book_id: number | null
  chapter_id: number | null
  ai_provider: string
  model_name: string
  status: string
  tokens_used: number
  error_message: string
  started_at: string
  completed_at: string
}

export interface Template {
  id: number
  name: string
  description: string
  content: string
  category: string
  created_at: string
  updated_at: string
}

export interface SystemStatus {
  app_name: string
  version: string
  db_size: string
  books_count: number
  chapters_count: number
  active_schedules: number
}