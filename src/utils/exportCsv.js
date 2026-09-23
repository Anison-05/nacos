import Papa from 'papaparse';

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
    // IE 10+
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
