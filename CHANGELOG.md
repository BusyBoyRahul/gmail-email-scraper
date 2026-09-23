# Changelog

## 2.0.0
- Settings tab: configure everything without editing code (checkboxes, dropdowns, descriptions)
- Scan sources selectable: From, To, Cc, Bcc, Reply-To, Subject, Body
- Ignore quoted replies in message bodies
- Filters: only/exclude domains, include/exclude keywords with /regex/, exact excludes,
  free providers, role accounts, own addresses, minimum message count
- Search options: newer-than, after/before dates, mailbox, include/exclude labels,
  skip category tabs, unread, starred, attachments, max threads
- Extra data: company from domain, signature phone numbers, Gmail labels, message link
- Update mode (new mail only) and daily auto-update
- Optional Gmail label on scanned threads, with skip-labelled mode
- Pause / Resume / Cancel / Status, search preview
- Domains summary tab, Run Log tab, CSV export to Drive, completion email
- Automatic retry on errors; waits out daily quota limits
- Modular source in src/ with single-file build in dist/

## 1.0.0
- Initial single-file scraper: headers + body, dedupe, counts, auto-resume
