# Target validity

Weekly and target imports can carry an optional `targetPeriod` with ISO dates `from` and `through`. Both endpoints are required when supplied. Real dates, ordering and overlap with the reporting month are validated. Campaign windows may cross month and year boundaries.

The period describes the goals' validity, separately from the dated cumulative actuals. It is stored inside the existing protected import/weekly payload, included in the import fingerprint and shown in personal, supervisor and admin history views. Missing legacy metadata stays unknown.

An explicit Monthly YYYYMM title with a full date range may prefill the fields. A partial EDI data range is never used as an invented whole target window. Explicit campaign months take precedence over the month of the EDI end; the existing data-stand validation remains in force.

Lighthouse retains each source block's own period. Group means report coverage and differing periods. Weekly deltas require matching periods; two legacy stands without metadata retain the existing comparison behavior. Scores, money, roles and RLS remain unchanged.
