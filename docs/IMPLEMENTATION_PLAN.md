# Prototype Implementation Plan

## Implemented in 0.1

- Page context detection
- Floating accessible panel
- Jira issue field extraction
- Quick and deep page scanning
- CSV capacity import
- Capacity normalization
- Configurable rule storage
- Initial recommendations
- Exportable scan JSON

## Next build targets

1. Add page-specific adapters using saved HTML fixtures.
2. Add a field-mapping inspector so users can identify missing selectors without editing code.
3. Import Jira issue-list CSV/JSON and normalize demand.
4. Calculate daily and weekly capacity windows instead of one three-week aggregate.
5. Add due-date feasibility using business days, region holidays, FTO, dependencies, and existing commitments.
6. Add sourcing suggestions with transparent filters. Do not rank employees or infer performance.
7. Add validation and test-plan workflow modules.
8. Add a provenance drawer that shows the source and rule behind each recommendation.
9. Package as a Chrome extension after the DOM and rule contracts stabilize.
