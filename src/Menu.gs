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
