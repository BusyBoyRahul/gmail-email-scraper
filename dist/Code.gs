/**
 * Gmail Email Scraper v2.0.0 — single-file build.
 * Generated from src/ by build.sh. Paste this whole file into Extensions → Apps Script.
 * See README.md for full usage.
 */

// ======================================================================
// Config.gs
// ======================================================================
/**
 * Config.gs — constants, lists and the Settings-tab definition.
 *
 * You normally change behaviour from the "Settings" tab in the spreadsheet,
 * not here. Edit this file only to change defaults or add new settings.
 */

const APP_NAME = 'Gmail Email Scraper';
const APP_VERSION = '2.0.0';
const MENU_NAME = '📧 Email Scraper';
const STATE_KEY = 'jobState';
const LAST_COMPLETED_KEY = 'lastCompletedAt';

const SHEETS = {
  SETTINGS: 'Settings',
  LOG: 'Run Log',
  DOMAINS: 'Domains'
};

const OUTPUT_HEADERS = [
  'Email', 'Name', 'Company', 'Domain', 'Count', 'First Seen', 'Last Seen',
  'Found In', 'Phones', 'Gmail Labels', 'Last Subject', 'Last Message Link'
];
const COL = OUTPUT_HEADERS.reduce(function (o, h, i) { o[h] = i; return o; }, {});

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const VALID_EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const PHONE_RE = /\+?\(?\d[\d ().\-]{8,18}\d/g;

const FREE_PROVIDERS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com',
  'rocketmail.com', 'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'zoho.com',
  'zohomail.com', 'yandex.com', 'gmx.com', 'gmx.net', 'mail.com', 'rediffmail.com',
  'fastmail.com', 'tutanota.com', 'hey.com', 'qq.com', '163.com'
];

const ROLE_ACCOUNTS = [
  'info', 'support', 'help', 'helpdesk', 'admin', 'administrator', 'sales', 'contact',
  'contactus', 'hello', 'team', 'office', 'billing', 'accounts', 'accounting', 'invoices',
  'finance', 'marketing', 'newsletter', 'news', 'webmaster', 'service', 'customerservice',
  'feedback', 'enquiries', 'inquiries', 'press', 'media', 'legal', 'privacy', 'security', 'abuse'
];

/**
 * Settings shown in the "Settings" tab.
 * type: text | bool | number | list | date
 */
