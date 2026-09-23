/**
 * NACOS Matriculation Number Validation Utility
 *
 * Supported cohort ranges:
 * - Group 1: FPA/CS/24/1-0001 through FPA/CS/24/1-0084 (2024 Entry)
 * - Group 2: FPA/CS/25/1-0001 through FPA/CS/25/1-0142 (2025 Entry)
 *
 * General pattern: FPA/CS/YY/STREAM-INDEX
 */

export const MATRIC_RULES = {
  GROUP_1: {
    label: 'Group 1 (2024 Entry)',
    year: '24',
    stream: '1',
    min: 1,
    max: 84,
    prefix: 'FPA/CS/24/1-'
  },
  GROUP_2: {
    label: 'Group 2 (2025 Entry)',
    year: '25',
    stream: '1',
    min: 1,
    max: 142,
    prefix: 'FPA/CS/25/1-'
  }
};

/**
 * Standardizes a matric number by trimming whitespace and converting to uppercase
 */
export function normalizeMatricNumber(matric) {
  if (!matric) return '';
  return matric.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Validates whether a matric number belongs to valid ranges and formatting
 * @param {string} rawMatric
 * @returns {{ isValid: boolean, normalized: string, group?: string, index?: number, error?: string }}
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

  // Group 1 Validation (24 Entry)
  if (year === '24') {
    if (stream !== '1') {
      return {
        isValid: false,
        normalized: matric,
        error: `Stream ${stream} is not recognized for 2024 cohort. Expected stream 1.`
      };
    }
    if (index < MATRIC_RULES.GROUP_1.min || index > MATRIC_RULES.GROUP_1.max) {
      return {
        isValid: false,
        normalized: matric,
        error: `Matric index ${numStr} is outside the registered Group 1 range (0001 - 0084).`
      };
    }
    return {
      isValid: true,
      normalized: matric,
      group: 'GROUP_1',
      index
    };
  }

  // Group 2 Validation (25 Entry)
  if (year === '25') {
    if (stream !== '1') {
      return {
        isValid: false,
        normalized: matric,
        error: `Stream ${stream} is not recognized for 2025 cohort. Expected stream 1.`
      };
    }
    if (index < MATRIC_RULES.GROUP_2.min || index > MATRIC_RULES.GROUP_2.max) {
      return {
        isValid: false,
        normalized: matric,
        error: `Matric index ${numStr} is outside the registered Group 2 range (0001 - 0142).`
      };
    }
    return {
      isValid: true,
      normalized: matric,
      group: 'GROUP_2',
      index
    };
  }

  return {
    isValid: false,
    normalized: matric,
    error: 'Unrecognized matriculation cohort.'
  };
}
