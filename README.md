# DOC Prototype v0.3.1

## Fixes in this build
- Apollo Health scans every visible table and uses the **Assignee** column in each table.
- Overdue is calculated from the data rows in the **Overdue tickets** table.
- Dashboard name comes from the page-level heading instead of the first gadget heading.
- Detected assignees not already in the roster appear under **Suggested people found** with **Add to team** controls.
- Active-tab colors now use a high-contrast foreground/background pair in light and dark modes.
- DOC launcher moved upward to align better with Rovo.
- Scan History includes **Delete scan** and removes both the history entry and saved snapshot.
- All DOC component rules are scoped beneath `#doc-root`.
- Scan highlighting no longer adds positioning or pseudo-content to Jira tables, preventing layout changes.