const SETTINGS_DEF = [
  { section: '🔍 WHAT TO SCAN' },
  { key: 'searchQuery', label: 'Base Gmail search', type: 'text', def: '-in:spam -in:trash',
    help: 'Any Gmail search syntax, e.g. subject:(requirement OR hotlist). Combined with the options below. Test it with menu → Preview search.' },
  { key: 'newerThan', label: 'Newer than', type: 'list', options: ['7d', '30d', '3m', '6m', '1y', '2y', '5y'], def: '1y',
    help: 'Only mail newer than this. Clear the cell for no limit.' },
  { key: 'afterDate', label: 'After date', type: 'date', def: '',
    help: 'Only mail on/after this date (YYYY-MM-DD). Blank = no limit.' },
  { key: 'beforeDate', label: 'Before date', type: 'date', def: '',
    help: 'Only mail before this date (YYYY-MM-DD). Blank = no limit.' },
  { key: 'mailbox', label: 'Mailbox', type: 'list', options: ['All mail', 'Inbox only', 'Sent only', 'Exclude sent'], def: 'All mail',
    help: '"Sent only" = people you have written to.' },
  { key: 'includeLabels', label: 'Only these labels', type: 'text', def: '',
    help: 'Comma-separated Gmail labels. Threads with ANY of them are scanned. Blank = all.' },
  { key: 'excludeLabels', label: 'Skip these labels', type: 'text', def: '',
    help: 'Comma-separated Gmail labels to skip.' },
  { key: 'skipCategories', label: 'Skip Promotions / Social / Updates', type: 'bool', def: true,
    help: 'Ignore Gmail\'s Promotions, Social and Updates tabs (newsletters, notifications).' },
  { key: 'onlyUnread', label: 'Only unread', type: 'bool', def: false, help: '' },
  { key: 'onlyStarred', label: 'Only starred', type: 'bool', def: false, help: '' },
  { key: 'onlyAttachments', label: 'Only with attachments', type: 'bool', def: false,
    help: 'e.g. mails carrying resumes or documents.' },
  { key: 'maxThreads', label: 'Max threads', type: 'number', def: 0,
    help: 'Stop after this many threads. 0 = no limit. Use 100 for a quick test run.' },

  { section: '📨 WHERE TO LOOK FOR ADDRESSES' },
  { key: 'scanFrom', label: 'From', type: 'bool', def: true, help: 'Senders.' },
  { key: 'scanTo', label: 'To', type: 'bool', def: true, help: 'Recipients.' },
  { key: 'scanCc', label: 'Cc', type: 'bool', def: true, help: '' },
  { key: 'scanBcc', label: 'Bcc', type: 'bool', def: false, help: 'Bcc is only visible on mail you sent.' },
  { key: 'scanReplyTo', label: 'Reply-To', type: 'bool', def: true, help: '' },
  { key: 'scanBody', label: 'Message body', type: 'bool', def: true,
    help: 'Addresses written inside the email: signatures, forwarded text, "contact me at …".' },
  { key: 'scanSubject', label: 'Subject line', type: 'bool', def: false, help: '' },
  { key: 'skipQuoted', label: 'Ignore quoted replies in body', type: 'bool', def: true,
    help: 'Skip older quoted replies (lines starting with ">" and "On … wrote:" blocks). Forwarded content is kept.' },

  { section: '✅ INCLUDE / ❌ EXCLUDE' },
  { key: 'onlyDomains', label: 'Only these domains', type: 'text', def: '',
    help: 'Keep ONLY addresses at these domains (comma-separated, subdomains included). Blank = all.' },
  { key: 'excludeDomains', label: 'Exclude domains', type: 'text',
    def: 'google.com, googlemail.com, facebookmail.com, linkedin.com, amazonses.com, sendgrid.net, mailchimp.com, mcsv.net, mandrillapp.com, hubspotemail.net',
    help: 'Drop addresses at these domains (subdomains included).' },
  { key: 'includeKeywords', label: 'Only addresses containing', type: 'text', def: '',
    help: 'Keep only addresses containing ANY of these words, e.g. recruit, talent, hr. /regex/ allowed. Blank = all.' },
  { key: 'excludeKeywords', label: 'Exclude addresses containing', type: 'text',
    def: 'noreply, no-reply, donotreply, do-not-reply, mailer-daemon, postmaster, bounce, notification, unsubscribe, newsletter',
    help: 'Drop addresses containing ANY of these words. /regex/ allowed.' },
  { key: 'excludeEmails', label: 'Exclude specific emails', type: 'text', def: '',
    help: 'Exact addresses to always skip (comma-separated).' },
  { key: 'excludeMyAddresses', label: 'Exclude my own addresses', type: 'bool', def: true,
    help: 'Your Gmail address and send-as aliases.' },
  { key: 'excludeFreeProviders', label: 'Exclude free email providers', type: 'bool', def: false,
    help: 'Drop gmail.com, yahoo.com, outlook.com, hotmail.com … (keep company addresses only).' },
  { key: 'excludeRoleAccounts', label: 'Exclude role accounts', type: 'bool', def: false,
    help: 'Drop info@, support@, sales@, admin@, billing@ … (hr@ / careers@ / jobs@ are kept).' },
  { key: 'minCount', label: 'Minimum messages', type: 'number', def: 1,
    help: 'Show only addresses seen in at least this many messages. Others are kept but hidden by the sheet filter.' },

  { section: '📊 EXTRA DATA' },
  { key: 'extractPhones', label: 'Extract phone numbers', type: 'bool', def: false,
    help: 'Pull phone numbers from the sender\'s signature (last lines of their own text).' },
  { key: 'recordLabels', label: 'Record Gmail labels', type: 'bool', def: false,
    help: 'Store the labels of each contact\'s threads (a bit slower).' },
  { key: 'includeLink', label: 'Link to latest message', type: 'bool', def: true,
    help: 'Clickable Gmail link to the latest message for each contact.' },

  { section: '⚙️ OUTPUT & BEHAVIOUR' },
  { key: 'outputSheet', label: 'Output tab name', type: 'text', def: 'Emails', help: '' },
  { key: 'sortBy', label: 'Sort results by', type: 'list',
    options: ['Count', 'Last Seen', 'First Seen', 'Email', 'Domain', 'Name'], def: 'Count', help: '' },
  { key: 'buildDomainSummary', label: 'Build domain summary', type: 'bool', def: true,
    help: 'Refresh the "Domains" tab (contacts per company) when a scrape finishes.' },
  { key: 'markProcessed', label: 'Label scanned threads in Gmail', type: 'bool', def: false,
    help: 'Adds a Gmail label to every scanned thread. Nothing else in Gmail is changed.' },
  { key: 'processedLabel', label: 'Label name', type: 'text', def: 'Scraped', help: 'Created if it does not exist.' },
  { key: 'skipProcessed', label: 'Skip already-labelled threads', type: 'bool', def: false,
    help: 'Skip threads that already have the label above (needs "Label scanned threads" ON).' },
  { key: 'notifyWhenDone', label: 'Email me when done', type: 'bool', def: false,
    help: 'Sends a short summary to your own address when a scrape finishes.' },
  { key: 'autoUpdateHour', label: 'Daily auto-update hour (0-23)', type: 'number', def: 6,
    help: 'Used when you turn on menu → Enable daily auto-update.' },
  { key: 'threadsPerBatch', label: 'Threads per batch', type: 'number', def: 50,
    help: '1-500. Lower it if you hit time-out errors.' },
  { key: 'maxRuntimeMin', label: 'Minutes per run', type: 'number', def: 4,
    help: '1-5. Google stops scripts at 6 minutes; the scraper pauses and auto-resumes before that.' }
];

