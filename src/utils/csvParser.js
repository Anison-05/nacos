import Papa from 'papaparse';
import { validateMatricNumber, normalizeMatricNumber, getStudentCohort } from '../lib/matricValidator.js';

/**
 * Normalizes header string to lowercase alphanumeric without punctuation or BOM
 */
function cleanHeader(header) {
  if (!header) return '';
  return String(header)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Identifies the standard field name for a given header
 */
function mapHeaderToField(header) {
  const cleaned = cleanHeader(header);
  
  // Matriculation Number variants
  if (
    cleaned === 'matric' ||
    cleaned === 'matricnumber' ||
    cleaned === 'matricno' ||
    cleaned === 'matriculationnumber' ||
    cleaned === 'regno' ||
    cleaned === 'registrationnumber' ||
    cleaned === 'studentmatric' ||
    cleaned.startsWith('matric')
  ) {
    return 'matric_number';
  }

  // Full Name variants
  if (
    cleaned === 'name' ||
    cleaned === 'fullname' ||
    cleaned === 'studentname' ||
    cleaned === 'student' ||
    cleaned === 'names' ||
    cleaned.includes('fullname') ||
    (cleaned.includes('name') && !cleaned.includes('user') && !cleaned.includes('sur'))
  ) {
    return 'full_name';
  }

  // Email variants
  if (
    cleaned === 'email' ||
    cleaned === 'gmail' ||
    cleaned === 'emailaddress' ||
    cleaned === 'studentemail' ||
    cleaned === 'mail' ||
    cleaned.includes('email') ||
    cleaned.includes('gmail')
  ) {
    return 'email';
  }

  return header;
}

/**
 * Parses and validates an uploaded student CSV file
 * Supports 3 CSV Options:
 * 1. Matric + Name (matric_number, full_name)
 * 2. Matric + Email (matric_number, email)
 * 3. Matric + Name + Email (matric_number, full_name, email)
 *
 * @param {File|string} fileOrContent
 * @returns {Promise<{
 *   mode: 'MATRIC_NAME' | 'MATRIC_EMAIL' | 'MATRIC_NAME_EMAIL',
 *   modeLabel: string,
 *   validStudents: Array<{ matric_number: string, full_name?: string, email?: string, cohort: string, level: string }>,
 *   invalidRows: Array<{ row: number, data: any, reason: string }>,
 *   duplicateCount: number,
 *   nd1Count: number,
 *   nd2Count: number,
 *   totalProcessed: number
 * }>}
 */
export function parseStudentCsv(fileOrContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => mapHeaderToField(header),
      complete: (results) => {
        try {
          const rows = results.data;
          const validStudents = [];
          const invalidRows = [];
          const seenMatrics = new Set();
          let duplicateCount = 0;
          let nd1Count = 0;
          let nd2Count = 0;

          let hasNameField = false;
          let hasEmailField = false;

          rows.forEach((row, index) => {
            const rowNumber = index + 2; // +1 for 0-index, +1 for header line

            // Extract values using standardized mapped fields
            const rawMatric = row.matric_number || row.matric || row.matric_no || '';
            const rawName = row.full_name || row.name || '';
            const rawEmail = row.email || row.gmail || '';

            const matric = normalizeMatricNumber(rawMatric);
            const fullName = (rawName || '').trim();
            const email = (rawEmail || '').trim().toLowerCase();

            if (fullName) hasNameField = true;
            if (email) hasEmailField = true;

            // 1. Validate matric number presence
            if (!matric) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: 'Missing matriculation number'
              });
              return;
            }

            // 2. Validate matric format & cohort range (ND1 or ND2)
            const matricValidation = validateMatricNumber(matric);
            if (!matricValidation.isValid) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: matricValidation.error || 'Invalid matriculation number format or range'
              });
              return;
            }

            // 3. Ensure at least Name or Email is present
            if (!fullName && !email) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: 'Row must provide at least a student Full Name or Email address'
              });
              return;
            }

            // 4. Validate email format IF provided
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: `Invalid email address format: "${email}"`
              });
              return;
            }

            // 5. Intra-file duplicate check by matric
            if (seenMatrics.has(matric)) {
              duplicateCount++;
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: `Duplicate matriculation number in CSV: ${matric}`
              });
              return;
            }

            seenMatrics.add(matric);

            const cohort = matricValidation.cohort || getStudentCohort(matric) || 'Unassigned';
            if (cohort === 'ND1') nd1Count++;
            if (cohort === 'ND2') nd2Count++;

            validStudents.push({
              matric_number: matric,
              full_name: fullName || null,
              email: email || null,
              cohort,
              level: cohort
            });
          });

          // Determine detected mode
          let mode = 'MATRIC_NAME_EMAIL';
          let modeLabel = 'Matric + Name + Email';
          if (hasNameField && !hasEmailField) {
            mode = 'MATRIC_NAME';
            modeLabel = 'Matric + Name';
          } else if (!hasNameField && hasEmailField) {
            mode = 'MATRIC_EMAIL';
            modeLabel = 'Matric + Email';
          }

          resolve({
            mode,
            modeLabel,
            validStudents,
            invalidRows,
            duplicateCount,
            nd1Count,
            nd2Count,
            totalProcessed: rows.length
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => reject(error)
    });
  });
}
