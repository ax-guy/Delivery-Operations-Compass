# DOC v0.5.3

## Pagination fix
- Recognizes Jira AUI pagination anchors and buttons using accessible names, `rel="next"`, pagination classes, and paging query parameters.
- Still excludes issue links, row actions, summaries, issue keys, and assignee links.
- Activates the Next control within the current dashboard gadget only.
- Waits for either the displayed range or table contents to change.
- Handles Jira replacing the entire table element after pagination.
- Waits for loading indicators to clear and the new rows to stabilize.
- Confirms the range/page advanced before scanning the next page.
- Reports a section-specific error when Next was activated but new rows did not load.
