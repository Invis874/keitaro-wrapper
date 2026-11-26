import { useState, useEffect } from 'react'
import { api } from '../api'

export default function OfferAutocomplete({ onSelect, direction = 'down', excludeIds = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.searchOffers(query)
        setResults(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const filteredResults = results.filter((offer) => !excludeIds.includes(offer.id))

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск оффера по ID или названию..."
        className="w-full border rounded px-3 py-2"
      />
      {loading && <div className="text-xs text-gray-400 mt-1">Загрузка...</div>}
      
      {filteredResults.length > 0 && (
        <ul
          className={`absolute z-20 w-full bg-white border rounded shadow max-h-60 overflow-auto ${
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {filteredResults.map((offer) => (
            <li
              key={offer.id}
              onClick={() => { onSelect(offer); setQuery(''); setResults([]); }}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
            >
              <span className="font-mono text-gray-500">{offer.id}</span> — {offer.name}
            </li>
          ))}
        </ul>
      )}
      
      {!loading && query.length >= 1 && filteredResults.length === 0 && (
        <div
          className={`absolute z-20 w-full bg-white border rounded shadow p-3 text-sm text-gray-500 ${
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          Ничего не найдено (или все офферы уже добавлены)
        </div>
      )}
    </div>
  )
}