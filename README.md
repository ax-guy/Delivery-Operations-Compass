# DOC v0.7.1 Pagination Hotfix

- Selects the nearest forward Jira pagination target based on `startIndex`, `start`, or `page` rather than the first vaguely matching control.
- On page 2 (`51-100`), chooses the control whose target starts at `100` instead of reactivating the page-2 target at `50`.
- Prefers exact Next-page controls when target parameters are unavailable.
- Rejects previous, current-page, issue-row, issue-key, summary, assignee, and Actions controls.
- Adds before/after ranges and candidate-control labels to pagination warnings for diagnosis.
- Retains every v0.7.0 feature.