const SETTINGS_BY_KEY = SETTINGS_DEF.reduce(function (o, d) { if (d.key) o[d.key] = d; return o; }, {});

// ======================================================================
// Utils.gs
// ======================================================================
/**
 * Utils.gs — small shared helpers.
 */

function tz_() {
  try { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); } catch (e) { return Session.getScriptTimeZone(); }
}

function toast_(msg, secs) {
  console.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, APP_NAME, secs || 8); } catch (e) { /* no UI (trigger) */ }
}

function ui_() {
  try { return SpreadsheetApp.getUi(); } catch (e) { return null; }
}

function alert_(title, msg) {
  const ui = ui_();
  if (ui) ui.alert(title, msg, ui.ButtonSet.OK); else console.log(title + ': ' + msg);
}

function confirm_(title, msg) {
  const ui = ui_();
  if (!ui) return true;
  return ui.alert(title, msg, ui.ButtonSet.YES_NO) === ui.Button.YES;
}

function showHtml_(title, html, height) {
  const ui = ui_();
  if (!ui) return;
  const out = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5">' + html + '</div>'
  ).setWidth(520).setHeight(height || 220);
  ui.showModalDialog(out, title);
}

/** Prevent values starting with = + - @ from being read as formulas. */
function safe_(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function clamp_(n, lo, hi) {
  n = Number(n);
  if (isNaN(n)) n = lo;
  return Math.min(hi, Math.max(lo, n));
}

function splitList_(str) {
  return String(str == null ? '' : str).split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
}

/** Date or "YYYY-MM-DD" → "YYYY/MM/DD" for Gmail search. */
function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy/MM/dd');
  return String(v).trim().replace(/-/g, '/');
}

function fmtStamp_(ms) {
  return Utilities.formatDate(new Date(Number(ms)), tz_(), 'yyyy-MM-dd HH:mm');
}

function esc_(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function deleteTriggers_(handler) {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === handler; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

function hasTrigger_(handler) {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === handler; });
}

// ======================================================================
// Settings.gs
// ======================================================================
/**
 * Settings.gs — creates, reads and resets the "Settings" tab.
 */

function ensureSettingsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.SETTINGS, 0);
    writeSettings_(sh);
    return sh;
  }
  // After upgrading the script, add any settings that are new.
  const last = sh.getLastRow();
  const keys = last ? sh.getRange(1, 4, last, 1).getValues().map(function (r) { return r[0]; }) : [];
  const missing = SETTINGS_DEF.filter(function (d) { return d.key && keys.indexOf(d.key) === -1; });
  if (missing.length) appendSettingRows_(sh, missing, last + 1);
  return sh;
}

function writeSettings_(sh) {
  sh.clear();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  sh.getRange(1, 1, 1, 4).setValues([['Setting', 'Value', 'What it does', 'key']])
    .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  appendSettingRows_(sh, SETTINGS_DEF, 2);
  sh.setColumnWidth(1, 250);
  sh.setColumnWidth(2, 330);
  sh.setColumnWidth(3, 560);
  sh.getRange('B:C').setWrap(true);
  sh.getRange('A:C').setVerticalAlignment('middle');
  sh.hideColumns(4);
}

function appendSettingRows_(sh, defs, startRow) {
  let row = startRow;
  defs.forEach(function (d) {
    if (!d.key) {
      sh.getRange(row, 1, 1, 3).setValues([[d.section, '', '']])
        .setFontWeight('bold').setBackground('#e8f0fe');
      row++;
      return;
    }
    sh.getRange(row, 1).setValue(d.label);
    sh.getRange(row, 3).setValue(d.help || '').setFontColor('#5f6368');
    sh.getRange(row, 4).setValue(d.key);
    const cell = sh.getRange(row, 2);
    switch (d.type) {
      case 'bool':
        cell.insertCheckboxes();
        cell.setValue(d.def === true);
        break;
      case 'list':
        cell.setDataValidation(SpreadsheetApp.newDataValidation()
          .requireValueInList(d.options, true).setAllowInvalid(false).build());
        cell.setValue(d.def);
        break;
      case 'date':
        cell.setNumberFormat('yyyy-mm-dd');
        cell.setDataValidation(SpreadsheetApp.newDataValidation()
          .requireDate().setAllowInvalid(false).setHelpText('Enter a date like 2026-01-31').build());
        if (d.def) cell.setValue(d.def);
        break;
      case 'number':
        cell.setNumberFormat('0');
        cell.setValue(d.def);
        break;
      default:
        cell.setNumberFormat('@'); // plain text, so "-in:spam" is not treated as a formula
        cell.setValue(d.def);
    }
    row++;
  });
}

