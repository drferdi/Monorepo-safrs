# Kontrak Motion — Apa yang Dimiliki CMS dan Apa yang Dimiliki Kode

Berkas ini menjaga satu batas yang paling mudah bocor: editor menyatakan **maksud**, kode
memutuskan **gerakan**.

---

## Pembagian kepemilikan

| Milik CMS | Milik kode |
| --- | --- |
| `choreographyKey` (mis. `bridgeConstruction`) | selector, tween, timeline |
| urutan scene, act, klaim unggulan | `scrub`, `ease`, durasi, stagger |
| teks naratif dan bukti | breakpoint dan varian |

CMS **tidak pernah** menyimpan selector, tween, `scrub`, atau `ease`. Kalau sebuah nilai
seperti itu masuk ke CMS, batasnya sudah bocor dan harus dikembalikan.

## Kontrak markup ↔ motion

Server component menempelkan atribut `data-motion` pada elemen; klien mencarinya. Markup adalah
kontraknya. Mengubah nama atribut tanpa mengubah scene factory memutus koreografi diam-diam —
tanpa error.

| Berkas | Peran |
| --- | --- |
| `components/journey/scene-section.tsx` | Server. Menulis `data-motion`. Membungkus dengan `SceneMotion` **hanya** bila ada `choreographyKey` |
| `components/journey/scene-motion.tsx` | Client island. `display: contents`, `gsap.matchMedia`, mengembalikan cleanup |
| `modules/motion/registry.ts` | 11 `CHOREOGRAPHY_KEYS`, `isKnownChoreographyKey`, 4 `MOTION_VARIANTS` |
| `modules/motion/scenes.ts` | Factory scene + `attachScene` dengan cabang reduced motion |
| `modules/motion/gsap.ts` | `registerGsap`, token MOTION (`scrubEase: "none"`) |

## Aturan yang tidak boleh dilanggar

1. **Dokumen lebih dulu.** Dengan JavaScript mati, Journey tetap bermakna: judul, tarikh,
   narasi, dan bukti tetap ada lewat `<details>` asli. Diuji di `e2e/smoke.spec.ts`.
2. **Reduced motion adalah kelas satu**, bukan penurunan kualitas. Komposisi akhir tampil
   langsung; tidak ada elemen yang tertinggal transparan. Janji aksesibilitas ini harus
   mengalahkan animasi scene mana pun — itu sebabnya reset-nya memakai `!important` dengan
   `biome-ignore` yang menyebutkan alasannya.
3. **Mobile adalah desain tersendiri**, bukan desktop yang dikecilkan.
4. **`choreographyKey` yang tidak dikenal adalah kegagalan validasi**, bukan fallback diam.
   `scene-contract.ts` menerima daftar key sebagai argumen agar arah dependensi tetap satu arah
   (validasi tidak mengimpor motion).
5. **Bersihkan saat unmount.** Meninggalkan halaman tidak boleh meninggalkan ScrollTrigger
   hidup; ada uji e2e khusus untuk itu.

## Status gate

Sentra-GSAP adalah standar authoring **root**, bukan dependensi capsule (G04). Gate-nya
(`sentra:gsap:qa`, tinjauan visual independen, `sentra:gsap:verify`) **belum dijalankan**
terhadap sumber ini, sehingga motion di sini tidak boleh disebut production-ready.
