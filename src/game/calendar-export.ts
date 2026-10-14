import type { CalendarOccurrence } from '../types/growth.ts';

const stamp = (ms: number): string => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const fold = (text: unknown): string => String(text ?? '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/[\r\n]+/g, ' ');
/**
 * One occurrence as an iCalendar file (RFC 5545), for "Add to my calendar". Nothing is sent
 * anywhere: the browser hands the text to the phone's own calendar.
 */
export function eventIcs(event: Pick<CalendarOccurrence, 'key' | 'title' | 'blurb' | 'venueLabel' | 'start' | 'end'>, link = ''): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Allworld//Events//EN', 'BEGIN:VEVENT', `UID:${fold(event.key)}@allworld`, `DTSTAMP:${stamp(event.start)}`,
    `DTSTART:${stamp(event.start)}`, `DTEND:${stamp(event.end)}`, `SUMMARY:${fold(`Allworld: ${event.title}`)}`, `LOCATION:${fold(`${event.venueLabel} (in Allworld)`)}`,
    `DESCRIPTION:${fold(`${event.blurb}${link ? ` ${link}` : ''}`)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
