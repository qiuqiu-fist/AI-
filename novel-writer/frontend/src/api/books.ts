import client from './client'
import { Book } from '../types'

export const bookApi = {
  list: () => client.get<Book[]>('/books'),
  get: (id: number) => client.get<Book>(`/books/${id}`),
  create: (data: Partial<Book>) => client.post<Book>('/books', data),
  update: (id: number, data: Partial<Book>) => client.put<Book>(`/books/${id}`, data),
  delete: (id: number) => client.delete(`/books/${id}`),
}