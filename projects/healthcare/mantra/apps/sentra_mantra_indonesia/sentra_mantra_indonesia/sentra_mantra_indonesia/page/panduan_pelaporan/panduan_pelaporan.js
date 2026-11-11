/* Panduan Pelaporan — halaman tutorial statis alur Pusat Pelaporan RSIA.
   Konten operasional, tanpa data pasien. Gaya visual senada blok Laporan Saya. */
frappe.pages["panduan-pelaporan"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Panduan Pelaporan"),
		single_column: true,
	});
	wrapper.page = page;

	const step = (n, judul, isi) => `
		<div class="pp-step">
			<div class="pp-step-num">${n}</div>
			<div class="pp-step-body">
				<div class="pp-step-title">${judul}</div>
				<div class="pp-step-text">${isi}</div>
			</div>
		</div>`;

	const flag = (label) => `<span class="pp-flag">● ${label}</span>`;

	page.main.empty().append(`
	<div class="rsia-panduan">
		<div class="rsia-bar">
			<div class="rsia-dots"><i></i><i></i><i></i></div>
			<span class="rsia-bar-title">Sentra / Panduan Pelaporan</span>
			<span class="rsia-bar-tag"><i></i>RSIA</span>
		</div>
		<div class="rsia-inner">
			<div class="rsia-head">
				<div class="rsia-name">Cara Kerja Pusat Pelaporan</div>
				<div class="rsia-sub">
					Satu tempat untuk semua laporan eksternal RSIA — siapa mengerjakan apa,
					kapan tenggatnya, dan di mana buktinya. Karyawan tidak perlu menghafal
					jadwal: penanda merah di halaman <a href="/app/pelaporan">Pelaporan</a>
					memberi tahu persis giliran Anda.
				</div>
			</div>

			<div class="pp-kicker">Arti penanda merah di kartu laporan</div>
			<div class="pp-legend">
				<div>${flag("PERLU DIISI")}<span>Giliran <b>Penyusun</b> — kumpulkan data, isi catatan, lampirkan file, lalu <i>Ajukan Validasi</i>.</span></div>
				<div>${flag("PERLU VALIDASI")}<span>Giliran <b>Validator</b> — periksa angka &amp; lampiran; catat <i>defect</i> bila ada, atau <i>Validasi</i>.</span></div>
				<div>${flag("PERLU PERSETUJUAN")}<span>Giliran <b>Penyetuju/Direktur</b> — review ringkas lalu <i>Setujui</i>.</span></div>
				<div>${flag("PERLU DIKIRIM")}<span>Giliran <b>Pengirim</b> — input ke portal resmi, catat nomor bukti, <i>Konfirmasi Diterima</i>.</span></div>
				<div>${flag("TERLAMBAT · …")}<span>Tenggat internal lewat — kartu otomatis naik ke urutan terdepan.</span></div>
			</div>

			<div class="pp-kicker">Persiapan (sekali di awal)</div>
			${step("A1", "Verifikasi register", `Cocokkan tiap kartu di <a href="/app/sentra-report-card">Register Laporan</a> dengan portal resminya (SIRS/RS Online, SIMAR, instruksi Dinkes): nama form, periode, tenggat. Bila sesuai, ubah status kartu <b>Perlu Verifikasi → Aktif</b>. Kartu yang belum diverifikasi tidak akan pernah menghasilkan tugas.`)}
			${step("A2", "Bagikan peran ke staf", `Beri tiap user peran sesuai peta RACI: <b>Pelaporan Penyusun</b> (staf unit/RM), <b>Pelaporan Validator</b> (Komite Mutu), <b>Pelaporan Penyetuju</b> (Direktur), <b>Pelaporan Pengirim</b> (pemegang akun portal). Satu orang boleh memegang beberapa peran.`)}

			<div class="pp-kicker">Ritme rutin tiap periode</div>
			${step("1", "Siklus terbuka otomatis", `Setiap awal periode, sistem otomatis membuka siklus untuk semua kartu Aktif — lengkap dengan tenggat terhitung. Tidak ada yang perlu mengingat tanggal.`)}
			${step("2", "Penyusun mengisi", `Kartu menyala ${flag("PERLU DIISI")}. Klik → isi catatan penyusunan &amp; sumber data, lampirkan worksheet/laporan, tekan <b>Ajukan Validasi</b>.`)}
			${step("3", "Validator memeriksa", `Kartu berpindah ke ${flag("PERLU VALIDASI")}. Ada masalah? Catat di tabel <b>Defect</b> lalu <b>Kembalikan</b> — penyusun melihat penanda merahnya lagi. Beres? <b>Validasi</b>.`)}
			${step("4", "Direktur menyetujui", `${flag("PERLU PERSETUJUAN")} — sistem <b>menolak</b> persetujuan selama masih ada defect yang belum diselesaikan.`)}
			${step("5", "Pengirim melapor ke portal", `${flag("PERLU DIKIRIM")} — buka portal resmi dari link di kartu register, input <b>manual seperti biasa</b> (sistem tidak pernah menyimpan password portal). Lalu kembali: catat <b>nomor referensi/receipt</b>, lampirkan bukti, <b>Konfirmasi Diterima</b>.`)}
			${step("6", "Tutup siklus", `Setelah diterima, <b>Tutup Siklus</b>. Semua bukti (lampiran, persetujuan, receipt) menempel permanen di dokumen — siap ditunjukkan ke surveyor akreditasi. Bila portal meminta koreksi: <b>Tandai Perlu Koreksi</b> → siklus kembali ke penyusun.`)}

			<div class="pp-kicker">Yang berjalan sendiri di belakang layar</div>
			<ul class="pp-list">
				<li><b>Jejak audit</b> — setiap perpindahan status tercatat permanen: siapa, kapan, dari-ke status.</li>
				<li><b>Deteksi terlambat</b> — lewat tenggat internal, penanda berubah <i>Terlambat</i> dan kartu naik ke depan.</li>
				<li><b>Laporan insiden (IKP/AMPSR)</b> — tidak menunggu jadwal; dibuat manual saat kejadian, aksesnya terbatas, lalu mengalir di alur yang sama.</li>
				<li><b>Pemulihan</b> — periode yang terlewat (mis. server mati) dibuat ulang oleh admin lewat <code>backfill_cycles</code>.</li>
			</ul>

			<div class="pp-kicker">Halaman penting</div>
			<div class="pp-links">
				<a href="/app/pelaporan"><b>Pelaporan</b><small>Kartu Laporan Saya + peta RACI divisi</small></a>
				<a href="/app/sentra-report-card"><b>Register Laporan</b><small>Daftar induk 11 keluarga laporan</small></a>
				<a href="/app/sentra-report-cycle"><b>Siklus Laporan</b><small>Semua siklus berjalan &amp; arsipnya</small></a>
			</div>
		</div>
	</div>`);

	_pp_inject_style();
};

