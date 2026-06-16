import { Guest } from '../types';

export interface ParsedEvent {
  uid: string;
  summary: string;
  dtStart: string;
  dtEnd: string;
  description?: string;
  location?: string;
}

function parseICalDate(raw: string): string {
  // Handle formats: YYYYMMDD, YYYYMMDDTHHMMSSZ, YYYYMMDDTHHMMSS
  const clean = raw.replace(/[TZ]$/, '').replace(/[-:]/g, '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return raw;
}

function extractProperty(lines: string[], key: string): string {
  for (const line of lines) {
    if (line.startsWith(`${key}:`) || line.startsWith(`${key};`)) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) return line.slice(colonIdx + 1).trim();
    }
  }
  return '';
}

export function parseICal(text: string): ParsedEvent[] {
  try {
    const events: ParsedEvent[] = [];
    const veventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/gi;
    let match: RegExpExecArray | null;

    while ((match = veventRegex.exec(text)) !== null) {
      const block = match[0];
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      let uid = extractProperty(lines, 'UID');
      const summary = extractProperty(lines, 'SUMMARY');
      const dtStart = parseICalDate(extractProperty(lines, 'DTSTART'));
      const dtEnd = parseICalDate(extractProperty(lines, 'DTEND'));
      const description = extractProperty(lines, 'DESCRIPTION');
      const location = extractProperty(lines, 'LOCATION');

      if (!uid) {
        uid = 'ical-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      }
      if (!summary && !dtStart && !dtEnd) {
        continue;
      }
      if (!dtStart || !dtEnd) {
        continue;
      }

      events.push({ uid, summary: summary || 'Unknown Guest', dtStart, dtEnd, description: description || undefined, location: location || undefined });
    }

    return events;
  } catch {
    return [];
  }
}

export function parseSummaryToName(summary: string): { firstName: string; lastName: string; name: string } {
  const s = summary.trim();
  if (!s) return { firstName: '', lastName: '', name: '' };

  // 1. "Last, First" format (Western name order)
  if (s.includes(',')) {
    const [lastPart, firstPart] = s.split(',').map(x => x.trim());
    const last = lastPart || '';
    const first = firstPart || '';
    return { firstName: first, lastName: last, name: [first, last].filter(Boolean).join(' ') };
  }

  // 2. "First Last" format (default)
  const parts = s.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', name: parts[0] };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName, name: [firstName, lastName].filter(Boolean).join(' ') };
}

export function mapEventToGuest(event: ParsedEvent): Omit<Guest, 'id'> {
  const checkIn = new Date(event.dtStart);
  const checkOut = new Date(event.dtEnd);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const parsedName = parseSummaryToName(event.summary);

  return {
    name: parsedName.name,
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    country: '',
    countryCode: '',
    checkInDate: event.dtStart,
    checkOutDate: event.dtEnd,
    nights,
    paymentStatus: 'unpaid',
    passportScanned: false,
    source: 'ical',
    notes: event.description || undefined,
    roomPreference: event.location || undefined,
  };
}