function readSettings_() {
  const sh = ensureSettingsSheet_();
  const s = {};
  SETTINGS_DEF.forEach(function (d) { if (d.key) s[d.key] = d.def; });

  const last = sh.getLastRow();
  if (last > 0) {
    sh.getRange(1, 1, last, 4).getValues().forEach(function (r) {
      const d = SETTINGS_BY_KEY[r[3]];
      if (d) s[d.key] = coerce_(r[1], d);
    });
  }

  s.threadsPerBatch = Math.floor(clamp_(s.threadsPerBatch, 1, 500));
  s.maxRuntimeMin = clamp_(s.maxRuntimeMin, 1, 5);
  s.minCount = Math.max(1, Math.floor(Number(s.minCount) || 1));
  s.maxThreads = Math.max(0, Math.floor(Number(s.maxThreads) || 0));
  s.autoUpdateHour = Math.floor(clamp_(s.autoUpdateHour, 0, 23));
  s.outputSheet = s.outputSheet || 'Emails';
  return s;
}

function coerce_(v, d) {
  switch (d.type) {
    case 'bool':
      return v === true || String(v).toLowerCase() === 'true';
    case 'number': {
      const n = Number(v);
      return (v === '' || v === null || isNaN(n)) ? d.def : n;
    }
    case 'date':
      return v instanceof Date ? v : (String(v == null ? '' : v).trim());
    default:
      return String(v == null ? '' : v).trim();
  }
}

// ======================================================================
// Filters.gs
// ======================================================================
/**
 * Filters.gs — Gmail query builder, include/exclude rules and text parsing.
 */

/** Turns the Settings into one Gmail search string. */
function buildQuery_(s, sinceMs) {
  const q = [];
  if (s.searchQuery) q.push(s.searchQuery);
  if (s.newerThan) q.push('newer_than:' + s.newerThan);
  if (s.afterDate) q.push('after:' + fmtDate_(s.afterDate));
  if (s.beforeDate) q.push('before:' + fmtDate_(s.beforeDate));
  if (sinceMs) q.push('after:' + Math.floor(sinceMs / 1000));

  switch (s.mailbox) {
    case 'Inbox only': q.push('in:inbox'); break;
    case 'Sent only': q.push('in:sent'); break;
    case 'Exclude sent': q.push('-in:sent'); break;
  }

  const inc = splitList_(s.includeLabels).map(labelTerm_);
  if (inc.length === 1) q.push('label:' + inc[0]);
  else if (inc.length > 1) q.push('{' + inc.map(function (l) { return 'label:' + l; }).join(' ') + '}');
  splitList_(s.excludeLabels).map(labelTerm_).forEach(function (l) { q.push('-label:' + l); });

  if (s.skipCategories) q.push('-category:promotions -category:social -category:updates');
  if (s.onlyUnread) q.push('is:unread');
  if (s.onlyStarred) q.push('is:starred');
  if (s.onlyAttachments) q.push('has:attachment');
  if (s.markProcessed && s.skipProcessed && s.processedLabel) q.push('-label:' + labelTerm_(s.processedLabel));

  return q.join(' ').replace(/\s+/g, ' ').trim();
}

/** Gmail search uses dashes for spaces and slashes in label names. */
function labelTerm_(name) {
  return String(name).trim().toLowerCase().replace(/[\s\/]+/g, '-');
}

function compileFilters_(s) {
  const own = new Set();
  if (s.excludeMyAddresses) {
    try { own.add(String(Session.getEffectiveUser().getEmail()).toLowerCase()); } catch (e) {}
    try { GmailApp.getAliases().forEach(function (a) { own.add(a.toLowerCase()); }); } catch (e) {}
  }
  const domains = function (str) {
    return splitList_(str).map(function (d) { return d.toLowerCase().replace(/^@/, ''); });
  };
  return {
    own: own,
    excludeEmails: new Set(splitList_(s.excludeEmails).map(function (e) { return e.toLowerCase(); })),
    onlyDomains: domains(s.onlyDomains),
    excludeDomains: domains(s.excludeDomains),
    includeKw: toMatchers_(s.includeKeywords),
    excludeKw: toMatchers_(s.excludeKeywords),
    freeProviders: !!s.excludeFreeProviders,
    roleAccounts: !!s.excludeRoleAccounts
  };
}

/** Keyword list → matcher functions. "/pattern/flags" entries are regular expressions. */
function toMatchers_(str) {
  return splitList_(str).map(function (k) {
    const m = k.match(/^\/(.+)\/([imsuy]*)$/);
    if (m) {
      try {
        const re = new RegExp(m[1], m[2]);
        return function (e) { return re.test(e); };
      } catch (err) { /* fall through to plain text */ }
    }
    const low = k.toLowerCase();
    return function (e) { return e.indexOf(low) !== -1; };
  });
}

function domainIn_(domain, list) {
  return list.some(function (d) { return domain === d || domain.endsWith('.' + d); });
}

/** True if the address should be kept. */
function passes_(email, f) {
  if (!VALID_EMAIL_RE.test(email)) return false;
  if (/\.(png|jpe?g|gif|webp|bmp)@/i.test(email)) return false; // inline-image content IDs
  if (f.own.has(email) || f.excludeEmails.has(email)) return false;

  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (f.onlyDomains.length && !domainIn_(domain, f.onlyDomains)) return false;
  if (domainIn_(domain, f.excludeDomains)) return false;
  if (f.freeProviders && FREE_PROVIDERS.indexOf(domain) !== -1) return false;
  if (f.roleAccounts && ROLE_ACCOUNTS.indexOf(local) !== -1) return false;
  if (f.excludeKw.some(function (m) { return m(email); })) return false;
  if (f.includeKw.length && !f.includeKw.some(function (m) { return m(email); })) return false;
  return true;
}

