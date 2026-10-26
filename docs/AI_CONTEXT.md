# DOC AI Context

## Mission

Delivery Operations Copilot is an operational intelligence layer for employees, managers, coordinators, and Delivery leadership. It should help users understand work, capacity, commitments, risk, sourcing options, missing information, and recommended next actions.

## Source interpretation

The existing spreadsheets, HTML tools, reports, and process documents are reference implementations and knowledge sources. DOC should extract their useful logic but should not reproduce their limitations or visual structure.

## Known reference artifacts

- `Apollo Manual Testing Capacity v2.xlsx` and its CSV export: current person-level capacity, evaluation, validation, VPAT, SME, FTO, holiday, and availability data.
- `2025 Core Services Level of Effort Calculator.xlsx`: complexity, onshore, VPAT, page-count, scoping, testing, review, and schedule assumptions.
- `lava.html` and related LAVA assets: validation workflow assistance, structured output, progress, and repetitive-task reduction.
- Delivery timeline and SLO guidance: delivery targets, dependencies, pauses, and client-specific exceptions.
- Due Dates for Service Requests: due dates as target delivery commitments.
- Work Sourcing and Capacity Management Process: forward planning, work allocation, and sourcing considerations.
- Downloaded Jira, Tempo, SharePoint, Power BI, and Confluence HTML: DOM fixtures for page detection and extraction development.

## Build principles

1. Separate collection, normalization, rules, recommendations, and UI.
2. Keep every business rule configurable and traceable.
3. Treat each recommendation as guidance with source data, rule ID, confidence, and explanation.
4. Prefer passive inspection before active crawling.
5. Require explicit user action for deep scans and all writes.
6. Never collect credentials, cookies, tokens, or hidden secrets.
7. Preserve keyboard, screen-reader, zoom, contrast, and reduced-motion support.
8. Model operational concepts, not spreadsheet coordinates.
