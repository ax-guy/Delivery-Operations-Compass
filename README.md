# DOC Prototype

DOC is a Tampermonkey-based prototype for a context-aware Delivery Operations Copilot.

## What this build does

- Detects Jira issue, Jira board/search, Tempo, Confluence, SharePoint, and Power BI page contexts.
- Adds an accessible floating DOC panel.
- Extracts common Jira issue fields from the current DOM.
- Supports Quick Scan and cancellable Deep Scan.
- Deep Scan can expand non-destructive collapsed controls, follow visible Next/Load More controls, and export captured table rows as JSON.
- Imports the Apollo capacity CSV from a local file picker.
- Normalizes common Apollo column names.
- Calculates three-week reference capacity using configurable rules.
- Shows person-level capacity utilization.
- Generates initial rule-based guidance for missing issue data, reference effort, workload risk, and capacity conflicts.
- Stores imported data and settings locally in the browser.

## Install

1. Install Tampermonkey in Chrome.
2. Open the Tampermonkey dashboard.
3. Create a new script.
4. Replace the template with the contents of `DOC.user.js`.
5. Save the script.
6. Open Jira or Tempo and activate the round **DOC** button.
7. Open **Settings** in DOC and import the capacity CSV.

## Important prototype boundaries

- DOM selectors are intentionally defensive but Jira and Tempo can change their markup.
- Deep Scan avoids controls whose visible label contains delete, remove, archive, close, submit, or save.
- No data is sent to a server.
- No credentials, cookies, or tokens are collected.
- DOC does not write to Jira in this version.
- Reference calculations are guidance, not commitments.

## Reference rules included

- Standard workday: 7 hours.
- Planning window: 3 weeks.
- Evaluation effort: 4.5 hours per page.
- Scoping: 10 hours.
- Triage and setup: 2 hours.
- Final review: 0.5 hours.
- Default validation effort: 0.25 hours per finding.

All rules are editable in the DOC Settings view and are stored locally.