/** Parses headers like: a@b.com, "Doe, John" <j@x.com>, Jane <jane@y.com> */
function parseAddressList_(str) {
  const out = [];
  if (!str) return out;
  const seen = new Set();
  const named = /(?:"([^"]*)"|([^",<>]*))\s*<([^<>\s]+@[^<>\s]+)>/g;
  let m;
  while ((m = named.exec(str)) !== null) {
    const email = m[3].toLowerCase();
    if (!seen.has(email)) {
      seen.add(email);
      out.push({ email: email, name: (m[1] || m[2] || '').trim() });
    }
  }
  (String(str).match(EMAIL_RE) || []).forEach(function (e) {
    e = e.toLowerCase();
    if (!seen.has(e)) { seen.add(e); out.push({ email: e, name: '' }); }
  });
  return out;
}

function findEmails_(text) {
  const seen = new Set();
  const out = [];
  (String(text || '').match(EMAIL_RE) || []).forEach(function (e) {
    e = e.toLowerCase();
    if (!seen.has(e)) { seen.add(e); out.push({ email: e, name: '' }); }
  });
  return out;
}

/**
 * Returns only the author's own text: drops ">" quoted lines and cuts at
 * "On … wrote:" / "-----Original Message-----" / Outlook "From:+Sent:" reply headers.
 * Forwarded messages keep their content.
 */
function stripQuoted_(body, isForward) {
  const lines = String(body || '').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const next = lines[i + 1] || '';
    if (/^\s*>/.test(l)) continue;
    if (/^\s*On\s.+/i.test(l) && /wrote:\s*$/i.test(l + ' ' + next)) break;
    if (/^\s*-{2,}\s*Original Message\s*-{2,}/i.test(l)) break;
    if (!isForward && /^\s*From:\s/i.test(l) && /^\s*Sent:\s/i.test(next)) break;
    out.push(l);
  }
  return out.join('\n');
}

/** Phone numbers from the last lines (signature area) of the author's text. */
function extractPhones_(text) {
  const tail = String(text || '').split('\n').slice(-25).join('\n');
  const out = [];
  const seen = new Set();
  (tail.match(PHONE_RE) || []).forEach(function (p) {
    const digits = p.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return;
    if (/^(\d)\1+$/.test(digits) || seen.has(digits)) return;
    seen.add(digits);
    out.push(p.trim());
  });
  return out;
}

/** "acme-corp.co.in" → "Acme-corp". Blank for free providers. */
function companyFromDomain_(domain) {
  if (FREE_PROVIDERS.indexOf(domain) !== -1) return '';
  const parts = domain.split('.');
  let core = parts[parts.length - 2] || '';
  if (parts.length >= 3 && /^(co|com|net|org|ac|gov|edu)$/.test(core)) core = parts[parts.length - 3];
  return core ? core.charAt(0).toUpperCase() + core.slice(1) : '';
}

