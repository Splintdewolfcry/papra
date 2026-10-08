import type { SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Database } from '../../../app/database/database.types';
import type { DocumentSearchSort, DocumentSearchSortField } from '../document-search.constants';
import type { CustomPropertyDefinition } from './query-builder/query-builder.custom-properties';
import { parseSearchQuery } from '@papra/search-parser';
import { and, asc, desc, eq, notInArray, sql } from 'drizzle-orm';
import { documentsTable } from '../../documents.table';
import { documentsTagsTable, tagsTable } from '../../../tags/tags.table';
import { buildQueryFromExpression } from './query-builder/query-builder';

export function makeSearchWhereClause({
  query,
  organizationId,
  db,
  now = new Date(),
  customPropertyDefinitions = [],
}: {
  query: string;
  organizationId: string;
  db: Database;
  now?: Date;
  customPropertyDefinitions?: CustomPropertyDefinition[];
}) {
  const { expression, issues: parsedIssues } = parseSearchQuery({ query });

  const customPropertyDefinitionsByKey = Object.fromEntries(
    customPropertyDefinitions.map((definition) => [definition.key, definition]),
  );

  const { sqlQuery, issues } = buildQueryFromExpression({
    expression,
    organizationId,
    db,
    now,
    customPropertyDefinitionsByKey,
  });

  // Documents tagged with a hidden tag are hidden from the document list for everyone in the
  // organization. A single hidden tag hides the document, even if it also carries visible tags.
  const hiddenTaggedDocumentIds = db
    .select({ documentId: documentsTagsTable.documentId })
    .from(documentsTagsTable)
    .innerJoin(tagsTable, eq(documentsTagsTable.tagId, tagsTable.id))
    .where(
      and(eq(tagsTable.organizationId, organizationId), eq(tagsTable.isVisible, false)),
    );

  return {
    searchWhereClause: and(
      eq(documentsTable.organizationId, organizationId),
      eq(documentsTable.isDeleted, false),
      notInArray(documentsTable.id, hiddenTaggedDocumentIds),
      sqlQuery,
    ),
    issues: [...parsedIssues, ...issues],
  };
}

const sortableColumnsByField: Record<DocumentSearchSortField, SQLiteColumn | SQL> = {
  createdAt: documentsTable.createdAt,
  updatedAt: documentsTable.updatedAt,
  name: sql`${documentsTable.name} COLLATE NOCASE`, // case-insensitive sorting for name
  documentDate: documentsTable.documentDate,
};

export function makeSearchOrderByClauses({ sort }: { sort: DocumentSearchSort }) {
  const sortColumn = sortableColumnsByField[sort.field];
  const orderDirection = sort.order === 'desc' ? desc : asc;

  const orderByClauses = [
    orderDirection(sortColumn),
    ...(sort.field !== 'createdAt' ? [orderDirection(documentsTable.createdAt)] : []),
    orderDirection(documentsTable.id), // tie-breaker to ensure deterministic order
  ];

  return { orderByClauses, sortColumn };
}