function _pp_inject_style() {
	if (document.getElementById("pp-style")) return;
	const css = `
	.rsia-panduan {
		max-width: 860px; margin: 8px auto 40px;
		border: 1px solid var(--border-color); border-radius: 8px;
		background: var(--card-bg); color: #525252;
		font-size: 14px; line-height: 22px; overflow: hidden;
	}
	[data-theme="dark"] .rsia-panduan { color: var(--text-color); }
	.rsia-panduan .rsia-bar {
		display: flex; align-items: center; gap: 12px;
		padding: 12px 16px; border-bottom: 1px solid var(--border-color);
	}
	.rsia-panduan .rsia-dots { display: flex; gap: 6px; padding-right: 12px; border-right: 1px solid var(--border-color); }
	.rsia-panduan .rsia-dots i { width: 9px; height: 9px; border-radius: 50%; display: block; }
	.rsia-panduan .rsia-dots i:nth-child(1) { background: #FF5F57; }
	.rsia-panduan .rsia-dots i:nth-child(2) { background: #FEBC2E; }
	.rsia-panduan .rsia-dots i:nth-child(3) { background: #28C840; }
	.rsia-panduan .rsia-bar-title, .rsia-panduan .rsia-bar-tag {
		font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
		color: #171717; font-weight: 600;
	}
	[data-theme="dark"] .rsia-panduan .rsia-bar-title { color: var(--text-color); }
	.rsia-panduan .rsia-bar-tag { margin-left: auto; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-weight: 500; }
	.rsia-panduan .rsia-bar-tag i { display: block; width: 34px; height: 1px; background: var(--border-color); }
	.rsia-panduan .rsia-inner { padding: 20px 24px 26px; }
	.rsia-panduan .rsia-head { margin-bottom: 6px; padding-bottom: 14px; border-bottom: 1px solid var(--border-color); }
	.rsia-panduan .rsia-name {
		font-family: Georgia, "Times New Roman", serif;
		font-size: 26px; line-height: 33px; color: #0a0a0a;
	}
	[data-theme="dark"] .rsia-panduan .rsia-name { color: var(--text-color); }
	.rsia-panduan .rsia-sub { margin-top: 4px; color: #525252; }
	[data-theme="dark"] .rsia-panduan .rsia-sub { color: var(--text-muted); }
	.pp-kicker {
		font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
		color: var(--text-muted); margin: 22px 0 10px; padding-bottom: 6px;
		border-bottom: 1px solid var(--border-color);
	}
	.pp-flag {
		font-size: 9.5px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase;
		color: #b91c1c; white-space: nowrap;
	}
	.pp-legend { display: flex; flex-direction: column; gap: 8px; }
	.pp-legend > div {
		display: flex; align-items: baseline; gap: 12px;
		padding: 9px 12px; border: 1px solid var(--border-color); border-radius: 8px;
	}
	.pp-legend .pp-flag { flex: 0 0 150px; }
	.pp-step { display: flex; gap: 14px; margin-bottom: 10px; }
	.pp-step-num {
		flex: 0 0 34px; height: 34px; display: flex; align-items: center; justify-content: center;
		border: 1px solid var(--border-color); border-radius: 50%;
		font-size: 12px; font-weight: 600; color: #171717;
		font-variant-numeric: tabular-nums;
	}
	[data-theme="dark"] .pp-step-num { color: var(--text-color); }
	.pp-step-body { flex: 1; min-width: 0; padding-bottom: 4px; }
	.pp-step-title { font-weight: 600; color: #171717; margin-bottom: 2px; }
	[data-theme="dark"] .pp-step-title { color: var(--text-color); }
	.pp-step-text { color: #525252; }
	[data-theme="dark"] .pp-step-text { color: var(--text-muted); }
	.pp-list { margin: 0; padding-left: 18px; }
	.pp-list li { margin-bottom: 6px; }
	.pp-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
	.pp-links a {
		display: block; padding: 11px 13px;
		border: 1px solid var(--border-color); border-radius: 8px;
		color: #171717; text-decoration: none;
		transition: border-color .15s ease;
	}
	.pp-links a:hover { border-color: #171717; text-decoration: none; }
	[data-theme="dark"] .pp-links a { color: var(--text-color); }
	.pp-links b { display: block; font-size: 13px; }
	.pp-links small { display: block; margin-top: 2px; font-size: 11px; color: var(--text-muted); }
	`;
	const el = document.createElement("style");
	el.id = "pp-style";
	el.textContent = css;
	document.head.appendChild(el);
}
