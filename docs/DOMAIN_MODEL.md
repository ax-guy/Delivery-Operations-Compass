# DOC Domain Model

## Person

Fields: ID, display name, team, role, region, employment constraints, testing capacity percentage, skills, SME commitments, availability, source provenance.

## Work Item

Fields: Jira key, summary, service type, status, assignee, scope, page count, finding count, due date, client commitment, blockers, dependencies, estimate, source URL.

## Capacity Window

Fields: person, start, end, gross hours, delivery percentage, available delivery hours, booked hours, evaluation hours, validation hours, VPAT hours, SME hours, FTO, holidays, remaining hours.

## Rule

Fields: ID, title, description, value, units, effective date, source, applicability, precedence, enabled status.

## Recommendation

Fields: ID, type, severity, title, explanation, evidence, rule IDs, affected entities, generated time, confidence, available action, user disposition.

## Source Record

Fields: source system, source document/page, captured time, source modified time, raw value, normalized value, collection method.
