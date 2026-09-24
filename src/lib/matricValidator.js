/**
 * NACOS Matriculation Number Validation Utility
 *
 * Supported cohort ranges:
 * - ND2 (2024 Entry): FPA/CS/24/1-0001 through FPA/CS/24/1-0084
 * - ND1 (2025 Entry): FPA/CS/25/1-0001 through FPA/CS/25/1-0142
 *
 * General pattern: FPA/CS/YY/STREAM-INDEX
 */

export const MATRIC_RULES = {
  ND2: {
    label: 'ND2 (2024 Entry)',
    cohort: 'ND2',
    year: '24',
    stream: '1',
    min: 1,
    max: 84,
    prefix: 'FPA/CS/24/1-'
  },
  ND1: {
    label: 'ND1 (2025 Entry)',
    cohort: 'ND1',
    year: '25',
    stream: '1',
    min: 1,
    max: 142,
    prefix: 'FPA/CS/25/1-'
  },
  // Backward compatibility aliases
  GROUP_1: {
    label: 'ND2 (2024 Entry)',
    cohort: 'ND2',
    year: '24',
    stream: '1',
    min: 1,
    max: 84,
    prefix: 'FPA/CS/24/1-'
  },
  GROUP_2: {
    label: 'ND1 (2025 Entry)',
    cohort: 'ND1',
    year: '25',
    stream: '1',
    min: 1,
    max: 142,
    prefix: 'FPA/CS/25/1-'
  }
};

/**
 * Standardizes a matric number by removing BOM, trimming, normalizing slashes and dashes,
 * and standardizing index padding to 4 digits.
 */
export function normalizeMatricNumber(matric) {
  if (!matric) return '';
  
  // 1. Remove BOM, non-breaking spaces, quotes, and whitespace
  let clean = String(matric)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toUpperCase();

  // Remove surrounding quotes if present
  clean = clean.replace(/^["']|["']$/g, '');

  // 2. Unify slashes and separators
  clean = clean
    .replace(/\\/g, '/')
    .replace(/\s*\/\s*/g, '/')
    .replace(/[\u2010-\u2015]/g, '-') // Convert en-dash, em-dash to standard hyphen
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '');

  // 3. Flexible pattern match: (FPA/CS or FPA-CS) / (24|25) / (stream) - (index)
  // e.g. FPA/CS/24/1-0001, FPA/CS/24/1-1, FPA-CS-24-1-0001, FPA/CS/25/1/0042
  const flexibleMatch = clean.match(/^(?:FPA[/-]CS)[/-](24|25)[/-]([0-9]+)[/-]([0-9]+)$/);
  if (flexibleMatch) {
    const year = flexibleMatch[1];
    const stream = flexibleMatch[2];
    const rawNum = parseInt(flexibleMatch[3], 10);
    const padded = String(rawNum).padStart(4, '0');
    return `FPA/CS/${year}/${stream}-${padded}`;
  }

  return clean;
}

/**
 * Returns the cohort level ('ND1' | 'ND2') for a matric number or null if unassigned
 */
export function getStudentCohort(rawMatric) {
  const matric = normalizeMatricNumber(rawMatric);
  if (matric.startsWith('FPA/CS/24/')) return 'ND2';
  if (matric.startsWith('FPA/CS/25/')) return 'ND1';
  return null;
}

/**
 * Validates whether a matric number belongs to valid ranges and formatting
 * @param {string} rawMatric
 * @returns {{ isValid: boolean, normalized: string, cohort?: string, group?: string, level?: string, year?: string, index?: number, error?: string }}
 */
export function validateMatricNumber(rawMatric) {
  const matric = normalizeMatricNumber(rawMatric);

  if (!matric) {
    return {
      isValid: false,
      normalized: '',
      error: 'Matriculation number is required.'
    };
  }

  // Regex pattern matching: FPA/CS/YY/STREAM-NNNN
  // Example: FPA/CS/24/1-0012 or FPA/CS/25/1-0110
  const regex = /^FPA\/CS\/(24|25)\/([0-9]+)-([0-9]{4})$/;
  const match = matric.match(regex);

  if (!match) {
    // If it doesn't match standard prefix
    if (!matric.startsWith('FPA/CS/')) {
      return {
        isValid: false,
        normalized: matric,
        error: 'Invalid institution or department prefix. Must begin with "FPA/CS/".'
      };
    }

    return {
      isValid: false,
      normalized: matric,
      error: 'Invalid matric format. Expected format: FPA/CS/YY/1-XXXX (e.g. FPA/CS/24/1-0042)'
    };
  }

  const [, year, stream, numStr] = match;
  const index = parseInt(numStr, 10);

  // ND2 Validation (2024 Entry)
  if (year === '24') {
    if (stream !== '1') {
      return {
        isValid: false,
        normalized: matric,
        error: `Stream ${stream} is not recognized for ND2 (2024 cohort). Expected stream 1.`
      };
    }
    if (index < MATRIC_RULES.ND2.min || index > MATRIC_RULES.ND2.max) {
      return {
        isValid: false,
        normalized: matric,
        error: `Matric index ${numStr} is outside the registered ND2 range (0001 - 0084).`
      };
    }
    return {
      isValid: true,
      normalized: matric,
      cohort: 'ND2',
      level: 'ND2',
      group: 'ND2',
      year: '24',
      index
    };
  }

  // ND1 Validation (2025 Entry)
  if (year === '25') {
    if (stream !== '1') {
      return {
        isValid: false,
        normalized: matric,
        error: `Stream ${stream} is not recognized for ND1 (2025 cohort). Expected stream 1.`
      };
    }
    if (index < MATRIC_RULES.ND1.min || index > MATRIC_RULES.ND1.max) {
      return {
        isValid: false,
        normalized: matric,
        error: `Matric index ${numStr} is outside the registered ND1 range (0001 - 0142).`
      };
    }
    return {
      isValid: true,
      normalized: matric,
      cohort: 'ND1',
      level: 'ND1',
      group: 'ND1',
      year: '25',
      index
    };
  }

  return {
    isValid: false,
    normalized: matric,
    error: 'Unrecognized matriculation cohort.'
  };
}
