import { NextResponse } from 'next/server';

type MelindaDoctor = {
  name: string;
  specialty: string;
  schedule: string;
};

const MELINDA_DOCTORS: readonly MelindaDoctor[] = [
  { name: 'dr. Dibya Arfianda, SpOG', specialty: 'Kebidanan & Kandungan', schedule: 'Senin, Kamis, Jumat (18.00 - 21.00 WIB)' },
  { name: 'dr. Boyong Baskoro, SpOG', specialty: 'Kebidanan & Kandungan', schedule: 'Senin (15.00 - 18.00 WIB), Sabtu (10.00 WIB)' },
  { name: 'dr. Ririen IP, SpOG', specialty: 'Kebidanan & Kandungan', schedule: 'By Appointment' },
  { name: 'dr. Lily Diah F, SpA', specialty: 'Spesialis Anak', schedule: 'Selasa - Jumat (08.00 - 11.00 WIB), Rabu (10.00 WIB)' },
  { name: 'dr. Hidayati Utami Dewi, SpA', specialty: 'Spesialis Anak', schedule: 'Rabu & Jumat (18.00 - 21.00 WIB)' },
  { name: 'dr. Maya Kusumawati', specialty: 'Dokter Umum', schedule: 'Jumat & Sabtu (15.00 - 20.00 WIB)' },
  { name: 'dr. Dedi Wahyu, MH', specialty: 'Dokter Umum', schedule: 'Senin & Selasa (15.00 - 20.00 WIB)' },
  { name: 'dr. Dewanti Kusuma Sari', specialty: 'Dokter Umum', schedule: 'Rabu & Kamis (15.00 - 20.00 WIB)' },
  { name: 'dr. Ferdi Andriska', specialty: 'IGD', schedule: '24 Jam' },
];

function buildDoctorScheduleReply(doctors: readonly MelindaDoctor[], intro: string, outro: string): string {
  const lines = doctors.map(doctor => `- ${doctor.name}: ${doctor.schedule}`);
  return `${intro}\n${lines.join('\n')}\n\n${outro}`;
}

function buildMelindaReply(message: string): string {
  const query = message.toLowerCase();

  if (query.includes('anak') || query.includes('pediatric')) {
    const pediatricDoctors = MELINDA_DOCTORS.filter(doctor => doctor.specialty.includes('Anak'));
    return buildDoctorScheduleReply(
      pediatricDoctors,
      'Halo Chief! Untuk spesialis anak di RSIA Melinda Kediri besok, kita ada:',
      'Mau Melinda bantu buatkan janji temu sekarang?',
    );
  }

  if (query.includes('kandungan') || query.includes('hamil') || query.includes('obgyn')) {
    const obgynDoctors = MELINDA_DOCTORS.filter(doctor => doctor.specialty.includes('Kandungan'));
    return buildDoctorScheduleReply(
      obgynDoctors,
      'Tentu Chief, untuk layanan Kebidanan & Kandungan, Melinda punya jadwal berikut:',
      'Ada yang bisa Melinda bantu lagi?',
    );
  }

  return 'Halo! Saya Melinda. Saya bisa bantu cek jadwal dokter (Anak, Kandungan, Umum) dan pendaftaran pasien. Mau tanya apa?';
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message?: string };
    if (!message) {
      throw new Error('Message is required.');
    }

    const answer = buildMelindaReply(message);
    
    return NextResponse.json({ 
      sender: 'Melinda',
      message: answer,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Melinda sedang istirahat sebentar...' }, { status: 500 });
  }
}
