import client from './client'
import { SystemStatus } from '../types'

export const systemApi = {
  status: () => client.get<SystemStatus>('/system/status'),
}