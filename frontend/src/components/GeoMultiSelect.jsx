import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

export const COUNTRIES = [
  { code: 'MX', name: 'Mexico', ru: 'Мексика' },
  { code: 'AU', name: 'Australia', ru: 'Австралия' },
  { code: 'RO', name: 'Romania', ru: 'Румыния' },
  { code: 'US', name: 'United States', ru: 'США' },
  { code: 'GB', name: 'United Kingdom', ru: 'Великобритания' },
  { code: 'DE', name: 'Germany', ru: 'Германия' },
  { code: 'FR', name: 'France', ru: 'Франция' },
  { code: 'BR', name: 'Brazil', ru: 'Бразилия' },
  { code: 'IN', name: 'India', ru: 'Индия' },
  { code: 'ID', name: 'Indonesia', ru: 'Индонезия' },
  { code: 'PH', name: 'Philippines', ru: 'Филиппины' },
  { code: 'TH', name: 'Thailand', ru: 'Таиланд' },
  // можно добавить ещё
];

export default function GeoMultiSelect({ value, onChange, direction = 'down' }) {
  const [countries] = useState(COUNTRIES)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Фильтрация стран по введённому тексту
  const filtered = countries
    .filter((c) => {
      const q = query.toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.ru.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.ru.localeCompare(b.ru));

  const addCountry = (code) => {
    if (!value.includes(code)) {
      onChange([...value, code])
    }
    setQuery('')
  }

  const removeCountry = (code) => {
    onChange(value.filter((c) => c !== code))
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Выбранные теги */}
      <div
        className="w-full min-h-[42px] border rounded px-2 py-1 flex flex-wrap gap-1 items-center cursor-text"
        onClick={() => setOpen(true)}
      >
        {value.map((code) => (
          <span
            key={code}
            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1"
          >
            {code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeCountry(code)
              }}
              className="text-blue-500 hover:text-blue-700 font-bold"
            >
              ×
            </button>
          </span>
        ))}

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? 'Выберите страны...' : ''}
          className="flex-1 min-w-[100px] outline-none text-sm bg-transparent py-1"
        />
      </div>

      {/* Выпадающий список */}
      {open && filtered.length > 0 && (
        <ul
          className={`absolute z-20 w-full bg-white border rounded shadow max-h-60 overflow-auto ${
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {filtered.map((c) => {
            const isSelected = value.includes(c.code)
            return (
              <li
                key={c.code}
                onClick={() => addCountry(c.code)}
                className={`px-3 py-2 cursor-pointer text-sm flex justify-between ${
                  isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
              >
                <span>
                  <span className="font-mono font-bold">{c.code}</span>{' '}
                  <span className="text-gray-700">{c.ru}</span>{' '}
                  <span className="text-gray-400 text-xs">({c.name})</span>
                </span>
                {isSelected && <span className="text-blue-500">✓</span>}
              </li>
            )
          })}
        </ul>
      )}
      {open && filtered.length === 0 && query && (
        <div
          className={`absolute z-20 w-full bg-white border rounded shadow p-3 text-sm text-gray-500 ${
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          Ничего не найдено
        </div>
      )}
    </div>
  )
}