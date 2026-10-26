# Known limitations
- Dashboard DOM labels can change. DOC reports missing columns rather than silently substituting unrelated values.
- First available date and testing capacity come from an imported capacity CSV unless those columns are present on the scanned dashboard.
- Metric-card detection reads compact visible cards. If Apollo renders overdue data in canvas, an iframe, or a shadow root, a page-specific adapter will be needed.
- The current holiday calculation excludes weekends but does not yet subtract regional holidays automatically.
