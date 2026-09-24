import { describe, expect, it } from "vitest";
import type { Schedule } from "./api";
import { addDays, schedulesInDay, startOfWeek, weekDays } from "./week";

describe("week helpers", () => {
  it("startOfWeek mengembalikan Senin lokal untuk tanggal acuan", () => {
    // 2026-08-05 = Rabu → minggu dimulai 2026-08-03 (Sen)
    const mon = startOfWeek(new Date("2026-08-05T12:00:00"));
    expect(mon.getFullYear()).toBe(2026);
    expect(mon.getMonth()).toBe(7);
    expect(mon.getDate()).toBe(3);
  });

  it("weekDays menghasilkan 7 hari dari Senin", () => {
    const days = weekDays(new Date("2026-08-05T12:00:00"));
    expect(days).toHaveLength(7);
    expect(days[0]?.getDate()).toBe(3);
    expect(days[6]?.getDate()).toBe(9);
  });

  it("addDays menggeser tanggal", () => {
    const d = addDays(new Date("2026-08-05T12:00:00"), 7);
    expect(d.getDate()).toBe(12);
  });

  it("schedulesInDay memfilter jadwal by date ISO", () => {
    const rows: Schedule[] = [
      {
        schedule_id: "1",
        student_ids: [],
        tutor_id: "t",
        subject_id: "s",
        format: "privat",
        mode: "online",
        date: "2026-08-05",
        start_time: "16:00",
        end_time: "17:00",
        is_recurring: false,
        status: "active",
      },
      {
        schedule_id: "2",
        student_ids: [],
        tutor_id: "t",
        subject_id: "s",
        format: "privat",
        mode: "online",
        date: "2026-08-06",
        start_time: "16:00",
        end_time: "17:00",
        is_recurring: false,
        status: "active",
      },
    ];
    expect(
      schedulesInDay(rows, "2026-08-05").map((r) => r.schedule_id),
    ).toEqual(["1"]);
  });
});
