/**
 * Time slot and availability utilities for booking & scheduling logic.
 * See prd.md §6 — Booking & Scheduling Logic.
 */

import type { Availability } from '@prisma/client';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/**
 * Check if two time ranges overlap (in minutes from 00:00).
 * start1/end1 and start2/end2 are both minute-of-day values.
 */
export function timesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Check if a datetime falls within a certain weekday + time window.
 * Used to validate if a booking falls within tutor's availability.
 */
export function isWithinAvailabilityWindow(
  dateTime: Date,
  availability: Availability
): boolean {
  const day = dateTime.getUTCDay(); // 0 = Sunday
  const weekdayMap: Record<number, Weekday> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };

  if (weekdayMap[day] !== availability.weekday) {
    return false;
  }

  const minutes = dateTime.getUTCHours() * 60 + dateTime.getUTCMinutes();
  return minutes >= availability.startMinute && minutes < availability.endMinute;
}

/**
 * Check if the requested booking time overlaps with any of the tutor's other bookings.
 * Returns true if there is a conflict.
 */
export function hasBookingConflict(
  scheduledAt: Date,
  durationMin: number,
  existingBookings: Array<{ scheduledAt: Date; durationMin: number }>
): boolean {
  const newStart = scheduledAt.getTime();
  const newEnd = newStart + durationMin * 60 * 1000;

  return existingBookings.some(booking => {
    const existingStart = booking.scheduledAt.getTime();
    const existingEnd = existingStart + booking.durationMin * 60 * 1000;
    return newStart < existingEnd && existingStart < newEnd;
  });
}

/**
 * Check if a student can cancel a booking (must be 2+ hours before scheduledAt).
 */
export function canCancelBooking(scheduledAt: Date): boolean {
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const timeUntilBooking = scheduledAt.getTime() - now.getTime();
  return timeUntilBooking > twoHoursMs;
}

/**
 * Check if a tutor can mark a booking as completed.
 * Booking must be in the past (scheduledAt + durationMin < now).
 */
export function canCompleteBooking(scheduledAt: Date, durationMin: number): boolean {
  const now = new Date();
  const endTime = new Date(scheduledAt.getTime() + durationMin * 60 * 1000);
  return endTime <= now;
}

/**
 * Convert minute-of-day (0-1440) to HH:MM string.
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Convert HH:MM string to minute-of-day.
 */
export function timeToMinutes(timeStr: string): number {
  const [hours = 0, mins = 0] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
}

/**
 * Get the list of booked ranges (next 30 days) for public profile display.
 */
export function getBookedRanges(
  bookings: Array<{ scheduledAt: Date; durationMin: number }>,
  from: Date = new Date(),
  to: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
) {
  return bookings
    .filter(b => b.scheduledAt >= from && b.scheduledAt < to)
    .map(b => ({
      scheduledAt: b.scheduledAt.toISOString(),
      durationMin: b.durationMin,
    }));
}
