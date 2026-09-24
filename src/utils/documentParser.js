import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { validateMatricNumber, normalizeMatricNumber, getStudentCohort } from '../lib/matricValidator.js';

/**
 * Normalizes header string to lowercase alphanumeric without punctuation or BOM
 */
export function cleanHeader(header) {
  if (!header) return '';
  return String(header)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Identifies standard field name for a given header
 */
export function mapHeaderToField(header) {
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
 * Validates and transforms a list of raw student row objects into standardized valid/invalid results
 *
 * @param {Array<object>} rawRows
 * @param {'AUTO' | 'MATRIC_NAME' | 'MATRIC_EMAIL' | 'MATRIC_NAME_EMAIL'} targetType
 */
export function processStudentRows(rawRows, targetType = 'AUTO') {
  const validStudents = [];
  const invalidRows = [];
  const seenMatrics = new Set();
  let duplicateCount = 0;
  let nd1Count = 0;
  let nd2Count = 0;

  let hasNameField = false;
  let hasEmailField = false;

  rawRows.forEach((row, index) => {
    const rowNumber = index + 1;

    // Normalize keys
    const mapped = {};
    for (const [k, v] of Object.entries(row)) {
      const field = mapHeaderToField(k);
      mapped[field] = v != null ? String(v).trim() : '';
    }

    const rawMatric = mapped.matric_number || mapped.matric || mapped.matric_no || '';
    const rawName = mapped.full_name || mapped.name || '';
    const rawEmail = mapped.email || mapped.gmail || '';

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

    // 2. Validate matric format & cohort range
    const matricValidation = validateMatricNumber(matric);
    if (!matricValidation.isValid) {
      invalidRows.push({
        row: rowNumber,
        data: row,
        reason: matricValidation.error || 'Invalid matriculation number format or range'
      });
      return;
    }

    // 3. Check requirements based on targetType
    if (targetType === 'MATRIC_NAME') {
      if (!fullName) {
        invalidRows.push({
          row: rowNumber,
          data: row,
          reason: 'Student Full Name is required for Matric + Name import.'
        });
        return;
      }
    } else if (targetType === 'MATRIC_EMAIL') {
      if (!email) {
        invalidRows.push({
          row: rowNumber,
          data: row,
          reason: 'Student Email is required for Matric + Email import.'
        });
        return;
      }
    } else if (targetType === 'MATRIC_NAME_EMAIL') {
      if (!fullName || !email) {
        invalidRows.push({
          row: rowNumber,
          data: row,
          reason: 'Both Full Name and Email are required for Matric + Name + Email import.'
        });
        return;
      }
    } else {
      // AUTO mode: Requires at least Name or Email
      if (!fullName && !email) {
        invalidRows.push({
          row: rowNumber,
          data: row,
          reason: 'Row must provide at least a student Full Name or Email address'
        });
        return;
      }
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
        reason: `Duplicate matriculation number in document: ${matric}`
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
  if (targetType !== 'AUTO') {
    mode = targetType;
    if (targetType === 'MATRIC_NAME') modeLabel = 'Matric + Name';
    else if (targetType === 'MATRIC_EMAIL') modeLabel = 'Matric + Email';
    else modeLabel = 'Matric + Name + Email';
  } else {
    if (hasNameField && !hasEmailField) {
      mode = 'MATRIC_NAME';
      modeLabel = 'Matric + Name';
    } else if (!hasNameField && hasEmailField) {
      mode = 'MATRIC_EMAIL';
      modeLabel = 'Matric + Email';
    }
  }

  return {
    mode,
    modeLabel,
    validStudents,
    invalidRows,
    duplicateCount,
    nd1Count,
    nd2Count,
    totalProcessed: rawRows.length
  };
}

/**
 * Parses an Excel (.xlsx / .xls) file
 */
export async function parseExcelDocument(file, targetType = 'AUTO') {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel workbook contains no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  // Parse rows as array of arrays first to find header row
  const rawAOA = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawAOA.length) {
    throw new Error('The Excel worksheet is empty.');
  }

  // Find header row index (row containing 'matric' or 'reg')
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawAOA.length, 10); i++) {
    const rowStr = rawAOA[i].map((c) => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('matric') || rowStr.includes('reg') || rowStr.includes('fpa/cs')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    // If no explicit header, check if row 0 has strings or look for matric pattern in columns
    headerIndex = 0;
  }

  const headers = rawAOA[headerIndex].map((h) => String(h || '').trim());
  const rows = [];

  for (let i = headerIndex + 1; i < rawAOA.length; i++) {
    const rawRow = rawAOA[i];
    if (!rawRow || !rawRow.some((cell) => String(cell).trim())) continue;

    const rowObj = {};
    headers.forEach((h, colIdx) => {
      const field = h ? mapHeaderToField(h) : `col_${colIdx}`;
      rowObj[field] = rawRow[colIdx] != null ? String(rawRow[colIdx]).trim() : '';
    });

    // If headers didn't identify matric_number, search values for matric pattern
    if (!rowObj.matric_number) {
      for (const val of rawRow) {
        const str = String(val || '').trim();
        if (str.toUpperCase().includes('FPA/CS/')) {
          rowObj.matric_number = str;
          break;
        }
      }
    }

    rows.push(rowObj);
  }

  if (!rows.length) {
    throw new Error('Could not find any student records in this Excel spreadsheet.');
  }

  return processStudentRows(rows, targetType);
}

/**
 * Parses a Word (.docx / .doc) document
 */
export async function parseWordDocument(file, targetType = 'AUTO') {
  const arrayBuffer = await file.arrayBuffer();
  
  // Extract HTML to parse tables if present
  let htmlResult;
  try {
    htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  } catch (err) {
    throw new Error(`Unable to read Word document (.docx): ${err.message}`);
  }

  const rows = [];
  const html = htmlResult.value || '';

  // Parse HTML tables if present
  if (html.includes('<table')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');

    tables.forEach((table) => {
      const trs = Array.from(table.querySelectorAll('tr'));
      if (!trs.length) return;

      // Extract headers from first tr
      let headers = [];
      const firstRowTds = Array.from(trs[0].querySelectorAll('th, td'));
      headers = firstRowTds.map((cell) => cell.textContent.trim());

      const isHeaderRow = headers.some((h) => {
        const clean = cleanHeader(h);
        return clean.includes('matric') || clean.includes('name') || clean.includes('email');
      });

      const startIdx = isHeaderRow ? 1 : 0;
      for (let i = startIdx; i < trs.length; i++) {
        const cells = Array.from(trs[i].querySelectorAll('td')).map((c) => c.textContent.trim());
        if (!cells.some(Boolean)) continue;

        const rowObj = {};
        if (isHeaderRow) {
          headers.forEach((h, colIdx) => {
            const field = mapHeaderToField(h);
            rowObj[field] = cells[colIdx] || '';
          });
        }

        // If matric_number not mapped, detect by pattern
        if (!rowObj.matric_number) {
          cells.forEach((c) => {
            if (c.toUpperCase().includes('FPA/CS/')) rowObj.matric_number = c;
            else if (c.includes('@') && !rowObj.email) rowObj.email = c;
            else if (!rowObj.full_name && c.length > 3 && !/\d/.test(c)) rowObj.full_name = c;
          });
        }

        if (rowObj.matric_number) {
          rows.push(rowObj);
        }
      }
    });
  }

  // If no tables or empty, extract from raw text line by line
  if (!rows.length) {
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const text = textResult.value || '';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    lines.forEach((line) => {
      // Look for matric pattern: FPA/CS/YY/1-XXXX
      const matricMatch = line.match(/\b(FPA[/-]CS[/-](?:24|25)[/-][0-9]+[/-][0-9]+)\b/i) ||
                          line.match(/\b(FPA\/CS\/(?:24|25)\/[0-9]+-[0-9]{4})\b/i);

      if (matricMatch) {
        const matric = matricMatch[1];
        const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        const email = emailMatch ? emailMatch[0] : '';

        // Strip matric and email from line to get student name
        let nameCandidate = line.replace(matric, '').replace(email, '').trim();
        // Remove common punctuation or numbering like "1.", "2 - "
        nameCandidate = nameCandidate.replace(/^[0-9]+[\.\-\)\s]+/, '').replace(/[,|\t]+/g, ' ').trim();

        rows.push({
          matric_number: matric,
          full_name: nameCandidate || '',
          email: email || ''
        });
      }
    });
  }

  if (!rows.length) {
    throw new Error('No valid student entries found in the Word document. Ensure matric numbers (e.g. FPA/CS/24/1-0001) are present.');
  }

  return processStudentRows(rows, targetType);
}

/**
 * Parses a PDF document by extracting text lines and tables
 */
export async function parsePdfDocument(file, targetType = 'AUTO') {
  const arrayBuffer = await file.arrayBuffer();

  // Load PDF.js from CDN dynamically if not available
  if (typeof window !== 'undefined' && !window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PDF parser library.'));
      document.head.appendChild(script);
    });
  }

  let fullText = '';
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }
  } else {
    // Basic text extractor fallback for environments without window
    const decoder = new TextDecoder('utf-8');
    fullText = decoder.decode(arrayBuffer);
  }

  // Extract student entries from text
  const rows = [];
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean);

  lines.forEach((line) => {
    const matricMatch = line.match(/\b(FPA[/-]CS[/-](?:24|25)[/-][0-9]+[/-][0-9]+)\b/i) ||
                        line.match(/\b(FPA\/CS\/(?:24|25)\/[0-9]+-[0-9]{4})\b/i);

    if (matricMatch) {
      const matric = matricMatch[1];
      const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      const email = emailMatch ? emailMatch[0] : '';

      let nameCandidate = line.replace(matric, '').replace(email, '').trim();
      nameCandidate = nameCandidate.replace(/^[0-9]+[\.\-\)\s]+/, '').replace(/[,|\t]+/g, ' ').trim();

      rows.push({
        matric_number: matric,
        full_name: nameCandidate || '',
        email: email || ''
      });
    }
  });

  if (!rows.length) {
    throw new Error('No valid student entries found in the PDF document. Please verify that the PDF contains readable text and matriculation numbers.');
  }

  return processStudentRows(rows, targetType);
}

