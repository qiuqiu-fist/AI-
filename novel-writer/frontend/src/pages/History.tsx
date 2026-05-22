import { useEffect, useState } from 'react'
import { Card, Table, Tag, Spin, message } from 'antd'
import { bookApi } from '../api/books'
import { chapterApi } from '../api/chapters'

interface HistoryItem {
  id: number
  book_title: string
  chapter_title: string
  chapter_number: number
  ai_provider: string
  status: string
  word_count: number
  generated_date: string
}

export default function History() {
  const [data, setData] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const booksResp = await bookApi.list()
        const books = booksResp.data
        const allChapters: HistoryItem[] = []
        for (const book of books) {
          const chaptersResp = await chapterApi.list(book.id)
          for (const ch of chaptersResp.data) {
            allChapters.push({
              id: ch.id,
              book_title: book.title,
              chapter_title: ch.title,
              chapter_number: ch.chapter_number,
              ai_provider: ch.ai_provider,
              status: ch.status,
              word_count: ch.word_count,
              generated_date: ch.generated_date,
            })
          }
        }
        setData(allChapters.sort((a, b) => b.id - a.id))
      } catch (e: unknown) {
        message.error((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const columns = [
    { title: '书名', dataIndex: 'book_title', key: 'book_title' },
    { title: '章节', dataIndex: 'chapter_title', key: 'chapter_title' },
    { title: '序号', dataIndex: 'chapter_number', key: 'chapter_number', width: 80 },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => (
        <Tag color={s === 'exported' ? 'green' : s === 'generated' ? 'blue' : 'default'}>
          {s === 'exported' ? '已导出' : s === 'generated' ? '已生成' : '草稿'}
        </Tag>
      ),
    },
    { title: '字数', dataIndex: 'word_count', key: 'word_count' },
    { title: 'AI 来源', dataIndex: 'ai_provider', key: 'ai_provider' },
    { title: '生成日期', dataIndex: 'generated_date', key: 'generated_date' },
  ]

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />

  return (
    <Card title="生成历史">
      <Table dataSource={data} columns={columns} rowKey="id" />
    </Card>
  )
}