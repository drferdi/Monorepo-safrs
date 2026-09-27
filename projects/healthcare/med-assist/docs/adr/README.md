# ADR Index

Folder ini menyimpan keputusan arsitektur utama untuk Med Assist.

## Daftar ADR

| ADR       | Judul                                                          | Status      | Tanggal Keputusan        |
| --------- | -------------------------------------------------------------- | ----------- | ------------------------ |
| `ADR-001` | Direct RME Extraction First                                    | Implemented | 2026-03-15               |
| `ADR-002` | Minimum Visit History Threshold                                | Implemented | 2026-03-20               |
| `ADR-003` | Forward to Doctor via Crew Dashboard                           | Implemented | 2026-03-25               |
| `ADR-004` | Dashboard as Canonical Clinical Engine                         | Implemented | 2026-04-06               |
| `ADR-005` | Pluggable Diagnosis Engine; LLM-Led Reasoning Candidate (MIRA) | Proposed    | — (diusulkan 2026-09-27) |

## Aturan

- Setiap perubahan besar pada extractor, threshold klinis, atau workflow consult harus memperbarui ADR terkait.
- ADR mencatat keputusan, alasan, tradeoff, konsekuensi, alternatif yang dipertimbangkan, dan metadata keputusan.
- Format standar ADR mengikuti template dengan bagian **Metadata**, **Status**, **Context**, **Decision**, **Consequences**, dan **Alternatives Considered**.
- Review date harus diperbarui jika keputusan mengalami perubahan substansial.