function cleanName_(name) {
  const n = String(name || '').replace(/^['"\s]+|['"\s]+$/g, '').replace(/\s+/g, ' ');
  return (!n || n.indexOf('@') !== -1) ? '' : n;
}

// ======================================================================
// Output.gs
// ======================================================================
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

// ======================================================================
// Scraper.gs
// ======================================================================
/**
 * Scraper.gs — the scraping engine: job state, batching, auto-resume, extraction.
 */

// ---------------- job state ----------------

function loadState_() {
  const v = PropertiesService.getScriptProperties().getProperty(STATE_KEY);
  return v ? JSON.parse(v) : null;
}

function saveState_(st) {
  PropertiesService.getScriptProperties().setProperty(STATE_KEY, JSON.stringify(st));
}

function clearState_() {
  PropertiesService.getScriptProperties().deleteProperty(STATE_KEY);
}

/** mode: "fresh" (clear + full scan) or "update" (only mail since last completed scrape). */
function startJob_(mode) {
  const s = readSettings_();
  const props = PropertiesService.getScriptProperties();
  let sinceMs = null;
  if (mode === 'update') {
    sinceMs = Number(props.getProperty(LAST_COMPLETED_KEY)) || null;
    if (!sinceMs) mode = 'fresh';
  }

  deleteTriggers_('runBatch');
  const out = getOutputSheet_(s);
  if (mode === 'fresh') resetOutputSheet_(out);

  const state = {
    mode: mode,
    query: buildQuery_(s, sinceMs),
    sinceMs: sinceMs,
    offset: 0,
    threads: 0,
    messages: 0,
    errors: 0,
    paused: false,
    startedAt: Date.now(),
    startCount: countRecords_(out)
  };
  saveState_(state);
  toast_('🚀 ' + (mode === 'fresh' ? 'Fresh scrape' : 'Update') + ' started. Query: ' + (state.query || '(all mail)'));
  runBatch();
}

// ---------------- batch runner (also the trigger handler) ----------------

function runBatch() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return; // another chunk is already running
  let state = null;
  try {
    state = loadState_();
    if (!state) { toast_('No scrape in progress. Use "Start fresh scrape" or "Update".'); return; }
    deleteTriggers_('runBatch');
    runChunk_(state);
  } catch (err) {
    handleError_(err);
  } finally {
    lock.releaseLock();
  }
}

function runChunk_(state) {
  const s = readSettings_();
  const t0 = Date.now();
  const budget = s.maxRuntimeMin * 60 * 1000;
  const out = getOutputSheet_(s);
  const map = loadRecords_(out);
  const filters = compileFilters_(s);
  const labelMode = !!(s.markProcessed && s.processedLabel);
  const skipMode = labelMode && s.skipProcessed;
  const toLabel = [];

  let offset = state.offset;
  let threadsDone = state.threads;
  let messagesDone = state.messages;
  let done = false;

  while (Date.now() - t0 < budget) {
    let size = s.threadsPerBatch;
    if (s.maxThreads) {
      const left = s.maxThreads - threadsDone;
      if (left <= 0) { done = true; break; }
      size = Math.min(size, left);
    }

    const threads = GmailApp.search(state.query, offset, size);
    if (!threads.length) { done = true; break; }
    const messages = GmailApp.getMessagesForThreads(threads);

    threads.forEach(function (thread, i) {
      const labels = s.recordLabels ? thread.getLabels().map(function (l) { return l.getName(); }) : [];
      messages[i].forEach(function (msg) {
        if (state.sinceMs && msg.getDate().getTime() < state.sinceMs) return; // already counted last time
        processMessage_(msg, map, s, filters, labels);
        messagesDone++;
      });
      if (labelMode) toLabel.push(thread);
    });

    offset += threads.length;
    threadsDone += threads.length;
  }

  // Save results first, then progress — so a crash never double-counts.
  saveRecords_(out, map, s);

  const latest = loadState_();
  if (!latest) { // cancelled while this chunk was running
    if (toLabel.length) applyLabel_(s.processedLabel, toLabel);
    toast_('⏹ Scrape cancelled. Results so far are kept.');
    return;
  }
  state.offset = offset;
  state.threads = threadsDone;
  state.messages = messagesDone;
  state.errors = 0;
  state.paused = !!latest.paused;
  saveState_(state);

  if (toLabel.length) {
    applyLabel_(s.processedLabel, toLabel);
    if (skipMode) { state.offset = 0; saveState_(state); } // labelled threads drop out of the search
  }

  const total = Object.keys(map).length;
  if (done) {
    finishJob_(state, map, s);
  } else if (state.paused) {
    toast_('⏸ Paused after ' + threadsDone + ' threads (' + total + ' emails). Use Resume to continue.');
  } else {
    ScriptApp.newTrigger('runBatch').timeBased().after(60 * 1000).create();
    toast_('⏳ ' + threadsDone + ' threads / ' + messagesDone + ' messages scanned, ' + total +
      ' emails so far. Continuing automatically in ~1 min…');
  }
}

function finishJob_(state, map, s) {
  PropertiesService.getScriptProperties().setProperty(LAST_COMPLETED_KEY, String(state.startedAt));
  clearState_();

  const total = Object.keys(map).length;
  const added = Math.max(0, total - (state.startCount || 0));
  if (s.buildDomainSummary) buildDomainSummary_(map);
  logRun_(state, total, added, 'Completed');

  const msg = 'Done ✅ ' + state.threads + ' threads, ' + state.messages + ' messages → ' +
    total + ' unique emails (' + added + ' new).';
  toast_(msg, 20);

  if (s.notifyWhenDone) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), APP_NAME + ': scrape finished',
        msg + '\n\nQuery: ' + (state.query || '(all mail)') + '\n\nOpen: ' + SpreadsheetApp.getActive().getUrl());
    } catch (e) { console.error('Notify failed: ' + e); }
  }
}

function handleError_(err) {
  const msg = (err && err.message) || String(err);
  console.error(err && err.stack ? err.stack : msg);
  const st = loadState_();
  if (!st) { toast_('❌ Error: ' + msg, 20); return; }

  // Daily quota: wait a few hours rather than hammering.
  if (/too many times|quota|limit exceeded/i.test(msg)) {
    ScriptApp.newTrigger('runBatch').timeBased().after(3 * 60 * 60 * 1000).create();
    toast_('⚠️ Google daily limit reached. Will resume automatically in ~3 hours.', 20);
    return;
  }

  st.errors = (st.errors || 0) + 1;
  if (st.errors <= 5) {
    saveState_(st);
    ScriptApp.newTrigger('runBatch').timeBased().after(10 * 60 * 1000).create();
    toast_('⚠️ Error (' + st.errors + '/5): ' + msg + ' — retrying in 10 min.', 20);
  } else {
    st.errors = 0;
    saveState_(st);
    logRun_(st, '', '', 'Stopped: ' + msg);
    toast_('❌ Stopped after repeated errors: ' + msg + '. Fix the cause, then use Resume.', 30);
  }
}

