# DOC v0.5.2

## Critical scan fix
v0.5.1 keyed scanned sections by their visible title. When multiple Jira gadgets did not expose a heading to the old selector, all were named “Untitled section” and each new section overwrote the previous one. This produced one result even when preflight found 11 sections.

v0.5.2:
- assigns every detected table a stable unique section key;
- preserves every section even when titles repeat or are unavailable;
- derives titles from Jira gadget containers, dashboard headers, ARIA labels, data titles, IDs, and nearby headings;
- numbers duplicate section titles instead of merging them;
- shows the complete preflight section inventory before scanning;
- validates that result-section count equals preflight-section count and reports an integrity error if it does not;
- retains all v0.5.1 functionality.
