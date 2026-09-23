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
