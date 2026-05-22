import client from './client'
import { AIConfig, ProviderType } from '../types'

export const providerApi = {
  listTypes: () => client.get<ProviderType[]>('/providers/types'),
  list: () => client.get<AIConfig[]>('/providers'),
  create: (data: Partial<AIConfig>) => client.post<AIConfig>('/providers', data),
  update: (id: number, data: Partial<AIConfig>) => client.put<AIConfig>(`/providers/${id}`, data),
  delete: (id: number) => client.delete(`/providers/${id}`),
  test: (id: number) => client.post<{ success: boolean; message: string }>(`/providers/${id}/test`),
  setDefault: (id: number) => client.patch(`/providers/${id}/default`),
}