import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import BookList from './pages/BookList'
import BookDetail from './pages/BookDetail'
import ChapterEditor from './pages/ChapterEditor'
import ProviderManage from './pages/ProviderManage'
import History from './pages/History'
import Settings from './pages/Settings'
import './index.css'

export default function App() {
  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: '#6366f1',
        colorSuccess: '#10b981',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',
        borderRadius: 8,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      },
    }}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="books" element={<BookList />} />
          <Route path="books/:bookId" element={<BookDetail />} />
          <Route path="books/:bookId/chapters/:chapterId" element={<ChapterEditor />} />
          <Route path="providers" element={<ProviderManage />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ConfigProvider>
  )
}