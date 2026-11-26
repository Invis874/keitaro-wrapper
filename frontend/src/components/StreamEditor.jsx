import { useState, useEffect } from 'react'
import { api } from '../api'
import { recalculateShare } from '../utils/shareUtils'
import GeoMultiSelect from './GeoMultiSelect'
import OfferAutocomplete from './OfferAutocomplete'

export default function StreamEditor({ campaignId, campaignName, onBack }) {
  const [streams, setStreams] = useState([])
  const [originalStreams, setOriginalStreams] = useState([]) // Для Cancel
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [pushing, setPushing] = useState(false)

  // Загрузка данных
  const loadData = async (pull = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getStreams(campaignId, pull)
      
      const enriched = data.map((stream) => {
        const draftsMap = new Map((stream.local_drafts || []).map(d => [d.offer_id, d]))
        
        // Офферы из Keitaro (чистые) + сироты из local_drafts
        const offers = stream.offers.map(o => {
          const draft = draftsMap.get(o.offer_id)
          return {
            ...o, // все поля Keitaro
            share: draft?.share ?? o.share,
            pinned: draft?.pinned ?? false,
            is_orphaned: false,
            name: draft?.name ?? 'Unknown'
          }
        })
        
        // Добавляем сирот (которых нет в offers)
        const orphanOffers = (stream.local_drafts || [])
          .filter(d => d.is_orphaned && !stream.offers.some(o => o.offer_id === d.offer_id))
          .map(d => ({
            offer_id: d.offer_id,
            share: 0,
            pinned: d.pinned,
            is_orphaned: true,
            name: d.name
          }))
        
        return {
          ...stream,
          offers: [...offers, ...orphanOffers]
        }
      })
      
      setStreams(enriched)
      setOriginalStreams(JSON.parse(JSON.stringify(enriched)))
      setIsDirty(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(false) // При открытии — без принудительного Pull
  }, [campaignId])

  // Отслеживание изменений
  useEffect(() => {
    const hasChanges = JSON.stringify(streams) !== JSON.stringify(originalStreams)
    setIsDirty(hasChanges)
  }, [streams, originalStreams])

  const handleGeoChange = (streamId, newGeos) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s
        const newFilters = [
          { name: 'country', mode: 'accept', payload: newGeos }
        ]
        return { ...s, filters: newFilters }
      })
    )
  }

  // --- Обработчики ---

  const handleAddOffer = (streamId, offer) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s
        // Проверяем, нет ли уже такого оффера (включая сирот)
        if (s.offers.some((o) => o.offer_id === offer.id)) return s
        const newOffers = [
          ...s.offers,
          { offer_id: offer.id, share: 0, pinned: false, is_orphaned: false, name: offer.name },
        ]
        return { ...s, offers: recalculateShare(newOffers) }
      })
    )
  }

  const handleRemoveOffer = (streamId, offerId) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s
        // Если оффер есть в Keitaro (не сирота) — помечаем как сироту
        // Если его нет в Keitaro (уже сирота) — удаляем полностью
        const offer = s.offers.find((o) => o.offer_id === offerId)
        if (!offer) return s
        
        let newOffers
        if (offer.is_orphaned) {
          // Удаляем полностью
          newOffers = s.offers.filter((o) => o.offer_id !== offerId)
        } else {
          // Помечаем как сироту (но оставляем в списке)
          newOffers = s.offers.map((o) =>
            o.offer_id === offerId ? { ...o, is_orphaned: true, share: 0 } : o
          )
        }
        return { ...s, offers: recalculateShare(newOffers) }
      })
    )
  }

  const handleShareChange = (streamId, offerId, newShare) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s

        const currentOffer = s.offers.find((o) => o.offer_id === offerId)
        if (!currentOffer || currentOffer.is_orphaned || currentOffer.pinned) return s

        // Сумма закреплённых
        const pinnedSum = s.offers
          .filter((o) => o.pinned && !o.is_orphaned)
          .reduce((sum, o) => sum + o.share, 0)

        // Максимум, который можем отдать текущему
        const maxForCurrent = Math.max(0, 100 - pinnedSum)
        let targetShare = Math.max(0, Math.min(maxForCurrent, newShare))

        // Сумма остальных незакреплённых (кроме текущего)
        const otherUnpinned = s.offers.filter(
          (o) => !o.pinned && !o.is_orphaned && o.offer_id !== offerId
        )
        let otherSum = otherUnpinned.reduce((sum, o) => sum + o.share, 0)

        // Если с новым значением сумма превышает 100 — отнимаем у остальных
        let deficit = targetShare + pinnedSum + otherSum - 100
        const newOffers = s.offers.map((o) => {
          if (o.offer_id === offerId) return { ...o, share: targetShare }
          if (o.pinned || o.is_orphaned) return o

          // Уменьшаем других, пока есть дефицит
          if (deficit > 0) {
            const reduceBy = Math.min(o.share, deficit)
            deficit -= reduceBy
            return { ...o, share: o.share - reduceBy }
          }
          return o
        })

        return { ...s, offers: newOffers }
      })
    )
  }

  const handleTogglePin = (streamId, offerId) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s
        const newOffers = s.offers.map((o) =>
          o.offer_id === offerId ? { ...o, pinned: !o.pinned } : o
        )
        return { ...s, offers: recalculateShare(newOffers) }
      })
    )
  }

  const handleBringBack = (streamId, offerId) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s
        const newOffers = s.offers.map((o) =>
          o.offer_id === offerId ? { ...o, is_orphaned: false, share: 0 } : o
        )
        return { ...s, offers: recalculateShare(newOffers) }
      })
    )
  }

  // --- Действия ---

  const handlePush = async () => {
    setPushing(true)
    setError(null)
    try {
      // Формируем payload для бэкенда
      const payload = {
        streams: [
          // Потоки с офферами
          ...streams
            .filter((s) => s.schema === 'landings')
            .map((s) => ({
              stream_id: s.id,
              offers: s.offers.map((o) => ({
                offer_id: o.offer_id,
                share: o.share,
                pinned: o.pinned,
                is_orphaned: o.is_orphaned,
              })),
            })),
          // Редирект-потоки (только filters)
          ...streams
            .filter((s) => s.schema !== 'landings')
            .map((s) => ({
              stream_id: s.id,
              filters: s.filters, // отправляем текущие фильтры
            })),
        ],
      }
      await api.pushStreams(campaignId, payload)
      await loadData(false) // Перезагружаем актуальные данные
    } catch (err) {
      setError(err.message)
    } finally {
      setPushing(false)
    }
  }

  const handleCancel = () => {
    setStreams(JSON.parse(JSON.stringify(originalStreams)))
    setIsDirty(false)
  }

  const handlePull = async () => {
    if (isDirty) {
      if (!confirm('У вас есть несохранённые изменения. Они будут потеряны. Продолжить?')) return
    }
    await loadData(true)
  }

  // --- Рендер ---

  if (loading) return <div>Загрузка потоков...</div>
  if (error) return <div className="text-red-600">Ошибка: {error}</div>

  // Разделяем потоки на две группы
  const offerStreams = streams.filter((s) => s.schema === 'landings')
  const redirectStreams = streams.filter((s) => s.schema !== 'landings')

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Шапка */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-blue-600 hover:underline">&larr; Назад</button>
        <h2 className="text-xl font-bold">Кампания: {campaignName} (ID: {campaignId})</h2>
        <div className="ml-auto flex gap-2 items-center">
          {isDirty && (
            <span className="flex items-center gap-1 text-sm text-yellow-600">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Несохранённые изменения
            </span>
          )}
          {!isDirty && (
            <button
              onClick={handlePull}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              title="Загрузить свежие данные из Keitaro"
            >
              Pull
            </button>
          )}
          {isDirty && (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                disabled={pushing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {pushing ? 'Pushing...' : 'Push'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Скроллящийся блок с потоками офферов */}
      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
        {offerStreams.map((stream) => (
          <div key={stream.id} className="bg-white p-4 rounded-lg shadow border flex flex-col flex-1 min-h-0">
            {/* Заголовок потока */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="font-semibold">
                {stream.name} <span className="text-xs text-gray-500">(поток {stream.id}, {stream.type})</span>
              </h3>
            </div>

            {/* Скроллящаяся таблица */}
            <div className="flex-1 overflow-y-auto border rounded min-h-0 scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-2">ID</th>
                    <th className="p-2">Название</th>
                    <th className="p-2 w-24">Share</th>
                    <th className="p-2 w-24">Закрепить</th>
                    <th className="p-2 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {stream.offers.map((o) => (
                    <tr
                      key={o.offer_id}
                      className={`border-t ${o.is_orphaned ? 'opacity-50 bg-gray-50' : ''}`}
                    >
                      <td className="py-2 px-2 font-mono">{o.offer_id}</td>
                      <td className="py-2 px-2 text-gray-700">{o.name || '—'}</td>
                      <td className="py-2 px-2">
                        {o.is_orphaned ? (
                          <span className="text-gray-400">{o.share}%</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={o.share}
                            onChange={(e) => handleShareChange(stream.id, o.offer_id, Number(e.target.value))}
                            className="w-16 border rounded px-2 py-1"
                          />
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {!o.is_orphaned && (
                          <button
                            onClick={() => handleTogglePin(stream.id, o.offer_id)}
                            className={`text-lg ${o.pinned ? 'text-blue-600' : 'text-gray-300'}`}
                            title={o.pinned ? 'Открепить' : 'Закрепить'}
                          >
                            {o.pinned ? '🔒' : '🔓'}
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {o.is_orphaned ? (
                          <button
                            onClick={() => handleBringBack(stream.id, o.offer_id)}
                            className="text-green-600 hover:underline text-xs"
                          >
                            Вернуть
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRemoveOffer(stream.id, o.offer_id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Поиск прижат к низу */}
            <div className="pt-3 shrink-0">
              <OfferAutocomplete 
                onSelect={(offer) => handleAddOffer(stream.id, offer)} 
                direction="up"
                excludeIds={stream.offers.map((o) => o.offer_id)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Прижатый к низу Geo Google */}
      {redirectStreams.length > 0 && (
        <div className="mt-4 pt-4 border-t bg-white p-4 rounded-lg shadow border">
          {redirectStreams.map((stream) => {
            // Извлекаем текущие страны из фильтров
            const currentGeos = stream.filters?.find((f) => f.name === 'country')?.payload || []
            return (
              <div key={stream.id}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">
                    {stream.name} <span className="text-xs text-gray-500">(поток {stream.id}, {stream.type})</span>
                  </h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Редирект на {stream.action_payload}
                  </span>
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Гео (страны)</label>
                  <GeoMultiSelect
                    value={currentGeos}
                    onChange={(newGeos) => handleGeoChange(stream.id, newGeos)}
                    direction="up"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}