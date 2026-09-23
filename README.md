# 📧 Gmail Email Scraper

Extract every email address from your Gmail into a Google Sheet. The output is deduplicated and includes names, companies, phone numbers, counts and dates. Everything is controlled from a **Settings tab**, so you never need to edit code.

It runs as a Google Apps Script inside **your own Google account**. Nothing is sent to any third-party server, and there are no API keys, OAuth apps or hosting to set up.

---

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Installation](#installation)
  - [Option A: Copy-paste (2 minutes)](#option-a-copy-paste-2-minutes)
  - [Option B: clasp (for developers)](#option-b-clasp-for-developers)
- [First run & permissions](#first-run--permissions)
- [Using the scraper](#using-the-scraper)
- [Menu reference](#menu-reference)
- [Settings reference](#settings-reference)
- [Output tabs](#output-tabs)
- [Recipes](#recipes)
- [Automation & incremental updates](#automation--incremental-updates)
- [Limits & quotas](#limits--quotas)
- [Troubleshooting](#troubleshooting)
- [Privacy, safety & compliance](#privacy-safety--compliance)
- [Uninstall](#uninstall)
- [Project structure](#project-structure)
- [License](#license)

---

## Features

**Choose what to scan**
- Any Gmail search query (`subject:`, `from:`, `has:attachment`, …)
- Date range: *newer than* (7d … 5y) and/or exact after/before dates
- Mailbox: all mail, inbox only, sent only, or exclude sent
- Include or skip specific Gmail labels
- Skip the Promotions / Social / Updates tabs
- Only unread, only starred, only with attachments
- A max-threads limit for quick test runs

**Choose where to look**
- From, To, Cc, Bcc, Reply-To, subject line and message body (signatures, forwarded text)
- Optionally ignore quoted older replies, which cuts duplicates and noise

**Include / exclude filters**
- Keep only certain domains, or exclude domains (subdomains included)
- Include or exclude by keyword, with `/regex/` support
- Exclude specific addresses, your own addresses and aliases, free providers (gmail, yahoo, outlook, …) and role accounts (info@, support@, …)
- Minimum message count (low-count rows are hidden, not deleted)

**Extra data**
- Contact name, company (derived from the domain) and domain
- Phone numbers from the sender's signature
- Gmail labels per contact
- Clickable link to the latest message
- First seen / last seen / message count / where the address was found

**Operation**
- Handles mailboxes of any size: works in batches and auto-resumes past Google's 6-minute limit
- Pause, resume, cancel and a status panel
- **Update mode** scans only new mail and merges it into existing results
- Daily auto-update on a schedule
- Optionally labels scanned threads in Gmail and skips them next time
- Domain summary tab (contacts per company)
- CSV export to Google Drive
- Run log and optional "done" email notification
- Manual edits you make to Name/Company are preserved across updates

---

## How it works

```
Settings tab ──► Gmail search query ──► threads in batches of N
                                          │
             From / To / Cc / Bcc / Reply-To / Subject / Body
                                          │
                     include / exclude filters
                                          │
              merge into "Emails" tab (dedupe, count, dates)
                                          │
        time nearly up? ──► save progress, resume in 1 min automatically
```

---

## Installation

### Option A: Copy-paste (2 minutes)

1. Go to [sheets.new](https://sheets.new) to create a new Google Sheet, and give it a name (e.g. *Email Scraper*).
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code in `Code.gs`.
4. Open [`dist/Code.gs`](dist/Code.gs) from this repo, copy **all** of it, and paste it in.
5. Click **💾 Save** (Ctrl/Cmd + S).
6. *(Recommended)* Go to **⚙️ Project Settings → Time zone** and set your time zone.
7. Go back to the sheet tab and **reload the page**. After a few seconds a **📧 Email Scraper** menu appears next to *Help*.

> The script must be created from inside the sheet (**Extensions → Apps Script**). A standalone project made at script.google.com will not show the menu.

### Option B: clasp (for developers)

```bash
npm install -g @google/clasp
clasp login

# Create a sheet-bound project (or use an existing script ID)
clasp create --type sheets --title "Email Scraper" --rootDir src

# or: cp .clasp.json.example .clasp.json   and fill in your scriptId

clasp push
clasp open    # opens the script editor
```

The source is split into modules in `src/`. After changing them, run `./build.sh` to regenerate the single-file `dist/Code.gs`.

---

## First run & permissions

1. In the sheet: **📧 Email Scraper → ⚙️ Open settings**. This creates the **Settings** tab.
2. Google asks you to authorize the script:
   - Click **Continue** and pick your Google account.
   - You'll see *"Google hasn't verified this app"*. This is normal for your own scripts. Click **Advanced → Go to Email Scraper (unsafe)**.
   - Click **Allow**.

Why each permission is needed:

| Permission | Used for |
|---|---|
| Gmail | Reading messages; adding a label only if you turn on *Label scanned threads* |
| Google Sheets | Writing results into this spreadsheet |
| Google Drive | *Export CSV* only |
| Send email as you | *Email me when done* only (sent to yourself) |
| Run when you're not present | Auto-resume and the daily update (time-based triggers) |

---

## Using the scraper

1. **Configure:** open the **Settings** tab and change values in column **B**. Every row has a description in column C.
2. **Test:** choose **🔍 Preview search**. It shows the exact Gmail query, how many threads match, and a link to open the same search in Gmail.
3. **Quick trial:** set **Max threads** to `100` and run **▶️ Start fresh scrape**. Check the results.
4. **Full run:** set **Max threads** back to `0` and run **▶️ Start fresh scrape** again.
5. **Watch progress:** toasts appear at the bottom-right of the sheet. **📈 Status** shows details anytime. You can close the sheet; it keeps running in the background.
6. **Later:** use **🔄 Update (new mail only)**, or turn on **⏰ Enable daily auto-update**.

---

## Menu reference

| Menu item | What it does |
|---|---|
| ▶️ Start fresh scrape | Clears the output tab and scans Gmail from scratch using the current Settings. |
| 🔄 Update (new mail only) | Scans only mail received since the last completed scrape and merges it into existing results. |
| ⏸ Pause | Stops auto-resume. A chunk that is already running finishes first. |
| ⏯ Resume | Continues a paused or stopped scrape from where it left off. |
| ⏹ Cancel current scrape | Abandons the current job. Results collected so far stay. |
| 📈 Status | Progress, last completed run, auto-update state. |
| ⚙️ Open settings | Opens (and creates, if needed) the Settings tab. |
| 🔍 Preview search | Shows the Gmail query built from Settings, the matching thread count and a Gmail link. |
| ♻️ Reset settings to defaults | Restores every setting to its default value. |
| 📤 Export CSV to Google Drive | Saves the results (respecting *Minimum messages*) as a CSV in your Drive. |
| 🌐 Rebuild domain summary | Regenerates the Domains tab from the current results. |
| ⏰ Enable daily auto-update | Runs *Update* every day at the hour set in Settings. |
| 🚫 Disable daily auto-update | Turns the daily schedule off. |
| ℹ️ About | Version info. |

---

## Settings reference

Settings live in the **Settings** tab. Checkboxes are on/off; dropdowns offer fixed choices. Lists are **comma-separated**. Changes apply to the next run or chunk.

### 🔍 What to scan

| Setting | Default | Description |
|---|---|---|
| Base Gmail search | `-in:spam -in:trash` | Any [Gmail search syntax](https://support.google.com/mail/answer/7190). Combined with everything below. |
| Newer than | `1y` | 7d, 30d, 3m, 6m, 1y, 2y, 5y. Clear the cell for no limit. |
| After date | *(blank)* | Only mail on/after this date. |
| Before date | *(blank)* | Only mail before this date. |
| Mailbox | All mail | All mail / Inbox only / Sent only / Exclude sent. |
| Only these labels | *(blank)* | Threads with **any** of these labels. |
| Skip these labels | *(blank)* | Threads with these labels are ignored. |
| Skip Promotions / Social / Updates | ✅ | Ignores Gmail's category tabs. |
| Only unread | ☐ | |
| Only starred | ☐ | |
| Only with attachments | ☐ | Useful for resumes and documents. |
| Max threads | `0` | Stop after N threads (0 = no limit). |

### 📨 Where to look for addresses

| Setting | Default | Description |
|---|---|---|
| From | ✅ | Senders |
| To | ✅ | Recipients |
| Cc | ✅ | |
| Bcc | ☐ | Only visible on mail you sent |
| Reply-To | ✅ | |
| Message body | ✅ | Signatures, forwarded text, "contact me at …" |
| Subject line | ☐ | |
| Ignore quoted replies in body | ✅ | Skips `>` quoted lines and "On … wrote:" blocks. Forwarded content is kept. |

### ✅ Include / ❌ Exclude

| Setting | Default | Description |
|---|---|---|
| Only these domains | *(blank)* | Keep **only** these domains (subdomains included). |
| Exclude domains | google.com, linkedin.com, sendgrid.net, … | Drop these domains (subdomains included). |
| Only addresses containing | *(blank)* | Keep addresses containing **any** keyword. `/regex/` allowed. |
| Exclude addresses containing | noreply, no-reply, bounce, notification, … | Drop addresses containing any keyword. `/regex/` allowed. |
| Exclude specific emails | *(blank)* | Exact addresses to skip. |
| Exclude my own addresses | ✅ | Your address and send-as aliases. |
| Exclude free email providers | ☐ | gmail.com, yahoo.com, outlook.com, hotmail.com, … |
| Exclude role accounts | ☐ | info@, support@, sales@, admin@, billing@ … (hr@, careers@, jobs@ are kept). |
| Minimum messages | `1` | Hide addresses seen in fewer messages. Rows are hidden by the sheet filter, not deleted. |

**Keyword rules:** matching is case-insensitive and checks the whole address. `recruit` matches `jrecruiter@acme.com`. Wrap a value in slashes for a regular expression: `/^(hr|talent)[.@]/`. Don't use commas inside a regex, because commas separate list items.

### 📊 Extra data

| Setting | Default | Description |
|---|---|---|
| Extract phone numbers | ☐ | Phone numbers from the last ~25 lines of the sender's own text (the signature). Up to 3 per contact. |
| Record Gmail labels | ☐ | Stores each contact's thread labels (slightly slower). |
| Link to latest message | ✅ | Gmail link to the most recent message for each contact. |

### ⚙️ Output & behaviour

| Setting | Default | Description |
|---|---|---|
| Output tab name | `Emails` | Tab that receives the results. |
| Sort results by | Count | Count / Last Seen / First Seen / Email / Domain / Name |
| Build domain summary | ✅ | Refresh the Domains tab at the end of each scrape. |
| Label scanned threads in Gmail | ☐ | Adds a label to each scanned thread. Nothing else in Gmail is changed. |
| Label name | `Scraped` | Created automatically if missing. |
| Skip already-labelled threads | ☐ | Skip threads with that label (requires the option above). |
| Email me when done | ☐ | Summary email to yourself. |
| Daily auto-update hour | `6` | 0–23, in the script's time zone. |
| Threads per batch | `50` | 1–500. Lower it if you see timeouts. |
| Minutes per run | `4` | 1–5. The scraper pauses before Google's 6-minute cut-off and resumes automatically. |

> After upgrading the script to a new version, any new settings are appended automatically to the bottom of your existing Settings tab.

---

## Output tabs

### Emails (the main results)

| Column | Description |
|---|---|
| Email | Lower-cased, unique |
| Name | Display name from the email headers (first one found; you can edit it) |
| Company | Guessed from the domain (`acme-corp.co.in` → `Acme-corp`); blank for free providers; editable |
| Domain | |
| Count | Number of messages the address appeared in |
| First Seen / Last Seen | Dates of first and latest message |
| Found In | From, To, Cc, Bcc, Reply-To, Subject, Body |
| Phones | Signature phone numbers (if enabled) |
| Gmail Labels | Thread labels (if enabled) |
| Last Subject | Subject of the latest message |
| Last Message Link | Opens that message in Gmail |

The table has filter buttons on each header, so you can sort and filter directly in Sheets.

### Domains

One row per domain: company, number of contacts, total messages, last seen, and top contact. This is useful for seeing which companies you deal with most.

### Run Log

One row per completed (or stopped) run: start/finish time, mode, threads, messages, unique emails, new emails, status and the query used.

---

## Recipes

Set these in the Settings tab (only the changed values are listed).

**Vendor / recruiter contacts from job requirement emails**
- Base Gmail search: `-in:spam -in:trash subject:(requirement OR "job opening" OR hotlist OR "urgent need" OR C2C)`
- Newer than: `6m`
- Message body: ✅, Extract phone numbers: ✅
- Exclude free email providers: ✅ *(optional)*

**Everyone at specific client companies**
- Only these domains: `clientone.com, clienttwo.com`
- Newer than: *(blank)*

**People you've actually written to**
- Mailbox: `Sent only`
- To ✅, Cc ✅, Bcc ✅, From ☐, Message body ☐

**Company addresses only, no generic inboxes**
- Exclude free email providers: ✅
- Exclude role accounts: ✅

**Recruiters / HR people only**
- Only addresses containing: `recruit, talent, hr, hiring, careers, /^ta[.@]/`

**Resumes received**
- Only with attachments: ✅
- Base Gmail search: `-in:spam -in:trash filename:(pdf OR docx) (resume OR cv)`
- Mailbox: `Inbox only`, From ✅ (others ☐)

**One label only**
- Only these labels: `Vendors`

**Frequent contacts only**
- Minimum messages: `3`

**Process each thread once, forever**
- Label scanned threads in Gmail: ✅
- Skip already-labelled threads: ✅
- Then use *Start fresh scrape* once and *Update* afterwards, or keep running fresh scrapes on new labels.

---

## Automation & incremental updates

- **Update (new mail only)** remembers when the last *completed* scrape started, adds `after:<that time>` to the search, and ignores older messages inside returned threads. Existing rows keep their counts and are merged with the new data.
- **Daily auto-update** runs *Update* every day around the configured hour. Turn it on from the menu. If you change the hour, choose *Enable daily auto-update* again.
- If a scrape is still running when the daily update fires, the update is skipped that day.
- If you ran a test with **Max threads** set, that run still counts as "completed". Run a full *Start fresh scrape* before relying on *Update*.

---

## Limits & quotas

Google enforces limits on Apps Script ([official quotas](https://developers.google.com/apps-script/guides/services/quotas)). The main ones:

| Limit | Free Gmail | Google Workspace |
|---|---|---|
| Max time per execution | 6 min | 6 min |
| Total trigger runtime per day | ~90 min | ~6 h |
| Gmail read operations per day | ~20,000 | ~50,000 |

What this means in practice:
- Very large mailboxes (tens of thousands of threads) may take **several days** on a free account. The scraper waits and continues automatically.
- If a daily limit is hit, the scraper pauses about 3 hours and then resumes on its own.
- To go faster: narrow the search (dates, labels, skip categories) and turn off options you don't need (*Record Gmail labels*, *Message body*).

---

## Troubleshooting

**The 📧 Email Scraper menu doesn't appear**
1. Save the script (💾), then reload the **sheet** page and wait 5–10 seconds.
2. Make sure the script was created from the sheet via **Extensions → Apps Script**, not at script.google.com.
3. In the Apps Script editor, select `onOpen` in the function dropdown and click **▶ Run**. Approve permissions, then check the sheet again.

**"Authorization required" / "This app isn't verified"**
Click **Advanced → Go to … (unsafe) → Allow**. It's your own script running in your own account.

**"Exceeded maximum execution time"**
Lower **Threads per batch** (e.g. 25) and/or **Minutes per run** (e.g. 3), then **⏯ Resume**.

**"Service invoked too many times for one day: gmail"**
You've hit the daily Gmail quota. The scraper retries automatically in ~3 hours. You can also narrow the search.

**Status says "Idle — use Resume"**
The auto-resume trigger was removed (for example after repeated errors). Choose **⏯ Resume**. The **Run Log** tab and **Extensions → Apps Script → Executions** show the error details.

**Fewer emails than expected**
- Check **🔍 Preview search**. Is the query too narrow (Newer than, Skip categories, labels)?
- Check the filters: *Exclude domains*, *Exclude addresses containing*, *free providers*, *role accounts*.
- *Minimum messages* above 1 hides rows. Clear the filter on the Count column to see them.

**Junk addresses (image IDs, tracking addresses)**
Add the domain to *Exclude domains* or a keyword to *Exclude addresses containing*, then run **Start fresh scrape**.

**Dates or the daily schedule are in the wrong time zone**
Apps Script → **⚙️ Project Settings → Time zone**, and **File → Settings → Time zone** in the sheet.

**Message links open the wrong account**
Links use `/mail/u/0/`, your first signed-in Google account. If you use several accounts, change `u/0` to your account's index in the URL.

---

## Privacy, safety & compliance

- The script runs **only inside your Google account**. No data leaves Google, and there are no external servers or analytics.
- It **never deletes, sends or modifies emails**. The only Gmail change it can make is adding a label, and only if you enable it.
- Only you (and anyone you share the spreadsheet with) can see the results. The script project is shared together with the sheet, so be careful who you share it with.
- **Before emailing scraped contacts in bulk**, follow the laws that apply to you, such as CAN-SPAM (US), GDPR (EU/UK), CASL (Canada) and India's DPDP Act. Typical requirements are a lawful basis or consent, clear sender identification and a working unsubscribe option.

---

## Uninstall

1. **Menu → 🚫 Disable daily auto-update** and **⏹ Cancel current scrape**.
2. Apps Script → **⏰ Triggers** (left sidebar). Delete any remaining triggers.
3. Revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) → *Email Scraper* → **Remove access**.
4. Delete the spreadsheet if you no longer need the data.
5. *(Optional)* Remove the `Scraped` label in Gmail if you used it.

---

## Project structure

```
gmail-email-scraper/
├── dist/
│   └── Code.gs            # Single-file build — paste this into Apps Script
├── src/                   # Modular source (used with clasp)
│   ├── Config.gs          # Constants, provider lists, Settings definitions
│   ├── Utils.gs           # Shared helpers
│   ├── Settings.gs        # Settings tab: create / read / reset
│   ├── Filters.gs         # Query builder, include/exclude rules, parsing
│   ├── Output.gs          # Results tab, Domains tab, CSV export, run log
│   ├── Scraper.gs         # Engine: batching, auto-resume, extraction
│   ├── Menu.gs            # Spreadsheet menu and actions
│   └── appsscript.json    # Apps Script manifest
├── build.sh               # Rebuilds dist/Code.gs from src/
├── .clasp.json.example
├── CHANGELOG.md
├── LICENSE
└── README.md
```

### Adding a new setting

1. Add an entry to `SETTINGS_DEF` in `src/Config.gs` (`key`, `label`, `type`, `def`, `help`).
2. Read it as `s.yourKey` wherever it's needed (`buildQuery_` for search options, `passes_` for filters, `processMessage_` for extraction).
3. Run `./build.sh`. Existing users get the new row appended to their Settings tab automatically.

---

## Contributing

Issues and pull requests are welcome. Please edit files in `src/`, run `./build.sh`, and commit both `src/` and `dist/Code.gs`.

## License

[MIT](LICENSE)
