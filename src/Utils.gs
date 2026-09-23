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
