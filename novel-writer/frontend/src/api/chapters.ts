import client from './client'
import { Chapter } from '../types'

export interface GenerationStatus {
  status: 'idle' | 'running' | 'success' | 'failed' | 'unknown'
  message: string
  chapter_id?: number
  error_message?: string
  started_at?: string
  completed_at?: string
  progress?: number
}

export interface GenerationLogItem {
  id: number
  status: string
  progress: number
  ai_provider: string
  model_name: string
  chapter_id: number | null
  error_message: string
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
}

export interface GenerationStats {
  total: number
  success: number
  failed: number
  success_rate: number
  avg_duration_seconds: number
}

export const chapterApi = {
  list: (bookId: number) => client.get<Chapter[]>(`/books/${bookId}/chapters`),
  get: (id: number) => client.get<Chapter>(`/chapters/${id}`),
  create: (bookId: number, data: Partial<Chapter>) => client.post<Chapter>(`/books/${bookId}/chapters`, data),
  update: (id: number, data: Partial<Chapter>) => client.put<Chapter>(`/chapters/${id}`, data),
  delete: (id: number) => client.delete(`/chapters/${id}`),
  generate: (bookId: number) => client.post(`/books/${bookId}/generate`),
  generateBatch: (bookId: number, count: number) => client.post(`/books/${bookId}/generate-batch?count=${count}`),
  getGenerationStatus: (bookId: number) => client.get<GenerationStatus>(`/books/${bookId}/generation-status`),
  getGenerationHistory: (bookId: number, limit = 50) => client.get<{ items: GenerationLogItem[]; stats: GenerationStats }>(`/books/${bookId}/generation-history?limit=${limit}`),
  regenerate: (chapterId: number) => client.post(`/chapters/${chapterId}/regenerate`),
  export: (bookId: number, chapterId: number) => client.post(`/books/${bookId}/export/${chapterId}`),
  exportAll: (bookId: number) => client.post(`/books/${bookId}/export-all`),
}

export function getGenerationEventsUrl(bookId: number): string {
  return `${window.location.protocol}//${window.location.host}/api/books/${bookId}/generation-events`
}