/**
 * Output.gs — reading/writing the results tab, domain summary, CSV export, run log.
 */

function getOutputSheet_(s) {
  const ss = SpreadsheetApp.getActive();
  const name = (s && s.outputSheet) || 'Emails';
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    writeHeaders_(sh);
  }
  return sh;
}

function writeHeaders_(sh) {
  sh.getRange(1, 1, 1, OUTPUT_HEADERS.length).setValues([OUTPUT_HEADERS])
    .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidth(COL['Email'] + 1, 260);
  sh.setColumnWidth(COL['Name'] + 1, 180);
  sh.setColumnWidth(COL['Last Subject'] + 1, 320);
}

function resetOutputSheet_(sh) {
  const f = sh.getFilter();
  if (f) f.remove();
  sh.clear();
  writeHeaders_(sh);
}

function countRecords_(sh) {
  return Math.max(0, sh.getLastRow() - 1);
}

function toDate_(v) {
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/** Loads the results tab into { email: record }. Manual edits to Name/Company are kept. */
function loadRecords_(sh) {
  const map = {};
  const last = sh.getLastRow();
  if (last < 2) return map;
  const toSet = function (v, sep) {
    return new Set(String(v || '').split(sep).map(function (x) { return x.trim(); }).filter(Boolean));
  };
  sh.getRange(2, 1, last - 1, OUTPUT_HEADERS.length).getValues().forEach(function (r) {
    const email = String(r[COL['Email']] || '').toLowerCase().trim();
    if (!email) return;
    map[email] = {
      email: email,
      name: String(r[COL['Name']] || ''),
      company: String(r[COL['Company']] || ''),
      domain: String(r[COL['Domain']] || email.split('@')[1]),
      count: Number(r[COL['Count']]) || 0,
      first: toDate_(r[COL['First Seen']]),
      last: toDate_(r[COL['Last Seen']]),
      sources: toSet(r[COL['Found In']], ','),
      phones: toSet(r[COL['Phones']], '|'),
      labels: toSet(r[COL['Gmail Labels']], '|'),
      subject: String(r[COL['Last Subject']] || ''),
      link: String(r[COL['Last Message Link']] || '')
    };
  });
  return map;
}

function sortRecords_(recs, by) {
  const cmp = {
    'Count': function (a, b) { return b.count - a.count || b.last - a.last; },
    'Last Seen': function (a, b) { return b.last - a.last; },
    'First Seen': function (a, b) { return a.first - b.first; },
    'Email': function (a, b) { return a.email.localeCompare(b.email); },
    'Domain': function (a, b) { return a.domain.localeCompare(b.domain) || b.count - a.count; },
    'Name': function (a, b) { return (a.name || '\uffff').localeCompare(b.name || '\uffff'); }
  };
  recs.sort(cmp[by] || cmp['Count']);
}

function saveRecords_(sh, map, s) {
  const recs = Object.keys(map).map(function (k) { return map[k]; });
  sortRecords_(recs, s.sortBy);
  const rows = recs.map(function (r) {
    return [
      safe_(r.email), safe_(r.name), safe_(r.company), r.domain, r.count, r.first, r.last,
      Array.from(r.sources).join(', '), safe_(Array.from(r.phones).join(' | ')),
      safe_(Array.from(r.labels).join(' | ')), safe_(r.subject), r.link
    ];
  });

  const f = sh.getFilter();
  if (f) f.remove();
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, OUTPUT_HEADERS.length).clearContent();
  writeHeaders_(sh);
  if (!rows.length) return;

  sh.getRange(2, 1, rows.length, OUTPUT_HEADERS.length).setValues(rows);
  sh.getRange(2, COL['First Seen'] + 1, rows.length, 2).setNumberFormat('yyyy-mm-dd');

  // Filter on the whole table; "Minimum messages" hides low-count rows without deleting them.
  const filter = sh.getRange(1, 1, rows.length + 1, OUTPUT_HEADERS.length).createFilter();
  if (s.minCount > 1) {
    filter.setColumnFilterCriteria(COL['Count'] + 1,
      SpreadsheetApp.newFilterCriteria().whenNumberGreaterThanOrEqualTo(s.minCount).build());
  }
}

function buildDomainSummary_(map) {
  const agg = {};
  Object.keys(map).forEach(function (k) {
    const r = map[k];
    const a = agg[r.domain] || (agg[r.domain] = {
      domain: r.domain, company: r.company, contacts: 0, messages: 0, last: r.last, top: r
    });
    a.contacts++;
    a.messages += r.count;
    if (r.last > a.last) a.last = r.last;
    if (r.count > a.top.count) a.top = r;
    if (!a.company && r.company) a.company = r.company;
  });

  const rows = Object.keys(agg).map(function (k) { return agg[k]; })
    .sort(function (a, b) { return b.contacts - a.contacts || b.messages - a.messages; })
    .map(function (a) {
      return [a.domain, safe_(a.company), a.contacts, a.messages, a.last, safe_(a.top.email), safe_(a.top.name)];
    });

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.DOMAINS) || ss.insertSheet(SHEETS.DOMAINS);
  const f = sh.getFilter();
  if (f) f.remove();
  sh.clear();
  const headers = ['Domain', 'Company', 'Contacts', 'Total Messages', 'Last Seen', 'Top Contact', 'Top Contact Name'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sh.getRange(2, 5, rows.length, 1).setNumberFormat('yyyy-mm-dd');
    sh.getRange(1, 1, rows.length + 1, headers.length).createFilter();
  }
}

/** Menu: rebuild the Domains tab from the current results. */
function rebuildDomainSummary() {
  const s = readSettings_();
  const map = loadRecords_(getOutputSheet_(s));
  buildDomainSummary_(map);
  toast_('🌐 Domain summary rebuilt (' + Object.keys(map).length + ' emails).');
}

/** Menu: save the results (respecting "Minimum messages") as a CSV in Google Drive. */
function exportCsv() {
  const s = readSettings_();
  const sh = getOutputSheet_(s);
  const last = sh.getLastRow();
  if (last < 2) { alert_('Nothing to export', 'Run a scrape first.'); return; }

  const vals = sh.getRange(1, 1, last, OUTPUT_HEADERS.length).getDisplayValues();
  const rows = [vals[0]].concat(vals.slice(1).filter(function (r) {
    return Number(r[COL['Count']]) >= s.minCount;
  }));
  const csv = rows.map(function (r) { return r.map(csvCell_).join(','); }).join('\r\n');
  const name = 'gmail-emails-' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd_HHmm') + '.csv';
  const file = DriveApp.createFile(name, csv, MimeType.CSV);

  showHtml_('CSV exported',
    '<p>' + (rows.length - 1) + ' emails saved to your Google Drive as <b>' + esc_(name) + '</b>.</p>' +
    '<p><a href="' + file.getUrl() + '" target="_blank">Open the file</a></p>', 160);
}

function csvCell_(v) {
  v = String(v);
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function logRun_(state, total, added, status) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.LOG);
  const headers = ['Started', 'Finished', 'Mode', 'Threads', 'Messages', 'Unique Emails', 'New Emails', 'Status', 'Query'];
  if (!sh) {
    sh = ss.insertSheet(SHEETS.LOG);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    new Date(state.startedAt), new Date(), state.mode, state.threads, state.messages,
    total, added, safe_(status), safe_(state.query || '(all mail)')
  ]);
}
