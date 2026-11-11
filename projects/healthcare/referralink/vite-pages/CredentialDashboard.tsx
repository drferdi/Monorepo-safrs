import { Add, Edit, Locked, Search, TrashCan } from '@carbon/icons-react'
import { type FormEvent, useMemo, useState } from 'react'

import { useCredentialMetadata } from '../hooks/useCredentialMetadata'
import {
  CREDENTIAL_KINDS,
  normalizeCredentialMetadata,
  type CredentialKind,
} from '../services/credentialMetadata'
import { credentialRepository } from '../services/credentialRepository'
import { browserCredentialVault } from '../services/credentialVault'
import { SYNTHETIC_DATA_GUARDRAIL } from '../services/uiCopy'

const EMPTY_FORM = {
  label: '',
  provider: '',
  username: '',
  url: '',
  kind: 'other' as CredentialKind,
  notes: '',
}

export default function CredentialDashboard() {
  const { records, storageStatus, loading } = useCredentialMetadata()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<CredentialKind | 'all'>('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return records.filter((record) => {
      const matchesTerm =
        !term ||
        [record.label, record.provider, record.username, record.notes]
          .join(' ')
          .toLocaleLowerCase()
          .includes(term)
      return matchesTerm && (kind === 'all' || record.kind === kind)
    })
  }, [records, search, kind])

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const normalized = normalizeCredentialMetadata(form)
      const current = records.find((record) => record.id === editingId)
      const now = new Date().toISOString()
      await credentialRepository.put({
        ...normalized,
        id: editingId ?? 'credential-' + Date.now(),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        secretState: current?.secretState ?? 'desktop-required',
      })
      setForm(EMPTY_FORM)
      setEditingId(null)
      setError(null)
    } catch {
      setError('Metadata Credential tidak valid. Periksa kembali kolom yang diisi.')
    }
  }

  const edit = (id: string) => {
    const record = records.find((item) => item.id === id)
    if (!record) return
    setEditingId(id)
    setForm({
      label: record.label,
      provider: record.provider,
      username: record.username,
      url: record.url,
      kind: record.kind,
      notes: record.notes,
    })
    setError(null)
  }

  return (
    <main id="main-content" className="db01-operational-page">
      <header className="db01-operational-topbar">
        <span className="db01-operational-topbar__mark" aria-hidden="true">
          ◈
        </span>
        <span>Credential · Referensi aman</span>
      </header>
      <div className="db01-operational-content">
        <section className="db01-operational-hero">
          <div>
            <p className="db01-operational-eyebrow">Metadata referensi</p>
            <h1>Credential</h1>
            <p>Kelola referensi koneksi tanpa menyimpan secret di browser.</p>
          </div>
          <div className="db01-security-status">
            <Locked size={20} aria-hidden="true" />
            <div>
              <strong>Vault aman desktop diperlukan</strong>
              <span>Penyimpanan secret browser dinonaktifkan sesuai desain.</span>
            </div>
          </div>
        </section>

        <p className="db01-operational-note">
          {SYNTHETIC_DATA_GUARDRAIL} Hanya label, metadata provider, nama pengguna, tautan HTTPS,
          dan catatan yang disimpan lokal; kata sandi dan token tidak pernah disimpan.
        </p>
        {storageStatus === 'unavailable' ? (
          <p className="db01-operational-warning" role="status">
            Penyimpanan metadata persisten tidak tersedia; sesi ini tetap dapat digunakan.
          </p>
        ) : null}

        <section className="db01-operational-panel" aria-label="Credential metadata form">
          <form className="db01-credential-form" onSubmit={submit}>
            <div className="db01-operational-field">
              <label htmlFor="credential-label">Label</label>
              <input
                id="credential-label"
                value={form.label}
                onChange={(event) => updateField('label', event.target.value)}
                required
              />
            </div>
            <div className="db01-operational-field">
              <label htmlFor="credential-provider">Penyedia</label>
              <input
                id="credential-provider"
                value={form.provider}
                onChange={(event) => updateField('provider', event.target.value)}
              />
            </div>
            <div className="db01-operational-field">
              <label htmlFor="credential-username">Nama pengguna</label>
              <input
                id="credential-username"
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
              />
            </div>
            <div className="db01-operational-field">
              <label htmlFor="credential-url">HTTPS URL</label>
              <input
                id="credential-url"
                type="url"
                value={form.url}
                onChange={(event) => updateField('url', event.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="db01-operational-field">
              <label htmlFor="credential-kind">Jenis</label>
              <select
                id="credential-kind"
                value={form.kind}
                onChange={(event) => updateField('kind', event.target.value)}
              >
                {CREDENTIAL_KINDS.map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="db01-operational-field db01-operational-field--wide">
              <label htmlFor="credential-notes">Catatan</label>
              <textarea
                id="credential-notes"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={2}
              />
            </div>
            {error ? (
              <p className="db01-operational-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="db01-operational-form-actions">
              <button
                type="submit"
                className="db01-operational-button db01-operational-button--primary"
              >
                <Add size={18} aria-hidden="true" />
                {editingId ? 'Perbarui metadata' : 'Tambah metadata'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="db01-operational-button db01-operational-button--secondary"
                  onClick={() => {
                    setEditingId(null)
                    setForm(EMPTY_FORM)
                    setError(null)
                  }}
                >
                  Batalkan edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="db01-operational-records" aria-live="polite">
          <div className="db01-operational-list-header">
            <div className="db01-operational-search">
              <Search size={20} aria-hidden="true" />
              <input
                aria-label="Cari metadata Credential"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari metadata"
              />
            </div>
            <select
              aria-label="Filter jenis Credential"
              value={kind}
              onChange={(event) => setKind(event.target.value as CredentialKind | 'all')}
            >
              <option value="all">Semua jenis</option>
              {CREDENTIAL_KINDS.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="db01-operational-empty" role="status">
              Memuat metadata Credential…
            </p>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <p className="db01-operational-empty">Belum ada metadata Credential tersimpan.</p>
          ) : null}
          {filtered.map((record) => (
            <article className="db01-credential-record" key={record.id}>
              <div>
                <span className="db01-operational-record__status">{record.kind}</span>
                <h2>{record.label}</h2>
                <p>
                  {record.provider || 'Penyedia belum ditentukan'} ·{' '}
                  {record.username || 'Tanpa nama pengguna'}
                </p>
                {record.url ? (
                  <a href={record.url} target="_blank" rel="noopener noreferrer">
                    {record.url}
                  </a>
                ) : null}
                <small>
                  Secret:{' '}
                  {record.secretState === 'configured'
                    ? 'tersimpan di vault desktop'
                    : 'memerlukan vault desktop'}
                </small>
              </div>
              <div className="db01-credential-record__actions">
                <button
                  type="button"
                  className="db01-icon-button"
                  onClick={() => edit(record.id)}
                  aria-label={'Edit ' + record.label}
                >
                  <Edit size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="db01-icon-button"
                  onClick={() => void credentialRepository.delete(record.id)}
                  aria-label={'Hapus ' + record.label}
                >
                  <TrashCan size={18} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </section>
        <button
          type="button"
          className="db01-operational-button db01-operational-button--secondary"
          onClick={() => void browserCredentialVault.availability()}
          disabled
        >
          Simpan secret di vault desktop
        </button>
      </div>
    </main>
  )
}
