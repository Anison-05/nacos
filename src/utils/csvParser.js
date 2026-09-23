import Papa from 'papaparse';
import { validateMatricNumber, normalizeMatricNumber } from '../lib/matricValidator';

/**
 * Parses and validates an uploaded student CSV file
 * Expected headers (case-insensitive):
 * - matric_number (or matric, matric_no)
 * - full_name (or name, student_name)
 * - email (or student_email)
 *
 * @param {File|string} fileOrContent
 * @returns {Promise<{
 *   validStudents: Array<{ matric_number: string, full_name: string, email: string, group?: string }>,
 *   invalidRows: Array<{ row: number, data: any, reason: string }>,
 *   duplicateCount: number,
 *   totalProcessed: number
 * }>}
 */
export function parseStudentCsv(fileOrContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim().toLowerCase().replace(/[\s-]+/g, '_'),
      complete: (results) => {
        try {
          const rows = results.data;
          const validStudents = [];
          const invalidRows = [];
          const seenMatrics = new Set();
          const seenEmails = new Set();
          let duplicateCount = 0;

          rows.forEach((row, index) => {
            const rowNumber = index + 2; // +1 for 0-index, +1 for header line

            // Normalize fields from possible header variations
            const rawMatric = row.matric_number || row.matric || row.matric_no || row.matriculation_number || '';
            const rawName = row.full_name || row.name || row.student_name || '';
            const rawEmail = row.email || row.student_email || row.mail || '';

            const matric = normalizeMatricNumber(rawMatric);
            const fullName = (rawName || '').trim();
            const email = (rawEmail || '').trim().toLowerCase();

            // Validate non-empty fields
            if (!matric) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: 'Missing matriculation number'
              });
              return;
            }

            if (!fullName) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: 'Missing full name'
              });
              return;
            }

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: `Invalid email address: "${email}"`
              });
              return;
            }

            // Matric cohort validation
            const matricValidation = validateMatricNumber(matric);
            if (!matricValidation.isValid) {
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: matricValidation.error || 'Invalid matriculation number format or range'
              });
              return;
            }

            // Check intra-file duplicate matric
            if (seenMatrics.has(matric)) {
              duplicateCount++;
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: `Duplicate matriculation number in CSV: ${matric}`
              });
              return;
            }

            // Check intra-file duplicate email
            if (seenEmails.has(email)) {
              duplicateCount++;
              invalidRows.push({
                row: rowNumber,
                data: row,
                reason: `Duplicate email address in CSV: ${email}`
              });
              return;
            }

            seenMatrics.add(matric);
            seenEmails.add(email);

            validStudents.push({
              matric_number: matric,
              full_name: fullName,
              email: email,
              group: matricValidation.group
            });
          });

          resolve({
            validStudents,
            invalidRows,
            duplicateCount,
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
