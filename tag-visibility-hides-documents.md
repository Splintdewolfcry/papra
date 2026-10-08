# Tag visibility hides tagged documents

## Summary

Toggling a tag's visibility should hide not just the tag itself, but also every document the tag is
attached to. Hidden documents disappear from the main document list for **everyone in the
organization** — it's a workspace-wide setting, not a per-user view.

## Problem

The original tag-visibility feature only removed the hidden tag from the tag pickers (the tag stops
being suggested while tagging). The documents carrying that tag stayed fully visible in the main
list, which was not what was asked: the point of "toggling the visibility of a tag" is to also hide
the files tagged with it.

## Goals

- Toggling a tag to hidden hides the documents attached to it from the main document list.
- The behavior applies to every member of the organization (server-side, not client-side).
- Keep it consistent with the existing `isVisible` flag on tags (no new schema).

## Non-goals

- Not a security/permission boundary: documents are still attached to the tag and returned by the
  API, and are still reachable via a direct document URL. This only hides them from the main list.
- Not per-user visibility.

## Approach

Implemented server-side in the document search where-clause
(`apps/papra-server/src/modules/documents/document-search/database-fts5/database-fts5.repository.models.ts`).
Every document list/search query now excludes documents that have at least one hidden tag:

```sql
"documents"."id" NOT IN (
  SELECT "documents_tags"."document_id"
  FROM "documents_tags"
  INNER JOIN "tags" ON "documents_tags"."tag_id" = "tags"."id"
  WHERE "tags"."organization_id" = ? AND "tags"."is_visible" = ?
)
```

This filter is applied in `makeSearchWhereClause`, which both the list endpoint and the
"get document ids matching query" (batch selection) path use, so hidden documents are consistently
excluded from listing and from bulk operations.

## Decisions

- **A single hidden tag hides a document**, even if the document also carries visible tags.
  (Rationale: you tagged the file with the hidden tag, so hiding that tag should hide the file.)
- Reuse the existing `isVisible` flag — no new column or migration.
- No client-side change needed: the list is filtered on the server, so both web and mobile get the
  behavior through the same API.

## Open questions

- Should hidden-tagged documents also 404 (or warn) on the direct document page, rather than being
  reachable by URL?
- Should document statistics (counts/size on the dashboard) exclude hidden documents, or keep
  counting them since they still consume storage?
- The visibility toggle lives on the tags settings page; an already-open documents list won't
  re-filter until it is reloaded. Is a live refresh/invalidation needed?
