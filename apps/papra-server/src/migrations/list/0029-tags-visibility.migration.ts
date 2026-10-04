import type { Migration } from '../migrations.types';
import { sql } from 'drizzle-orm';

export const tagsVisibilityMigration = {
  name: 'tags-visibility',
  description: `Add a visibility flag on tags, hidden tags are not suggested in the tag pickers. Tag hierarchies are materialized by the tag name itself, using "/" as a separator (eg "LA/School"), so no schema change is required for them.`,

  up: async ({ db }) => {
    const tableInfo = await db.run(sql`PRAGMA table_info(tags)`);
    const existingColumns = tableInfo.rows.map((row) => row.name);
    const hasColumn = (columnName: string) => existingColumns.includes(columnName);

    if (!hasColumn('is_visible')) {
      await db.run(sql`ALTER TABLE tags ADD COLUMN is_visible integer DEFAULT true NOT NULL`);
    }
  },

  down: async ({ db }) => {
    await db.run(sql`ALTER TABLE tags DROP COLUMN is_visible`);
  },
} satisfies Migration;
