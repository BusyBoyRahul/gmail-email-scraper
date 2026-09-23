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
