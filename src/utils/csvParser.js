/**
 * Backward Compatibility Layer
 * Re-exports from unified documentParser.js
 */
export {
  parseStudentDocument,
  parseStudentCsv,
  parseExcelDocument,
  parseWordDocument,
  parsePdfDocument,
  processStudentRows,
  cleanHeader,
  mapHeaderToField
} from './documentParser.js';
