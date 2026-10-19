# Design decisions

Status: agreed in planning, before the database is built.

## Data model (eight tables)

1. **People**: permanent random ID, readable code, first/middle/last/maiden names, sex, birth date (as written) and place, death date and place, baptism date, living flag, creator, search-helper columns, "merged into" pointer.
2. **Families**: partner 1 and partner 2 (either may be empty), marriage date and place, end date and reason, optional marriage order, creator. Mirrors the GEDCOM FAM record.
3. **Family children**: family, child, type (birth or adoptive), optional birth order, creator.
4. **Notes and sources**: text and citations attached to a person or Family.
5. **Accounts**: users (provided by Supabase), each with a "home person" (the person record that represents them).
6. **Tree links**: which accounts have which people, and whether they created or connected.
7. **Requests and suggestions**: proposals to change a field, add a relationship, merge two records, or request a connection.
8. **Change history**: who changed what and when, for undo and disputes.

## Principles

- Everything is optional except the permanent ID and the creator.
- Dates are stored as written ("abt 1850" survives) plus a clean year for sorting.
- Siblings, half-siblings, and step relationships are calculated, never stored.
- Stored parent-child types: birth and adoptive. Step is derived. Foster is not supported at launch.
- Couples do not assume genders.
- GEDCOM import and export should be lossless where possible.

## Editing rules

1. The creator of a person edits them directly.
2. Anyone with a person in their tree may add parents directly if none are recorded. The owner is notified and can undo.
3. Changes to existing parents, or to a person's own facts, are suggestions the owner approves.
4. Adoptive parents can be added alongside birth parents.

## Matching and merging

- Every new person, typed in or imported, is checked for likely matches. The user picks an existing person or creates a new one.
- Merging two records is a suggestion. The merged record keeps a "merged into" pointer, and the change history allows undo.

## Visibility

- Deceased people are visible to logged-in users (to confirm).
- Living people: details are visible to anyone within the descendants of the viewer's great-grandparents (and spouses of those), calculated from the viewer's home person. The same rule runs from the viewer's spouse's position. Adoptive links count; step links do not.
- Beyond that circle, a connection request the owner approves.
- Match previews for living people show only first name, approximate birth year, and general place.
- Living flag default: no death date and born within about 100 years. The owner can override.

## Open questions

- Who approves a merge (both owners, or either).
- How the tree displays multiple marriages.
- Whether living status needs any further limits on adding parents.

## Hosting notes

- Supabase free plan: free projects pause after 7 days of inactivity and have no automatic backups. Fine for the proof of concept; plan for the paid plan or a keep-alive job and backups before real users depend on it.

## Roadmap

1. Viewer that reads a GEDCOM file (done)
2. Live site on Vercel (done)
3. Database on Supabase
4. Accounts and login
5. Detail side panel
6. Add people and parents on the site
7. Duplicate matching and merge
8. GEDCOM export