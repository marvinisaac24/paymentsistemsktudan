/**
 * Generates an SVG Data URI representing an official school badge/emblem for SK Tudan
 */
export function generateSampleSchoolLogo(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#064e3b"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#ca8a04"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Outer Shield with Gold Border -->
    <path d="M 100 12 C 145 12 182 25 182 45 C 182 120 135 170 100 188 C 65 170 18 120 18 45 C 18 25 55 12 100 12 Z"
      fill="url(#goldGrad)" filter="url(#shadow)"/>
    
    <!-- Inner Shield (Emerald Green) -->
    <path d="M 100 20 C 138 20 172 31 172 48 C 172 113 130 160 100 176 C 70 160 28 113 28 48 C 28 31 62 20 100 20 Z"
      fill="url(#shieldGrad)" stroke="#ffffff" stroke-width="2"/>

    <!-- School Torch Flame (Yellow / Orange) -->
    <path d="M 100 38 Q 108 52 103 62 Q 115 50 110 42 Q 118 55 112 68 Q 100 78 88 68 Q 82 55 90 42 Q 85 50 97 62 Z"
      fill="#f59e0b"/>
    <path d="M 100 46 Q 104 54 101 60 Q 96 54 100 46 Z" fill="#ef4444"/>

    <!-- Torch Base -->
    <path d="M 94 68 L 106 68 L 103 82 L 97 82 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="1"/>

    <!-- Open Book (Education symbol) -->
    <path d="M 100 96 C 88 88 72 88 60 92 L 60 116 C 72 112 88 112 100 120 C 112 112 128 112 140 116 L 140 92 C 128 88 112 88 100 96 Z"
      fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
    <line x1="100" y1="96" x2="100" y2="120" stroke="#0f172a" stroke-width="2"/>
    <line x1="68" y1="98" x2="92" y2="102" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="68" y1="104" x2="92" y2="108" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="108" y1="102" x2="132" y2="98" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="108" y1="108" x2="132" y2="104" stroke="#94a3b8" stroke-width="1.5"/>

    <!-- Gear wheels on sides -->
    <circle cx="68" cy="74" r="8" fill="none" stroke="#fef08a" stroke-width="2" stroke-dasharray="3 2"/>
    <circle cx="132" cy="74" r="8" fill="none" stroke="#fef08a" stroke-width="2" stroke-dasharray="3 2"/>

    <!-- Banner Ribbon for School Name -->
    <path d="M 30 142 L 50 134 L 150 134 L 170 142 L 156 156 L 100 152 L 44 156 Z"
      fill="url(#goldGrad)" stroke="#78350f" stroke-width="1"/>

    <!-- Text: SK TUDAN -->
    <text x="100" y="147" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="11"
      fill="#0f172a" text-anchor="middle" letter-spacing="1">SK TUDAN</text>

    <!-- Subtext: MIRI SARAWAK -->
    <text x="100" y="166" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="7"
      fill="#fef08a" text-anchor="middle" letter-spacing="0.5">MIRI, SARAWAK</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG Data URI representing an official school rubber stamp (Cop Rasmi Bulat) for SK Tudan
 */
export function generateSampleSchoolStamp(officerTitle: string = 'GURU BESAR'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <!-- Double border stamp circle in official stamp blue ink -->
    <circle cx="100" cy="100" r="92" fill="none" stroke="#1d4ed8" stroke-width="4.5" stroke-dasharray="1 0"/>
    <circle cx="100" cy="100" r="82" fill="none" stroke="#1d4ed8" stroke-width="1.8"/>
    <circle cx="100" cy="100" r="54" fill="none" stroke="#1d4ed8" stroke-width="2"/>

    <path id="upperArc" d="M 28 100 A 72 72 0 1 1 172 100" fill="none" stroke="none"/>
    <path id="lowerArc" d="M 172 100 A 72 72 0 0 1 28 100" fill="none" stroke="none"/>

    <text font-family="'Courier New', Courier, monospace, Arial" font-size="11.5" font-weight="900" fill="#1d4ed8" letter-spacing="2.2">
      <textPath href="#upperArc" startOffset="50%" text-anchor="middle">
        SEKOLAH KEBANGSAAN TUDAN
      </textPath>
    </text>

    <text font-family="'Courier New', Courier, monospace, Arial" font-size="10" font-weight="900" fill="#1d4ed8" letter-spacing="2.2">
      <textPath href="#lowerArc" startOffset="50%" text-anchor="middle">
        ★ MIRI, SARAWAK (YBA4111) ★
      </textPath>
    </text>

    <!-- Center text of the stamp -->
    <text x="100" y="88" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="900" fill="#1d4ed8" text-anchor="middle" letter-spacing="1">PENGESAHAN</text>
    <text x="100" y="103" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="900" fill="#1d4ed8" text-anchor="middle" letter-spacing="1.2">${officerTitle.toUpperCase()}</text>
    <text x="100" y="117" font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="800" fill="#1d4ed8" text-anchor="middle" letter-spacing="1">SK TUDAN</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG Data URI representing a digital handwritten signature
 */
export function generateSampleSignature(name: string = 'Lim Ai Giok'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
    <path d="M 25 55 Q 40 25 55 45 T 75 35 Q 90 20 105 50 Q 115 25 130 45 T 160 30 Q 185 20 215 50 Q 170 58 120 62 Q 70 65 30 60"
      fill="none" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 60 40 Q 75 15 90 40 Q 110 50 140 35"
      fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>
    <text x="120" y="74" font-family="Brush Script MT, cursive, Arial" font-size="13" font-style="italic" fill="#334155" text-anchor="middle">
      ${name}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
