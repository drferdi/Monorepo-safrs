# File: docs/PRIVACY.md | Repo: puskesmas-website | Updated: 2026-03-16
# Architected and built by Drferdi.

# Privacy — Puskesmas Balowerti Website

## Tidak Ada Data yang Dikumpulkan

Website ini adalah static SPA publik. Tidak ada:
- Login atau session
- Database atau penyimpanan
- Analytics atau tracking
- Cookie (kecuali yang dibuat browser sendiri)

## Form Reservasi

Data yang diisi di form reservasi (nama, nomor HP, keluhan) **tidak dikirim ke server**.
Semua data diformat menjadi pesan WhatsApp dan dibuka di aplikasi WhatsApp pengguna.
Data tersimpan hanya di percakapan WhatsApp antara pasien dan petugas Puskesmas.

## Google Reviews

Script `sync:reviews` memanggil Google Places API dan menyimpan hasilnya sebagai
static JSON di `public/data/google-reviews.json`. Tidak ada API call dari browser.

## Crew Portal Link

Link ke crew portal divalidasi untuk mencegah open redirect —
hanya URL dengan protokol `http:` atau `https:` yang dirender.

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
