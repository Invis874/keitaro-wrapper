import { Routes, Route, Link, Navigate } from 'react-router-dom'
import CreatePage from './pages/CreatePage'
import EditPage from './pages/EditPage'

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow mb-8">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-6">
          <Link to="/create" className="font-semibold hover:text-blue-600">Создать кампанию</Link>
          <Link to="/edit" className="font-semibold hover:text-blue-600">Редактор кампаний</Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 pb-12">
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/edit" element={<EditPage />} />
        </Routes>
      </main>
    </div>
  )
}