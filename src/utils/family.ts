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

/**
 * Identifies suggested or already linked siblings for a given student across all students in school.
 * Considers:
 * 1. Explicitly linked siblingIds on the student
 * 2. Shared non-empty familyId
 * 3. Matching parentPhone (with at least 8 digits)
 * 4. Matching parentName (with length >= 4)
 */
export function findSuggestedSiblings(
  student: Student,
  allStudents: Student[]
): {
  alreadyLinked: Student[];
  suggestedByGuardian: Student[];
  allFamilyMembers: Student[];
} {
  if (!student || !allStudents) {
    return { alreadyLinked: [], suggestedByGuardian: [], allFamilyMembers: [] };
  }

  const explicitIds = new Set(student.siblingIds || []);
  const studentFamId = student.familyId?.trim();
  const studentPhone = sanitizePhone(student.parentPhone);
  const studentParent = normalizeText(student.parentName);

  const alreadyLinked: Student[] = [];
  const suggestedByGuardian: Student[] = [];
  const seenIds = new Set<string>([student.id]);

  for (const other of allStudents) {
    if (other.id === student.id) continue;

    // Check if explicitly linked or shares familyId
    const isExplicit =
      explicitIds.has(other.id) ||
      (other.siblingIds && other.siblingIds.includes(student.id)) ||
      (studentFamId && other.familyId && studentFamId === other.familyId.trim());

    if (isExplicit) {
      if (!seenIds.has(other.id)) {
        alreadyLinked.push(other);
        seenIds.add(other.id);
      }
      continue;
    }

    // Check by guardian phone (strong signal)
    const otherPhone = sanitizePhone(other.parentPhone);
    const phoneMatch = studentPhone.length >= 8 && otherPhone === studentPhone;

    // Check by guardian name (good signal)
    const otherParent = normalizeText(other.parentName);
    const parentMatch =
      studentParent.length >= 4 &&
      (otherParent === studentParent ||
        (otherParent.length >= 6 &&
          studentParent.length >= 6 &&
          (otherParent.includes(studentParent) || studentParent.includes(otherParent))));

    if ((phoneMatch || parentMatch) && !seenIds.has(other.id)) {
      suggestedByGuardian.push(other);
      seenIds.add(other.id);
    }
  }

  return {
    alreadyLinked,
    suggestedByGuardian,
    allFamilyMembers: [...alreadyLinked, ...suggestedByGuardian],
  };
}

/**
 * Generates the official automated note for family PIBG contributions:
 * "Sumbangan PIBG keluarga telah dibayar melalui [Nama Murid Wakil], kelas [Kelas], pada [Tarikh]. Nombor resit: [Nombor Resit]."
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
