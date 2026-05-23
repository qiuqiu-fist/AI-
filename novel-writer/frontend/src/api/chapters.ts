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

export const chapterApi = {
  list: (bookId: number) => client.get<Chapter[]>(`/books/${bookId}/chapters`),
  get: (id: number) => client.get<Chapter>(`/chapters/${id}`),
  create: (bookId: number, data: Partial<Chapter>) => client.post<Chapter>(`/books/${bookId}/chapters`, data),
  update: (id: number, data: Partial<Chapter>) => client.put<Chapter>(`/chapters/${id}`, data),
  delete: (id: number) => client.delete(`/chapters/${id}`),
  generate: (bookId: number) => client.post(`/books/${bookId}/generate`),
  generateBatch: (bookId: number, count: number) => client.post(`/books/${bookId}/generate-batch?count=${count}`),
  getGenerationStatus: (bookId: number) => client.get<GenerationStatus>(`/books/${bookId}/generation-status`),
  regenerate: (chapterId: number) => client.post(`/chapters/${chapterId}/regenerate`),
  export: (bookId: number, chapterId: number) => client.post(`/books/${bookId}/export/${chapterId}`),
  exportAll: (bookId: number) => client.post(`/books/${bookId}/export-all`),
}