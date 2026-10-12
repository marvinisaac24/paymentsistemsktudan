import { Student, SiblingInfo } from '../types';

/**
 * Normalizes text for insensitive matching (removes excess spaces, symbols, lowercase)
 */
export function normalizeText(text: string = ''): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes phone number to digits only for comparison
 */
export function sanitizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

export interface FamilyLookupIndex {
  phoneMap: Map<string, Student[]>;
  parentMap: Map<string, Student[]>;
  familyIdMap: Map<string, Student[]>;
  studentMap: Map<string, Student>;
}

/**
 * Pre-builds O(1) hash indexes across all students in the school.
 * Takes only ~3ms for 1,300+ students and makes subsequent lookups instant.
 */
export function buildFamilyLookupIndex(allStudents: Student[]): FamilyLookupIndex {
  const phoneMap = new Map<string, Student[]>();
  const parentMap = new Map<string, Student[]>();
  const familyIdMap = new Map<string, Student[]>();
  const studentMap = new Map<string, Student>();

  if (!Array.isArray(allStudents)) {
    return { phoneMap, parentMap, familyIdMap, studentMap };
  }

  for (let i = 0; i < allStudents.length; i++) {
    const s = allStudents[i];
    studentMap.set(s.id, s);

    const phone = sanitizePhone(s.parentPhone);
    if (phone.length >= 8) {
      let arr = phoneMap.get(phone);
      if (!arr) {
        arr = [];
        phoneMap.set(phone, arr);
      }
      arr.push(s);
    }

    const pName = normalizeText(s.parentName);
    if (pName.length >= 4) {
      let arr = parentMap.get(pName);
      if (!arr) {
        arr = [];
        parentMap.set(pName, arr);
      }
      arr.push(s);
    }

    if (s.familyId && s.familyId.trim()) {
      const fId = s.familyId.trim();
      let arr = familyIdMap.get(fId);
      if (!arr) {
        arr = [];
        familyIdMap.set(fId, arr);
      }
      arr.push(s);
    }
  }

  return { phoneMap, parentMap, familyIdMap, studentMap };
}

/**
 * Fast O(1) suggested siblings identification using pre-indexed hash maps.
 */
export function findSuggestedSiblingsFast(
  student: Student,
  index: FamilyLookupIndex
): {
  alreadyLinked: Student[];
  suggestedByGuardian: Student[];
  allFamilyMembers: Student[];
} {
  if (!student) {
    return { alreadyLinked: [], suggestedByGuardian: [], allFamilyMembers: [] };
  }

  const alreadyLinked: Student[] = [];
  const suggestedByGuardian: Student[] = [];
  const seenIds = new Set<string>([student.id]);

  // 1. Explicitly linked sibling IDs
  if (Array.isArray(student.siblingIds)) {
    for (let i = 0; i < student.siblingIds.length; i++) {
      const sId = student.siblingIds[i];
      if (sId && !seenIds.has(sId)) {
        seenIds.add(sId);
        const sib = index.studentMap.get(sId);
        if (sib) alreadyLinked.push(sib);
      }
    }
  }

  // 2. Shared family ID
  if (student.familyId && student.familyId.trim()) {
    const famStudents = index.familyIdMap.get(student.familyId.trim());
    if (famStudents) {
      for (let i = 0; i < famStudents.length; i++) {
        const other = famStudents[i];
        if (!seenIds.has(other.id)) {
          seenIds.add(other.id);
          alreadyLinked.push(other);
        }
      }
    }
  }

  // 3. Parent phone match (highest guardian signal)
  const phone = sanitizePhone(student.parentPhone);
  if (phone.length >= 8) {
    const phoneMatches = index.phoneMap.get(phone);
    if (phoneMatches) {
      for (let i = 0; i < phoneMatches.length; i++) {
        const other = phoneMatches[i];
        if (!seenIds.has(other.id)) {
          seenIds.add(other.id);
          suggestedByGuardian.push(other);
        }
      }
    }
  }

  // 4. Parent name exact match
  const pName = normalizeText(student.parentName);
  if (pName.length >= 4) {
    const parentMatches = index.parentMap.get(pName);
    if (parentMatches) {
      for (let i = 0; i < parentMatches.length; i++) {
        const other = parentMatches[i];
        if (!seenIds.has(other.id)) {
          seenIds.add(other.id);
          suggestedByGuardian.push(other);
        }
      }
    }
  }

  return {
    alreadyLinked,
    suggestedByGuardian,
    allFamilyMembers: [...alreadyLinked, ...suggestedByGuardian],
  };
}

/**
 * Standard findSuggestedSiblings with backwards-compatibility.
 */
export function findSuggestedSiblings(
  student: Student,
  allStudents: Student[]
): {
  alreadyLinked: Student[];
  suggestedByGuardian: Student[];
  allFamilyMembers: Student[];
} {
  const index = buildFamilyLookupIndex(allStudents);
  return findSuggestedSiblingsFast(student, index);
}

/**
 * Generates the official automated note for family PIBG contributions:
 */
export function generatePibgFamilyNote(
  representativeName: string,
  representativeClass: string,
  dateStr: string,
  receiptNumber: string
): string {
  return `Sumbangan PIBG keluarga telah dibayar melalui ${representativeName}, kelas ${representativeClass}, pada ${dateStr}. Nombor resit: ${receiptNumber}.`;
}

/**
 * Formats a student into standard SiblingInfo representation
 */
export function toSiblingInfo(student: Student): SiblingInfo {
  return {
    id: student.id,
    name: student.name,
    className: student.className,
    schoolYear: student.schoolYear,
  };
}