/**
 * Universal Student Document Parser
 * Supports: CSV (.csv), Excel (.xlsx, .xls), Word (.docx, .doc), PDF (.pdf)
 */
export async function parseStudentDocument(file, targetType = 'AUTO') {
  if (!file) {
    throw new Error('No file selected.');
  }

  const fileName = (file.name || '').toLowerCase();

  // 1. CSV
  if (fileName.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => mapHeaderToField(h),
        complete: (results) => {
          try {
            const parsed = processStudentRows(results.data, targetType);
            resolve({ ...parsed, fileType: 'CSV' });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  // 2. Excel (.xlsx / .xls)
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const result = await parseExcelDocument(file, targetType);
    return { ...result, fileType: 'Excel' };
  }

  // 3. Word (.docx / .doc)
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    const result = await parseWordDocument(file, targetType);
    return { ...result, fileType: 'Word' };
  }

  // 4. PDF (.pdf)
  if (fileName.endsWith('.pdf')) {
    const result = await parsePdfDocument(file, targetType);
    return { ...result, fileType: 'PDF' };
  }

  throw new Error(`Unsupported document format "${fileName}". Please upload a CSV, Excel (.xlsx/.xls), Word (.docx), or PDF (.pdf) file.`);
}

/**
 * Backward compatibility alias for parseStudentCsv
 */
export function parseStudentCsv(fileOrContent) {
  return parseStudentDocument(fileOrContent, 'AUTO');
}
