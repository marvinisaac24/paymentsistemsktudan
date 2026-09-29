/**
 * Standard School Classes Structure for SK TUDAN
 * Formats:
 * - PRASEKOLAH: PRASEKOLAH ARIF, PRASEKOLAH BESTARI, PRASEKOLAH CEKAL, PRASEKOLAH DINAMIK, PRASEKOLAH EFISIEN, PRASEKOLAH FLEKSIBEL
 * - TAHUN 1 - 6: <TAHUN> <ALIRAN> (e.g. 1 ARIF, 1 BESTARI, 1 CEKAL, 1 DINAMIK, 1 EFISIEN, 1 FLEKSIBEL)
 */

export const SCHOOL_LEVELS = [
  { id: 'PRASEKOLAH', label: 'Prasekolah' },
  { id: '1', label: 'Tahun 1' },
  { id: '2', label: 'Tahun 2' },
  { id: '3', label: 'Tahun 3' },
  { id: '4', label: 'Tahun 4' },
  { id: '5', label: 'Tahun 5' },
  { id: '6', label: 'Tahun 6' },
] as const;

export const SCHOOL_STREAMS = [
  'ARIF',
  'BESTARI',
  'CEKAL',
  'DINAMIK',
  'EFISIEN',
  'FLEKSIBEL',
] as const;

export const ALL_STANDARD_CLASSES: string[] = [
  // Prasekolah
  'PRASEKOLAH ARIF',
  'PRASEKOLAH BESTARI',
  'PRASEKOLAH CEKAL',
  'PRASEKOLAH DINAMIK',
  'PRASEKOLAH EFISIEN',
  'PRASEKOLAH FLEKSIBEL',
  // Tahun 1
  '1 ARIF',
  '1 BESTARI',
  '1 CEKAL',
  '1 DINAMIK',
  '1 EFISIEN',
  '1 FLEKSIBEL',
  // Tahun 2
  '2 ARIF',
  '2 BESTARI',
  '2 CEKAL',
  '2 DINAMIK',
  '2 EFISIEN',
  '2 FLEKSIBEL',
  // Tahun 3
  '3 ARIF',
  '3 BESTARI',
  '3 CEKAL',
  '3 DINAMIK',
  '3 EFISIEN',
  '3 FLEKSIBEL',
  // Tahun 4
  '4 ARIF',
  '4 BESTARI',
  '4 CEKAL',
  '4 DINAMIK',
  '4 EFISIEN',
  '4 FLEKSIBEL',
  // Tahun 5
  '5 ARIF',
  '5 BESTARI',
  '5 CEKAL',
  '5 DINAMIK',
  '5 EFISIEN',
  '5 FLEKSIBEL',
  // Tahun 6
  '6 ARIF',
  '6 BESTARI',
  '6 CEKAL',
  '6 DINAMIK',
  '6 EFISIEN',
  '6 FLEKSIBEL',
];

/**
 * Normalizes any free-text or imported class string into official canonical format
 */
export function normalizeClassName(rawClass: string, fallbackLevel = '3'): string {
  if (!rawClass) return `3 ARIF`;
  const trimmed = rawClass.trim().replace(/\s+/g, ' ');

  // Exact match in standard classes
  const foundExact = ALL_STANDARD_CLASSES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (foundExact) return foundExact;

  // Handle Prasekolah variations: "Pra Arif", "Prasekolah  Arif", "Pra-sekolah Arif", "Praktis..."
  const praMatch = trimmed.match(/^(?:PRA|PRASEKOLAH|PRA-SEKOLAH)\s*[-_]?\s*(ARIF|BESTARI|CEKAL|DINAMIK|EFISIEN|FLEKSIBEL)$/i);
  if (praMatch) {
    const stream = praMatch[1].toUpperCase();
    return `PRASEKOLAH ${stream}`;
  }

  // Handle Standard Years 1 to 6: "1 Arif", "1-Arif", "1ARIF", "Tahun 1 Arif", "T1 ARIF"
  const yearMatch = trimmed.match(/(?:TAHUN|T)?\s*([1-6])\s*[-_]?\s*(ARIF|BESTARI|CEKAL|DINAMIK|EFISIEN|FLEKSIBEL)/i);
  if (yearMatch) {
    const year = yearMatch[1];
    const stream = yearMatch[2].toUpperCase();
    return `${year} ${stream}`;
  }

  // Handle old demo classes: "3 Amanah" -> "3 ARIF", "3 Bijak" -> "3 BESTARI", "3 Cemerlang" -> "3 CEKAL"
  if (/amanah/i.test(trimmed)) return `${fallbackLevel} ARIF`;
  if (/bijak/i.test(trimmed)) return `${fallbackLevel} BESTARI`;
  if (/cemerlang/i.test(trimmed)) return `${fallbackLevel} CEKAL`;
  if (/dedikasi/i.test(trimmed)) return `${fallbackLevel} DINAMIK`;

  // If user only specified stream without year (e.g. "ARIF", "BESTARI"):
  const streamOnly = SCHOOL_STREAMS.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  if (streamOnly) {
    return `${fallbackLevel} ${streamOnly}`;
  }

  return trimmed.toUpperCase();
}

/**
 * Comparator to sort class names logically:
 * Prasekolah -> 1 -> 2 -> 3 -> 4 -> 5 -> 6
 * ARIF -> BESTARI -> CEKAL -> DINAMIK -> EFISIEN -> FLEKSIBEL
 */
export function compareClassNames(a: string, b: string): number {
  const getRank = (cls: string): number => {
    const clean = cls.trim().toUpperCase();
    const idx = ALL_STANDARD_CLASSES.indexOf(clean);
    if (idx !== -1) return idx;

    // Unknown or other class
    return 9999;
  };

  const rankA = getRank(a);
  const rankB = getRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  return a.localeCompare(b);
}

/**
 * Extract level and stream from class name
 */
export function parseClassInfo(className: string): { level: string; stream: string } {
  const clean = className.trim().toUpperCase();
  if (clean.startsWith('PRASEKOLAH') || clean.startsWith('PRA')) {
    const stream = clean.replace(/^(?:PRASEKOLAH|PRA)\s*/, '');
    return { level: 'PRASEKOLAH', stream };
  }

  const match = clean.match(/^([1-6])\s*(.*)$/);
  if (match) {
    return { level: match[1], stream: match[2] };
  }

  return { level: 'LAIN', stream: clean };
}
