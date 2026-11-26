import { useState, useEffect } from 'react'
import { api } from '../api'
import StreamEditor from './StreamEditor'

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.getCampaigns()
      .then(setCampaigns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (selected) {
    return (
      <StreamEditor
        campaignId={selected.id}
        campaignName={selected.name}
        onBack={() => setSelected(null)}
      />
    )
  }

  if (loading) return <div>Загрузка кампаний...</div>
  if (error) return <div className="text-red-600">Ошибка: {error}</div>

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">ID</th>
            <th className="text-left p-3">Имя</th>
            <th className="text-left p-3">Домен</th>
            <th className="text-left p-3">Группа</th>
            <th className="text-left p-3">Источник</th>
            <th className="text-left p-3"></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-t hover:bg-gray-50">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.state === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="font-mono">{c.id}</span>
                </div>
              </td>
              <td className="p-3">{c.name}</td>
              <td className="p-3">
                <div className="font-mono text-gray-700">{c.domain_id}</div>
                <div className="text-xs text-gray-400">{c.domain}</div>
              </td>
              <td className="p-3">
                <div className="font-mono text-gray-700">{c.group_id}</div>
                <div className="text-xs text-gray-400">{c.group}</div>
              </td>
              <td className="p-3">
                <div className="font-mono text-gray-700">{c.traffic_source_id || '—'}</div>
                <div className="text-xs text-gray-400">{c.group || '—'}</div>
              </td>
              <td className="p-3 text-right">
                <button
                  onClick={() => setSelected(c)}
                  className="text-blue-600 hover:underline"
                >
                  Редактировать
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}