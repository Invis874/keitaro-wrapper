import { useState } from 'react'
import { api } from '../api'
import GeoMultiSelect from './GeoMultiSelect'
import OfferAutocomplete from './OfferAutocomplete'

export default function CampaignForm({ onSuccess }) {
  const [name, setName] = useState('')
  const [geos, setGeos] = useState(['MX'])
  const [offerId, setOfferId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.createCampaign({
        name: `test_akulenko_${name}`,
        geo: geos,
        offer_id: Number(offerId),
      })
      onSuccess(result)
      setName('')
      setOfferId('')
      setGeos(['MX'])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Новая кампания</h2>

      {error && <div className="text-red-600 bg-red-50 p-2 rounded">{error}</div>}

      {/* Имя */}
      <div>
        <label className="block text-sm font-medium mb-1">Имя кампании (без префикса)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
          placeholder="campaign1"
        />
        <p className="text-xs text-gray-500 mt-1">Итоговое имя: test_akulenko_{name || '...'}</p>
      </div>

      {/* Гео */}
      <div>
        <label className="block text-sm font-medium mb-1">Гео (страны)</label>
        <GeoMultiSelect value={geos} onChange={setGeos} />
      </div>

      {/* Оффер */}
      <div>
        <label className="block text-sm font-medium mb-1">Оффер</label>
        <OfferAutocomplete onSelect={(offer) => setOfferId(offer.id)} />
        {offerId && <p className="text-xs text-gray-500 mt-1">Выбран ID: {offerId}</p>}
      </div>

      <button
        type="submit"
        disabled={loading || geos.length === 0 || !offerId}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Создание...' : 'Создать'}
      </button>
    </form>
  )
}