/**
 * Utility for exact monetary calculations in Malaysian Ringgit (sen-based)
 * Prevents floating-point precision errors (e.g. 0.1 + 0.2 !== 0.3)
 */

export function formatRM(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const ringgit = Math.floor(absCents / 100);
  const remainderSen = absCents % 100;
  const formatted = `${ringgit.toLocaleString('ms-MY')}.${remainderSen.toString().padStart(2, '0')}`;
  return `${isNegative ? '-' : ''}RM${formatted}`;
}

export function formatNumberRM(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const ringgit = Math.floor(absCents / 100);
  const remainderSen = absCents % 100;
  return `${isNegative ? '-' : ''}${ringgit.toString()}.${remainderSen.toString().padStart(2, '0')}`;
}

export function rmToCents(amount: number | string): number {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  const cleaned = amount.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function centsToRM(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Get current time in Malaysia timezone (UTC+8)
 */
export function getMalaysiaDateTime(dateObj: Date = new Date()): {
  iso: string;
  formatted: string;
  year: string;
} {
  // Asia/Kuala_Lumpur is UTC+8
  const formatter = new Intl.DateTimeFormat('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(dateObj);
  let day = '', month = '', year = '', hour = '', minute = '', second = '', dayPeriod = '';
  for (const p of parts) {
    if (p.type === 'day') day = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'year') year = p.value;
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
    if (p.type === 'second') second = p.value;
    if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
  }

  const formatted = `${day}/${month}/${year}, ${hour}:${minute}:${second} ${dayPeriod}`;
  return {
    iso: dateObj.toISOString(),
    formatted,
    year: year || '2026',
  };
}

/**
 * Format date display
 */
export function formatDisplayDate(isoOrDateStr: string): string {
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    return d.toLocaleString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Mask MyKid number (e.g. 170512-13-5819 -> 170512-13-**** or ******--****)
 */
export function maskMyKid(myKid?: string, canViewFull: boolean = false): string {
  if (!myKid) return '-';
  if (canViewFull) return myKid;
  const cleaned = myKid.trim();
  if (cleaned.length <= 4) return '****';
  return cleaned.substring(0, cleaned.length - 4) + '****';
}
