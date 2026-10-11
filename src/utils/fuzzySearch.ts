/**
 * Fuzzy search utilities for student name and detail matching.
 * Handles minor typos, transposed letters, phonetic variations, and prefix/word tokens.
 */

/**
 * Calculates the Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Normalizes text: lowercase, remove punctuation, trim excess spaces
 */
export function normalizeSearchString(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')     // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a candidate string matches a query with fuzzy tolerance
 * @param candidate Target text to search in (e.g. Student name)
 * @param query Search query from user
 * @param maxDistance Allowed edit distance (default dynamically computed)
 */
export function fuzzyMatch(candidate: string, query: string): { match: boolean; score: number } {
  if (!query || !query.trim()) return { match: true, score: 1 };
  if (!candidate) return { match: false, score: 0 };

  const normCandidate = normalizeSearchString(candidate);
  const normQuery = normalizeSearchString(query);

  if (!normQuery) return { match: true, score: 1 };

  // 1. Direct exact or substring match
  if (normCandidate === normQuery) {
    return { match: true, score: 1.0 };
  }
  if (normCandidate.includes(normQuery)) {
    return { match: true, score: 0.9 };
  }

  // 2. Token-based matching (each query word should match or fuzzily match candidate words)
  const queryTokens = normQuery.split(' ').filter(Boolean);
  const candidateTokens = normCandidate.split(' ').filter(Boolean);

  let allTokensMatched = true;
  let totalScore = 0;

  for (const qTok of queryTokens) {
    let bestTokScore = 0;

    for (const cTok of candidateTokens) {
      if (cTok === qTok) {
        bestTokScore = Math.max(bestTokScore, 1.0);
      } else if (cTok.startsWith(qTok)) {
        bestTokScore = Math.max(bestTokScore, 0.85);
      } else if (cTok.includes(qTok)) {
        bestTokScore = Math.max(bestTokScore, 0.75);
      } else {
        // Levenshtein fuzzy match on individual tokens
        // Also check if candidate token starts with a fuzzy match of query token
        const prefixCTok = cTok.slice(0, Math.min(cTok.length, qTok.length + 1));
        const distPrefix = levenshteinDistance(qTok, prefixCTok);
        const distFull = levenshteinDistance(qTok, cTok);
        const dist = Math.min(distPrefix, distFull);

        // Allow 1 typo for length >= 3, 2 typos for length >= 5, 3 typos for length >= 8
        const maxAllowed = qTok.length <= 3 ? 1 : qTok.length <= 6 ? 2 : 3;
        if (dist <= maxAllowed) {
          const tokSim = 1 - dist / Math.max(qTok.length, prefixCTok.length);
          bestTokScore = Math.max(bestTokScore, tokSim * 0.7);
        }
      }
      if (bestTokScore >= 1.0) break;
    }

    if (bestTokScore === 0) {
      allTokensMatched = false;
      break;
    }
    totalScore += bestTokScore;
  }

  if (allTokensMatched && queryTokens.length > 0) {
    const avgScore = totalScore / queryTokens.length;
    return { match: true, score: avgScore };
  }

  // 3. Fallback: Entire phrase fuzzy distance if query length > 3
  if (normQuery.length >= 4) {
    const dist = levenshteinDistance(normCandidate, normQuery);
    const maxAllowed = normQuery.length <= 6 ? 1 : 2;
    if (dist <= maxAllowed) {
      return { match: true, score: 0.5 };
    }
  }

  return { match: false, score: 0 };
}

/**
 * Filter and sort a list of items using fuzzy search on multiple fields
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  fieldExtractor: (item: T) => string[]
): T[] {
  const cleanQ = query.trim();
  if (!cleanQ) return items;

  const results: { item: T; score: number }[] = [];

  for (const item of items) {
    const fields = fieldExtractor(item);
    let maxItemScore = 0;
    let matched = false;

    for (const field of fields) {
      if (!field) continue;
      const res = fuzzyMatch(field, cleanQ);
      if (res.match && res.score > maxItemScore) {
        maxItemScore = res.score;
        matched = true;
      }
    }

    if (matched) {
      results.push({ item, score: maxItemScore });
    }
  }

  // Sort by highest similarity score first
  return results
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
