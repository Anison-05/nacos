import { validateMatricNumber, normalizeMatricNumber } from './src/lib/matricValidator.js';

console.log('Testing NACOS Matriculation Validator...');

const tests = [
  // Group 1
  { input: 'FPA/CS/24/1-0001', expectedValid: true, expectedGroup: 'GROUP_1' },
  { input: 'fpa/cs/24/1-0042', expectedValid: true, expectedGroup: 'GROUP_1' },
  { input: 'FPA/CS/24/1-0084', expectedValid: true, expectedGroup: 'GROUP_1' },
  { input: 'FPA/CS/24/1-0085', expectedValid: false, desc: 'Group 1 upper bound exceeded' },
  { input: 'FPA/CS/24/1-0000', expectedValid: false, desc: 'Zero index invalid' },
  { input: 'FPA/CS/24/2-0001', expectedValid: false, desc: 'Stream 2 not in cohort' },

  // Group 2
  { input: 'FPA/CS/25/1-0001', expectedValid: true, expectedGroup: 'GROUP_2' },
  { input: 'FPA/CS/25/1-0100', expectedValid: true, expectedGroup: 'GROUP_2' },
  { input: 'FPA/CS/25/1-0142', expectedValid: true, expectedGroup: 'GROUP_2' },
  { input: 'FPA/CS/25/1-0143', expectedValid: false, desc: 'Group 2 upper bound exceeded' },

  // Non-CS or malformed
  { input: 'FPA/BA/24/1-0001', expectedValid: false, desc: 'Wrong department' },
  { input: 'INVALID_MATRIC', expectedValid: false, desc: 'Garbage input' },
  { input: '', expectedValid: false, desc: 'Empty input' },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const res = validateMatricNumber(t.input);
  if (res.isValid === t.expectedValid && (!t.expectedGroup || res.group === t.expectedGroup)) {
    console.log(`✅ PASS: "${t.input}" -> isValid: ${res.isValid}${res.group ? ` (${res.group})` : ''}`);
    passed++;
  } else {
    console.error(`❌ FAIL: "${t.input}" -> Expected isValid: ${t.expectedValid}, Got: ${res.isValid}. Error: ${res.error}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests.`);
if (failed > 0) process.exit(1);
