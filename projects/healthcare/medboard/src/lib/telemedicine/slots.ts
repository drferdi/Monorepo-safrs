// ============================================================
// PKM Dashboard — Doctor Schedule Slot Generator
// ============================================================

import { prisma } from '@/lib/prisma'
import type { DoctorScheduleSlot } from '@/types/telemedicine.types'

// Jam praktek telemedicine Puskesmas: 08:00–15:00, interval 15 menit
const SLOT_START_HOUR = 8
const SLOT_END_HOUR = 15
const SLOT_DURATION_MINUTES = 15

function generateTimeSlots(): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = []
  let hour = SLOT_START_HOUR
  let minute = 0

  while (hour < SLOT_END_HOUR) {
    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    const totalMinutes = hour * 60 + minute + SLOT_DURATION_MINUTES
    const endHour = Math.floor(totalMinutes / 60)
    const endMinute = totalMinutes % 60
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

    slots.push({ startTime, endTime })

    minute += SLOT_DURATION_MINUTES
    if (minute >= 60) {
      minute -= 60
      hour++
    }
  }

  return slots
}

export async function getDoctorSlots(
  doctorId: string,
  date: string // YYYY-MM-DD
): Promise<DoctorScheduleSlot[]> {
  // Ambil appointments yang sudah ada untuk dokter di tanggal tersebut
  const dayStart = new Date(`${date}T00:00:00+07:00`)
  const dayEnd = new Date(`${date}T23:59:59+07:00`)

  const existingAppointments = await prisma.telemedicineAppointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { id: true, scheduledAt: true, durationMinutes: true },
  })

  const bookedTimes = new Set(
    existingAppointments.map((a: { scheduledAt: Date; id: string; durationMinutes: number }) => {
      const d = new Date(a.scheduledAt)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
  )

  const timeSlots = generateTimeSlots()

  return timeSlots.map(slot => {
    const isBooked = bookedTimes.has(slot.startTime)
    const bookedAppt = isBooked
      ? existingAppointments.find(
          (a: { scheduledAt: Date; id: string; durationMinutes: number }) => {
            const d = new Date(a.scheduledAt)
            const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            return t === slot.startTime
          }
        )
      : undefined

    return {
      doctorId,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: !isBooked,
      appointmentId: bookedAppt?.id,
    }
  })
}
