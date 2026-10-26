# DOC v0.8.1

- Adds Kanban page detection and scanning.
- Expands all collapsed Jira swimlanes before collecting cards.
- Attempts to set Jira's Assignee filter to only the person selected for Personal view.
- Reads card key, summary, assignee, parent, due date, visible board status, and issue type.
- Adds Kanban card records to the multi-dashboard store without replacing other dashboard data.
- Personal view combines parent requests and subtasks across all latest dashboard sources.
- Personal workload calculates estimated hours and labels work On track, At risk, or Unplanned.
- Missing subtask due dates inherit a known parent due date when available.
- Preserves all existing scanning, roster, capacity, history, export, and operational-reporting features.
