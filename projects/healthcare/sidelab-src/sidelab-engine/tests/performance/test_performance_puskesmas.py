# Architected and built by codieverse+.
"""Performance auto-test: 20 skenario Puskesmas × backend × model.

Cara menjalankan:
    # 1. Performance test dengan backend default (deepseek)
    python -m pytest tests/performance/ -v -m performance

    # 2. Performance test dengan backend tertentu
    $env:PERF_BACKEND="openai"; python -m pytest tests/performance/ -v -m performance

    # 3. Hanya 1 skenario (cepat smoke-test)
    $env:PERF_SCENARIO_LIMIT="1"; python -m pytest tests/performance/ -v -m performance

    # 4. Tanpa assertion (benchmark murni, tidak fail)
    $env:PERF_NO_ASSERT="1"; python -m pytest tests/performance/ -v -m performance

    # 5. Ubah threshold via env
    $env:PERF_THRESHOLD_JSON='{"max_total_seconds":30}'; python -m pytest tests/performance/ -v -m performance

    # 6. Lihat report dari hasil JSON
    python tests/performance/reporter.py

Skenario dan threshold bisa dikustomisasi via environment variable.
"""

from __future__ import annotations

import os
from typing import Any

import pytest


@pytest.mark.performance
@pytest.mark.live
@pytest.mark.usefixtures("perf_skip_if_not_ready")
class TestPerformancePuskesmas:
    """Performance regression test untuk 20 skenario Puskesmas."""

    @pytest.fixture(scope="class")
    def _bench(self, perf_benchmark, perf_provider, perf_system_prompt, perf_scenarios):
        """Fixture internal: jalankan semua skenario dan simpan hasil."""
        limit = int(os.getenv("PERF_SCENARIO_LIMIT", "0") or "0")
        scenarios = perf_scenarios[:limit] if limit > 0 else perf_scenarios

        for name, query in scenarios:
            perf_benchmark.run_scenario(perf_provider, perf_system_prompt, name, query)

        yield perf_benchmark
        # teardown: simpan JSON setelah semua test selesai
        path = perf_benchmark.save()
        print(f"\n[Performance] Hasil tersimpan: {path}")

    # Parameterized: satu test per skenario agar terlihat di pytest report
    @pytest.mark.parametrize(
        "scenario_name,scenario_query",
        [
            pytest.param(n, q, id=n)
            for n, q in [
                ("Dispepsia Sindrom", "Dok, ulu hati saya perih dan begah sudah seminggu. Rasanya penuh terus apalagi kalau habis makan, sering bersendawa dan mual. Memang belakangan ini saya sering telat makan karena sibuk kerja, dan suka ngopi pagi-pagi saat perut kosong. Tidak ada muntah darah atau BAB hitam."),
                ("DM Tipe 2 Tidak Terkontrol", "Saya akhir-akhir ini sering banget haus dan malam bisa bangun 4-5 kali buat kencing. Padahal makan saya banyak tapi berat badan rasanya makin turun, celana pada longgar. Saya ada riwayat gula darah tinggi setahun lalu tapi jarang kontrol dan jarang minum obat karena merasa sehat-sehat saja."),
                ("Tuberkulosis Paru (Suspek)", "Sudah mau sebulan ini saya batuk berdahak tidak sembuh-sembuh, kadang dahaknya ada bercak darah sedikit. Dada rasanya sesak dan kalau malam suka keringat dingin padahal tidak kepanasan. Berat badan saya juga turun drastis dan nafsu makan hilang."),
                ("Osteoarthritis Genu", "Lutut kanan saya sakit sekali kalau dipakai jalan jauh atau naik turun tangga, Dok. Umur saya 62 tahun. Nyerinya cekot-cekot dan kadang terdengar bunyi 'krek' kalau ditekuk. Kalau pagi terasa kaku, tapi siang sudah agak mendingan kalau dibuat gerak perlahan."),
                ("Asma Bronkial Eksaserbasi Akut", "Dok, saya sesak napas dari semalam, napasnya sampai bunyi 'ngik-ngik'. Dada rasanya berat sekali. Kebetulan kemarin saya habis bersih-bersih gudang yang banyak debunya. Saya memang punya riwayat asma dari kecil, tapi obat semprotnya kebetulan habis."),
                ("Dermatitis Kontak Iritan", "Tangan saya merah-merah, perih, dan gatal banget sudah 3 hari. Kulitnya sampai kering dan pecah-pecah. Ini gara-gara saya ganti sabun cuci piring merk baru dan nyucinya lumayan banyak karena ada acara keluarga. Sebelumnya tidak pernah begini."),
                ("Infeksi Saluran Kemih (ISK)", "Saya kalau kencing rasanya perih dan panas di bagian bawah. Sering banget bolak-balik ke kamar mandi tapi keluarnya cuma sedikit-sedikit, anyang-anyangan rasanya. Perut bawah juga agak nyeri dan pegal. Kencingnya agak keruh, tapi tidak ada darah."),
                ("Gout Arthritis Akut", "Jempol kaki kiri saya tiba-tiba bengkak, merah, dan nyeri minta ampun sejak bangun tidur tadi pagi. Kena selimut saja sakitnya luar biasa. Kemarin sore saya habis makan sate jeroan banyakan sama teman-teman. Dulu pernah cek asam urat katanya memang tinggi."),
                ("Otitis Media Akut (OMA) Anak", "Anak saya umur 3 tahun rewel terus dari semalam, demam tinggi, dan pegang-pegang telinga kanannya terus sambil menangis. Tiga hari yang lalu dia memang sempat pilek parah dan batuk. Telinganya belum keluar cairan atau nanah sama sekali."),
                ("Tension Type Headache (TTH)", "Kepala saya pusing banget, rasanya kayak diikat kencang dari dahi sampai ke belakang kepala. Leher dan pundak juga kaku semua. Sudah minum paracetamol agak mendingan tapi nanti sakit lagi. Mungkin karena saya lagi banyak pikiran urusan kerjaan dan kurang tidur."),
                ("Konjungtivitis Bakterial", "Mata kiri saya merah, gatal, dan ngeres kayak ada pasirnya dari kemarin. Bangun tidur tadi pagi banyak belekan warna kekuningan sampai matanya susah melek. Mata kanan sekarang juga mulai ikutan gatal. Anak saya di rumah kebetulan juga lagi sakit mata."),
                ("Skabies", "Gatalnya ampun-ampunan Dok, apalagi kalau malam hari saya sampai tidak bisa tidur. Gatalnya di sela-sela jari tangan, pergelangan tangan, sama di sekitar pusar. Ada bintik-bintik merah kecil. Teman sekamar saya di pesantren juga pada gatal-gatal begini."),
                ("Vertigo Perifer", "Dunia rasanya muter-muter kencang banget pas saya bangun tidur tadi pagi, apalagi kalau pas noleh ke kanan. Saya sampai mual dan muntah dua kali saking pusingnya. Telinga tidak berdenging, tapi saya takut mau berdiri, jalannya harus pegangan tembok terus."),
                ("Vulnus Laceratum", "Sus, tolong ini anak saya jatuh dari sepeda kena aspal. Lutut kanannya robek lumayan dalam dan darahnya mengalir terus dari tadi, sudah saya tekan pakai kain. Anaknya nangis terus kesakitan. Tadi jatuhnya di jalanan dekat rumah sekitar 15 menit yang lalu."),
                ("Anemia dalam Kehamilan", "Saya lagi hamil 6 bulan, Dok. Belakangan ini badan rasanya lemas banget, cepat capek kalau ngerjain kerjaan rumah tangga, dan sering kunang-kunang kalau habis jongkok terus berdiri. Kata suami saya kelihatannya pucat. Saya jarang minum tablet tambah darah dari bidan karena bikin mual."),
                ("Tinea Corporis", "Di punggung saya ada bercak merah bentuknya bulat, pinggirnya agak bersisik dan menebal. Gatalnya bukan main, apalagi kalau lagi berkeringat habis kerja di lapangan. Sudah saya kasih salep gatal biasa beli di warung tapi malah makin lebar bercaknya."),
                ("Faringitis Akut", "Tenggorokan saya sakit sekali buat menelan ludah atau makanan. Badan juga agak demam meriang sejak kemarin lusa. Suara jadi agak serak dan mulut rasanya pahit. Tidak ada sesak napas, cuma nyeri tenggorokan saja yang sangat mengganggu."),
                ("Suspek Morbili (Campak)", "Dok, anak saya umur 4 tahun demam tinggi sudah 4 hari, batuk pilek parah, dan matanya merah berair. Mulai tadi pagi muncul ruam merah-merah dari belakang telinga merambat ke wajah dan leher. Anaknya lemas dan tidak mau makan. Dulu belum pernah imunisasi campak."),
                ("Stomatitis Aftosa", "Mulut saya banyak sariawan di pipi bagian dalam dan lidah sudah 5 hari. Perih banget buat makan dan minum yang hangat atau pedas. Badan rasanya agak kurang fit belakangan ini karena sering begadang ngerjain tugas kuliah. Tidak ada gigi berlubang."),
                ("Pulpitis Irreversibel", "Gigi geraham bawah kiri saya nyut-nyutan parah sejak tadi malam sampai saya tidak bisa tidur dan kepala ikut pusing. Giginya memang berlubang besar sudah lama, biasanya cuma ngilu kalau minum es, tapi sekarang dibuat diam saja sakitnya nembus sampai ke telinga. Gusi belum bengkak."),
            ]
        ],
    )
    def test_scenario_latency(
        self,
        _bench,
        perf_thresholds: dict[str, Any],
        scenario_name: str,
        scenario_query: str,
    ) -> None:
        """Assert TTFT dan total latency per skenario dalam threshold."""
        no_assert = os.getenv("PERF_NO_ASSERT", "").strip().lower() in ("1", "true", "yes")

        # cari record untuk skenario ini
        record = next((r for r in _bench.results if r["scenario"] == scenario_name), None)
        if record is None:
            pytest.skip(f"Skenario '{scenario_name}' tidak dijalankan (PERF_SCENARIO_LIMIT aktif?)")

        if record["error"]:
            pytest.fail(f"Skenario '{scenario_name}' gagal: {record['error']}")

        if no_assert:
            pytest.skip("PERF_NO_ASSERT aktif — skip assertion")

        max_ttft = perf_thresholds["max_ttft_seconds"]
        max_total = perf_thresholds["max_total_seconds"]

        assert record["ttft_seconds"] <= max_ttft, (
            f"'{scenario_name}' TTFT {record['ttft_seconds']}s > threshold {max_ttft}s"
        )
        assert record["total_seconds"] <= max_total, (
            f"'{scenario_name}' total latency {record['total_seconds']}s > threshold {max_total}s"
        )

    def test_summary_latency(self, _bench, perf_thresholds: dict[str, Any]) -> None:
        """Assert rata-rata latency dan error rate di bawah threshold."""
        no_assert = os.getenv("PERF_NO_ASSERT", "").strip().lower() in ("1", "true", "yes")
        summary = _bench._summarize()

        if no_assert:
            pytest.skip("PERF_NO_ASSERT aktif — skip assertion")

        max_avg = perf_thresholds["max_avg_total_seconds"]
        max_fail = perf_thresholds["max_fail_rate"]

        assert summary.get("avg_total_seconds", 0) <= max_avg, (
            f"Rata-rata total latency {summary['avg_total_seconds']}s > threshold {max_avg}s"
        )
        assert summary.get("error_rate", 0) <= max_fail, (
            f"Error rate {summary['error_rate']} > threshold {max_fail}"
        )