// ---------------- extraction ----------------

function processMessage_(msg, map, s, f, labels) {
  const date = msg.getDate();
  const subject = msg.getSubject() || '';
  const ctx = {
    date: date,
    subject: subject,
    link: s.includeLink ? 'https://mail.google.com/mail/u/0/#all/' + msg.getId() : '',
    labels: labels,
    seen: new Set() // count each address once per message
  };
  const add = function (list, src) {
    list.forEach(function (a) { upsert_(map, a.email, a.name, src, ctx, f); });
  };

  let fromList = null;
  const getFrom = function () { if (!fromList) fromList = parseAddressList_(msg.getFrom()); return fromList; };

  if (s.scanFrom) add(getFrom(), 'From');
  if (s.scanTo) add(parseAddressList_(msg.getTo()), 'To');
  if (s.scanCc) add(parseAddressList_(msg.getCc()), 'Cc');
  if (s.scanBcc) add(parseAddressList_(msg.getBcc()), 'Bcc');
  if (s.scanReplyTo) add(parseAddressList_(msg.getReplyTo()), 'Reply-To');
  if (s.scanSubject) add(findEmails_(subject), 'Subject');

  if (s.scanBody || s.extractPhones) {
    const raw = msg.getPlainBody() || '';
    const ownText = stripQuoted_(raw, /^\s*(fw|fwd)\s*:/i.test(subject));
    if (s.scanBody) add(findEmails_(s.skipQuoted ? ownText : raw), 'Body');
    if (s.extractPhones) {
      const phones = extractPhones_(ownText);
      const sender = getFrom()[0];
      if (phones.length && sender && map[sender.email]) addPhones_(map[sender.email], phones);
    }
  }
}

