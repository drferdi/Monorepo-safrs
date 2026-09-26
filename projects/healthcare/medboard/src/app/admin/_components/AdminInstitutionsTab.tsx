'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from './AdminInstitutionsTab.module.css'

/* ── Types ── */

interface InstitutionRecord {
  id: string
  name: string
  crewCount: number
}

/* ── Component ── */

export default function AdminInstitutionsTab() {
  const [institutions, setInstitutions] = useState<InstitutionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* Add form */
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState('')

  /* Inline edit */
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/institutions', { cache: 'no-store' })
      if (!res.ok) {
        setError('Gagal memuat data institusi.')
        return
      }
      const data = (await res.json()) as {
        ok: boolean
        institutions: InstitutionRecord[]
      }
      if (data.ok) setInstitutions(data.institutions)
    } catch {
      setError('Gagal memuat data institusi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchInstitutions()
  }, [fetchInstitutions])

  async function handleAdd() {
    if (!addName.trim()) return
    setAdding(true)
    setAddMsg('')
    try {
      const res = await fetch('/api/admin/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim() }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        setAddMsg(body.error || 'Gagal menambah.')
        return
      }
      setAddName('')
      setAddMsg('Institusi ditambahkan.')
      void fetchInstitutions()
    } catch {
      setAddMsg('Gagal menambah institusi.')
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/institutions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        alert(body.error || 'Gagal mengubah.')
        return
      }
      setEditId(null)
      void fetchInstitutions()
    } catch {
      alert('Gagal mengubah institusi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(inst: InstitutionRecord) {
    if (inst.crewCount > 0) {
      alert(`Tidak dapat menghapus — masih ada ${inst.crewCount} user terdaftar.`)
      return
    }
    if (!confirm(`Hapus institusi "${inst.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/institutions/${inst.id}`, {
        method: 'DELETE',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        alert(body.error || 'Gagal menghapus.')
        return
      }
      void fetchInstitutions()
    } catch {
      alert('Gagal menghapus institusi.')
    }
  }

  if (loading) {
    return (
      <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>
        LOADING INSTITUTIONS...
      </div>
    )
  }

  if (error) {
    return <div className={`${styles.statusMessage} ${styles.errorMessage}`}>{error}</div>
  }

  const totalCrew = institutions.reduce((sum, i) => sum + i.crewCount, 0)
  const addMessageClassName = addMsg.includes('ditambahkan')
    ? `${styles.formMessage} ${styles.formMessageSuccess}`
    : `${styles.formMessage} ${styles.formMessageError}`

  return (
    <div>
      {/* ── Summary ── */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>TOTAL INSTITUSI</p>
          <p className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>
            {institutions.length}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>TOTAL CREW</p>
          <p className={styles.summaryValue}>{totalCrew}</p>
        </div>
      </div>

      {/* ── Add Institution ── */}
      <div className={styles.formPanel}>
        <input
          type="text"
          placeholder="Nama institusi baru..."
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void handleAdd()
          }}
          className={styles.input}
        />
        <button
          onClick={() => void handleAdd()}
          disabled={adding || !addName.trim()}
          className={styles.primaryButton}
        >
          {adding ? '...' : 'TAMBAH'}
        </button>
        {addMsg && <span className={addMessageClassName}>{addMsg}</span>}
      </div>

      {/* ── Institution Table ── */}
      <div className={styles.tablePanel}>
        {institutions.length === 0 ? (
          <div className={styles.emptyState}>Belum ada institusi</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                {['Nama Institusi', 'Crew', 'Aksi'].map(h => (
                  <th key={h} className={styles.tableHeaderCell}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {institutions.map(inst => {
                const isEditing = editId === inst.id
                const crewCountClassName =
                  inst.crewCount > 0
                    ? `${styles.crewCount} ${styles.crewCountActive}`
                    : `${styles.crewCount} ${styles.crewCountMuted}`
                const deleteButtonClassName =
                  inst.crewCount > 0
                    ? `${styles.tableButton} ${styles.tableButtonDisabled}`
                    : `${styles.tableButton} ${styles.tableButtonDanger}`
                return (
                  <tr key={inst.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleSaveEdit(inst.id)
                            if (e.key === 'Escape') setEditId(null)
                          }}
                          aria-label={`Edit nama institusi ${inst.name}`}
                          placeholder="Nama institusi"
                          className={`${styles.input} ${styles.editInput}`}
                        />
                      ) : (
                        <span className={styles.institutionName}>{inst.name}</span>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={crewCountClassName}>{inst.crewCount}</span>
                      <span className={styles.crewSuffix}>user</span>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionRow}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => void handleSaveEdit(inst.id)}
                              disabled={saving}
                              className={styles.tableButton}
                            >
                              SIMPAN
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className={`${styles.tableButton} ${styles.tableButtonMuted}`}
                            >
                              BATAL
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditId(inst.id)
                                setEditName(inst.name)
                              }}
                              className={styles.tableButton}
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => void handleDelete(inst)}
                              className={deleteButtonClassName}
                              disabled={inst.crewCount > 0}
                            >
                              HAPUS
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
