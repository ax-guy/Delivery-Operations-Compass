# DOC v0.9.0

## TDD Calculator integration
- Embeds the full service list, ATTC, buffer, Full Manual Evaluation page math, Validation findings adjustment, holiday/weekend skipping, date copying, and delivery-message copying from the existing TDD Calculator.
- Suggests the Jira Created date as the calculator start date when found; otherwise uses today.
- Adds a full accessible TDD dialog available from the DOC header.

## Missing Jira due date
- Detects CORE issue pages.
- Checks whether a due date exists.
- Highlights a missing due-date area.
- Shows an accessible toggletip with suggested delivery date, Close, Expand, and Accept Date controls.
- Accept Date opens Jira's due-date editor, enters the ISO date, and attempts to save.

All existing DOC scanning, dashboard, roster, capacity, history, and Kanban functions are retained from the attached source.
