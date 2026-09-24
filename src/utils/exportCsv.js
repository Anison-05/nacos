import Papa from 'papaparse';
import { getStudentCohort } from '../lib/matricValidator.js';

/**
 * Downloads data as a CSV file in the browser
 * @param {Array<Object>} data
 * @param {string} filename
 */
export function downloadCsv(data, filename = 'export.csv') {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generates and downloads standard CSV templates for student imports
 * @param {'MATRIC_NAME' | 'MATRIC_EMAIL' | 'COMPLETE'} type
 */
export function downloadStudentTemplate(type) {
  let sampleData = [];
  let filename = 'nacos_student_template.csv';

  switch (type) {
    case 'MATRIC_NAME':
      filename = 'nacos_template_matric_name.csv';
      sampleData = [
        { matric_number: 'FPA/CS/24/1-0001', full_name: 'ADEBAYO OLUWATOYIN BLESSING' },
        { matric_number: 'FPA/CS/24/1-0002', full_name: 'CHUKWU EMEKA DANIEL' },
        { matric_number: 'FPA/CS/25/1-0001', full_name: 'IBRAHIM FATIMA ZAHRA' },
        { matric_number: 'FPA/CS/25/1-0002', full_name: 'BELLO MUSA AHMAD' }
      ];
      break;

    case 'MATRIC_EMAIL':
      filename = 'nacos_template_matric_email.csv';
      sampleData = [
        { matric_number: 'FPA/CS/24/1-0001', email: 'adebayo.blessing@student.nacos.edu' },
        { matric_number: 'FPA/CS/24/1-0002', email: 'chukwu.daniel@student.nacos.edu' },
        { matric_number: 'FPA/CS/25/1-0001', email: 'ibrahim.fatima@student.nacos.edu' },
        { matric_number: 'FPA/CS/25/1-0002', email: 'bello.musa@student.nacos.edu' }
      ];
      break;

    case 'COMPLETE':
    default:
      filename = 'nacos_template_matric_name_email.csv';
      sampleData = [
        { matric_number: 'FPA/CS/24/1-0001', full_name: 'ADEBAYO OLUWATOYIN BLESSING', email: 'adebayo.blessing@student.nacos.edu' },
        { matric_number: 'FPA/CS/24/1-0002', full_name: 'CHUKWU EMEKA DANIEL', email: 'chukwu.daniel@student.nacos.edu' },
        { matric_number: 'FPA/CS/25/1-0001', full_name: 'IBRAHIM FATIMA ZAHRA', email: 'ibrahim.fatima@student.nacos.edu' },
        { matric_number: 'FPA/CS/25/1-0002', full_name: 'BELLO MUSA AHMAD', email: 'bello.musa@student.nacos.edu' }
      ];
      break;
  }

  downloadCsv(sampleData, filename);
}

/**
 * Exports students list in 3 customized formats
 * @param {Array<Object>} students
 * @param {'MATRIC_NAME' | 'MATRIC_EMAIL' | 'COMPLETE'} format
 */
export function exportStudentsCustom(students, format = 'COMPLETE') {
  if (!students || !students.length) {
    alert('No students to export.');
    return;
  }

  let exportData = [];
  let filename = 'nacos_students_export.csv';

  switch (format) {
    case 'MATRIC_NAME':
      filename = `nacos_students_matric_name_${new Date().toISOString().slice(0, 10)}.csv`;
      exportData = students.map((s) => ({
        'matric_number': s.matric_number,
        'full_name': s.full_name || '',
        'cohort': getStudentCohort(s.matric_number) || ''
      }));
      break;

    case 'MATRIC_EMAIL':
      filename = `nacos_students_matric_email_${new Date().toISOString().slice(0, 10)}.csv`;
      exportData = students.map((s) => ({
        'matric_number': s.matric_number,
        'email': s.email || '',
        'cohort': getStudentCohort(s.matric_number) || ''
      }));
      break;

    case 'COMPLETE':
    default:
      filename = `nacos_students_complete_roster_${new Date().toISOString().slice(0, 10)}.csv`;
      exportData = students.map((s) => ({
        'Matric Number': s.matric_number,
        'Full Name': s.full_name || 'N/A',
        'Email': s.email || 'N/A',
        'Cohort / Level': getStudentCohort(s.matric_number) || 'Unassigned',
        'Email Verified': s.email_verified ? 'YES' : 'NO',
        'Eligible': s.eligible_to_vote ? 'YES' : 'NO',
        'Has Voted': s.has_voted ? 'YES' : 'NO'
      }));
      break;
  }

  downloadCsv(exportData, filename);
}

/**
 * Flattens election results into tabular format for CSV export
 * @param {Object} resultsData - Result from get_election_results RPC
 * @returns {Array<Object>}
 */
export function formatElectionResultsForCsv(resultsData) {
  if (!resultsData || !resultsData.positions) return [];

  const rows = [];
  const electionTitle = resultsData.title || 'Election';
  const session = resultsData.session || '';

  resultsData.positions.forEach((position) => {
    if (!position.candidates || !position.candidates.length) {
      rows.push({
        'Election': electionTitle,
        'Academic Session': session,
        'Position': position.title,
        'Candidate Name': 'No Candidates',
        'Matric Number': 'N/A',
        'YES Votes': 0,
        'NO Votes': 0,
        'Total Votes': 0,
        'YES %': '0.00%',
        'NO %': '0.00%'
      });
      return;
    }

    position.candidates.forEach((cand) => {
      rows.push({
        'Election': electionTitle,
        'Academic Session': session,
        'Position': position.title,
        'Candidate Name': cand.full_name,
        'Matric Number': cand.matric_number,
        'YES Votes': cand.yes_votes || 0,
        'NO Votes': cand.no_votes || 0,
        'Total Votes': cand.total_votes || 0,
        'YES %': `${cand.yes_pct || 0}%`,
        'NO %': `${cand.no_pct || 0}%`
      });
    });
  });

  return rows;
}
