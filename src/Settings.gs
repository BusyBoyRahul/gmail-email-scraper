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
