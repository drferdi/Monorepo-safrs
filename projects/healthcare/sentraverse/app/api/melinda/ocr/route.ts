import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Simulasi: Dalam produksi ini akan memanggil MelindaOCR
    const { imageUrl } = await req.json();
    
    console.log(`[Melinda API] Memproses KTP: ${imageUrl}`);
    
    // Mock Data untuk demo kilat
    return NextResponse.json({ 
      status: 'SUCCESS',
      message: 'KTP Berhasil Diekstraksi',
      data: {
        nik: '357101XXXXXXXXXX',
        nama: 'PASIEN MELINDA DEMO',
        alamat: 'Kediri, Jawa Timur',
        extracted_from: imageUrl
      },
      next_step: 'Lanjutkan ke pemilihan poli dan dokter.'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membaca KTP' }, { status: 500 });
  }
}
