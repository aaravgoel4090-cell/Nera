import type { Attendance } from '../types/gameState'

export const MIN_ATTENDANCE = 0.75

export function attendanceRatio(attendance: Attendance): number {
  return attendance.total === 0 ? 1 : attendance.attended / attendance.total
}

export function isAttendanceLost(attendance: Attendance): boolean {
  return attendance.total > 0 && attendanceRatio(attendance) < MIN_ATTENDANCE
}

export function attendanceLabel(attendance: Attendance): string {
  return `${Math.round(attendanceRatio(attendance) * 100)}%`
}
