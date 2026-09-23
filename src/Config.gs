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