function upsert_(map, email, name, src, ctx, f) {
  email = String(email || '').toLowerCase().trim().replace(/^[.'"]+|[.'"]+$/g, '');
  if (!passes_(email, f)) return;

  let r = map[email];
  if (!r) {
    const domain = email.split('@')[1];
    r = map[email] = {
      email: email, name: '', domain: domain, company: companyFromDomain_(domain),
      count: 0, first: ctx.date, last: ctx.date,
      sources: new Set(), phones: new Set(), labels: new Set(), subject: '', link: ''
    };
  }
  if (!r.name) { const n = cleanName_(name); if (n) r.name = n; }
  if (!ctx.seen.has(email)) { r.count++; ctx.seen.add(email); }
  if (ctx.date < r.first) r.first = ctx.date;
  if (ctx.date >= r.last) {
    r.last = ctx.date;
    r.subject = ctx.subject;
    if (ctx.link) r.link = ctx.link;
  }
  r.sources.add(src);
  ctx.labels.forEach(function (l) { r.labels.add(l); });
}

function addPhones_(r, phones) {
  const have = new Set(Array.from(r.phones).map(function (p) { return p.replace(/\D/g, ''); }));
  phones.forEach(function (p) {
    const d = p.replace(/\D/g, '');
    if (r.phones.size < 3 && !have.has(d)) { r.phones.add(p); have.add(d); }
  });
}

function applyLabel_(name, threads) {
  const label = GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
  for (let i = 0; i < threads.length; i += 100) {
    label.addToThreads(threads.slice(i, i + 100));
  }
}

/** Trigger handler for the daily auto-update. */
function scheduledUpdate() {
  if (loadState_()) return; // a scrape is still running
  startJob_('update');
}

// ======================================================================
// Menu.gs
// ======================================================================
/**
 * Menu.gs — the "📧 Email Scraper" menu and its actions.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu(MENU_NAME)
    .addItem('▶️ Start fresh scrape', 'startFresh')
    .addItem('🔄 Update (new mail only)', 'startUpdate')
    .addSeparator()
    .addItem('⏸ Pause', 'pauseScrape')
    .addItem('⏯ Resume', 'resumeScrape')
    .addItem('⏹ Cancel current scrape', 'cancelScrape')
    .addItem('📈 Status', 'showStatus')
    .addSeparator()
    .addItem('⚙️ Open settings', 'openSettings')
    .addItem('🔍 Preview search (test settings)', 'previewQuery')
    .addItem('♻️ Reset settings to defaults', 'resetSettings')
    .addSeparator()
    .addItem('📤 Export CSV to Google Drive', 'exportCsv')
    .addItem('🌐 Rebuild domain summary', 'rebuildDomainSummary')
    .addSeparator()
    .addItem('⏰ Enable daily auto-update', 'enableDailyUpdate')
    .addItem('🚫 Disable daily auto-update', 'disableDailyUpdate')
    .addItem('ℹ️ About', 'showAbout')
    .addToUi();
}

function startFresh() {
  const s = readSettings_();
  const out = getOutputSheet_(s);
  if (loadState_() && !confirm_('Scrape in progress', 'A scrape is already running. Cancel it and start over?')) return;
  if (countRecords_(out) > 0 && !confirm_('Start fresh scrape?',
    'This clears the "' + out.getName() + '" tab and rescans Gmail using your Settings.\n\n' +
    'Tip: use "Update (new mail only)" to keep existing results and add only new mail.')) return;
  startJob_('fresh');
}

function startUpdate() {
  if (loadState_()) { alert_('Busy', 'A scrape is already in progress. Use Status, Resume or Cancel.'); return; }
  if (!PropertiesService.getScriptProperties().getProperty(LAST_COMPLETED_KEY) &&
      !confirm_('No previous scrape', 'No completed scrape found yet, so this will run a full scrape. Continue?')) return;
  startJob_('update');
}

function pauseScrape() {
  const st = loadState_();
  if (!st) { toast_('Nothing is running.'); return; }
  st.paused = true;
  saveState_(st);
  deleteTriggers_('runBatch');
  toast_('⏸ Paused (a chunk already running will finish first). Use Resume to continue.');
}

function resumeScrape() {
  const st = loadState_();
  if (!st) { alert_('Nothing to resume', 'No scrape in progress. Use "Start fresh scrape" or "Update".'); return; }
  st.paused = false;
  st.errors = 0;
  saveState_(st);
  toast_('⏯ Resuming…');
  runBatch();
}

function cancelScrape() {
  if (!loadState_()) { toast_('Nothing is running.'); return; }
  if (!confirm_('Cancel scrape?', 'Stops the current scrape. Results collected so far stay in the sheet.')) return;
  deleteTriggers_('runBatch');
  clearState_();
  toast_('⏹ Cancelled.');
}

function showStatus() {
  const st = loadState_();
  const s = readSettings_();
  const last = PropertiesService.getScriptProperties().getProperty(LAST_COMPLETED_KEY);
  const lines = [];

  if (st) {
    const status = st.paused ? '⏸ Paused' : (hasTrigger_('runBatch') ? '⏳ Running (next chunk scheduled)' : '⚠️ Idle — use Resume');
    lines.push('<b>Current scrape:</b> ' + status);
    lines.push('Mode: ' + esc_(st.mode) + ' · started ' + fmtStamp_(st.startedAt));
    lines.push('Threads scanned: ' + st.threads + ' · messages: ' + st.messages);
    lines.push('Query: <code>' + esc_(st.query || '(all mail)') + '</code>');
  } else {
    lines.push('<b>No scrape in progress.</b>');
  }
  lines.push('');
  lines.push('Emails in "' + esc_(s.outputSheet) + '": ' + countRecords_(getOutputSheet_(s)));
  lines.push('Last completed scrape: ' + (last ? fmtStamp_(last) : 'never'));
  lines.push('Daily auto-update: ' + (hasTrigger_('scheduledUpdate') ? 'ON (around ' + s.autoUpdateHour + ':00)' : 'OFF'));
  showHtml_('Scraper status', lines.join('<br>'), 260);
}

function openSettings() {
  ensureSettingsSheet_().activate();
  toast_('Change values in column B. Changes apply to the next run.');
}

function previewQuery() {
  const s = readSettings_();
  const q = buildQuery_(s, null);
  const n = GmailApp.search(q, 0, 500).length;
  const url = 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(q);
  showHtml_('Search preview',
    '<p>Gmail search built from your Settings:</p>' +
    '<p><code style="background:#f1f3f4;padding:4px 6px;display:block;word-break:break-all">' +
    esc_(q || '(all mail)') + '</code></p>' +
    '<p>Matching threads: <b>' + (n >= 500 ? '500+' : n) + '</b></p>' +
    '<p><a href="' + url + '" target="_blank">Open this search in Gmail</a></p>' +
    '<p style="color:#5f6368">Address filters (domains, keywords, etc.) are applied after the search.</p>', 280);
}

function resetSettings() {
  if (!confirm_('Reset settings?', 'All values in the Settings tab go back to defaults.')) return;
  writeSettings_(ensureSettingsSheet_());
  toast_('♻️ Settings reset to defaults.');
}

function enableDailyUpdate() {
  const s = readSettings_();
  deleteTriggers_('scheduledUpdate');
  ScriptApp.newTrigger('scheduledUpdate').timeBased().everyDays(1).atHour(s.autoUpdateHour).create();
  alert_('Daily auto-update ON',
    'Every day around ' + s.autoUpdateHour + ':00 new mail will be scanned and added to your results.\n\n' +
    'Change the hour in Settings, then choose this menu item again.');
}

function disableDailyUpdate() {
  deleteTriggers_('scheduledUpdate');
  toast_('🚫 Daily auto-update OFF.');
}

function showAbout() {
  showHtml_(APP_NAME,
    '<p><b>' + APP_NAME + '</b> v' + APP_VERSION + '</p>' +
    '<p>Extracts email addresses from your own Gmail into this sheet. Runs entirely inside your Google account; ' +
    'no data is sent anywhere else.</p>' +
    '<p>Start with <b>⚙️ Open settings</b>, check with <b>🔍 Preview search</b>, then <b>▶️ Start fresh scrape</b>.</p>', 200);
}
