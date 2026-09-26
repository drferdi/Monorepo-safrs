// Drferdi — IcdAutocomplete: debounced ICD-10 search input with dropdown
/**
 * IcdAutocomplete
 *
 * Reusable ICD-10 code search input component.
 * Queries /api/icdx/lookup?q=... with 300ms debounce.
 * Supports keyboard navigation (↑↓ Enter Escape).
 *
 * Usage:
 *   <IcdAutocomplete
 *     value={diagnosisIcd}
 *     onSelect={(code, name) => { setCode(code); setName(name) }}
 *     placeholder="Cari kode ICD-10..."
 *   />
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface IcdResult {
  code: string
  name: string
  category?: string
}

interface IcdLookupResponse {
  ok: boolean
  results?: IcdResult[]
}

export interface IcdAutocompleteProps {
  /** Currently selected ICD-10 code */
  value: string
  /** Called when user selects a result */
  onSelect: (code: string, name: string) => void
  placeholder?: string
  disabled?: boolean
  /** Inline style overrides for the root container */
  style?: React.CSSProperties
  /** Input font size (default 11) */
  fontSize?: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300
const MAX_RESULTS = 8
const ICD_PATTERN = /^[A-Z][0-9]{2}(\.[0-9A-Z]{0,4})?$/i

// ── IcdAutocomplete ───────────────────────────────────────────────────────────

export function IcdAutocomplete({
  value,
  onSelect,
  placeholder = 'Cari nama penyakit atau kode ICD-10...',
  disabled = false,
  style,
  fontSize = 11,
}: IcdAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<IcdResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync query when value changes externally (e.g. CDSS auto-fill)
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Click-outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/icdx/lookup?q=${encodeURIComponent(q.trim())}`)
      if (!res.ok) return
      const data = (await res.json()) as IcdLookupResponse
      const items = (data.results ?? []).slice(0, MAX_RESULTS)
      setResults(items)
      setIsOpen(items.length > 0)
      setActiveIndex(-1)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void search(q), DEBOUNCE_MS)
  }

  function handleSelect(result: IcdResult) {
    setQuery(result.code)
    setIsOpen(false)
    setResults([])
    setActiveIndex(-1)
    onSelect(result.code, result.name)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const isValidCode = ICD_PATTERN.test(query.trim())

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Cari kode ICD-10"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px solid ${isValidCode ? '#22c55e' : 'var(--line-base, #2a2a2a)'}`,
            color: 'var(--text-base, #ccc)',
            padding: '4px 28px 4px 8px',
            fontSize,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
        {/* Status icon */}
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 10,
            color: isLoading
              ? 'var(--text-muted)'
              : isValidCode
                ? '#22c55e'
                : 'var(--text-muted)',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          {isLoading ? '⟳' : isValidCode ? '✓' : '⌕'}
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Hasil pencarian ICD-10"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            margin: '2px 0 0',
            padding: 0,
            listStyle: 'none',
            background: 'var(--bg-panel, #0d0d0d)',
            border: '1px solid var(--line-base, #2a2a2a)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {results.map((r, i) => (
            <li
              key={`${r.code}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => handleSelect(r)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                background:
                  i === activeIndex
                    ? 'rgba(235,89,57,0.1)'
                    : 'transparent',
                borderBottom: '1px solid var(--line-base, #2a2a2a)',
              }}
            >
              {/* Code badge */}
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: '#eb5939',
                  minWidth: 52,
                  flexShrink: 0,
                }}
              >
                {r.code}
              </span>
              {/* Name */}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-base, #ccc)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
