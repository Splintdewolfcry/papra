import type { Tag } from './tags.types';
import { describe, expect, test } from 'vitest';
import {
  buildTagsHierarchy,
  createTagHierarchyComparator,
  flattenTagsHierarchy,
  formatTagName,
  getTagHierarchyNodeDocumentsCount,
  isTagSuggestable,
  isTagVisible,
  isValidTagName,
} from './tags.models';

function createTag(partialTag: Partial<Tag> & { name: string }): Tag {
  return {
    id: `tag-${partialTag.name}`,
    color: '#FFFFFF',
    description: null,
    documentsCount: 0,
    organizationId: 'organization-1',
    isVisible: true,
    createdAt: new Date('2021-01-01'),
    updatedAt: new Date('2021-01-01'),
    ...partialTag,
  };
}

const byNameAsc = createTagHierarchyComparator({ sort: { key: 'name', direction: 'asc' } });

describe('tags models', () => {
  describe('tag name hierarchy', () => {
    test('tag names are hierarchy paths using the "/" separator', () => {
      expect(formatTagName({ name: ' LA / School ' })).to.eql('LA/School');
      expect(isValidTagName({ name: 'LA/School' })).to.eql(true);
      expect(isValidTagName({ name: 'LA//' })).to.eql(false);
    });
  });

  describe('buildTagsHierarchy', () => {
    test('tags without hierarchy are all at the root level', () => {
      const nodes = buildTagsHierarchy({
        tags: [createTag({ name: 'School' }), createTag({ name: 'Work' })],
      });

      expect(nodes.map((node) => node.name)).to.eql(['School', 'Work']);
      expect(nodes.every((node) => node.children.length === 0)).to.eql(true);
    });

    test('nested tags are grouped under their parents', () => {
      const nodes = buildTagsHierarchy({
        tags: [createTag({ name: 'LA/School' }), createTag({ name: 'LA/Work' })],
      });

      expect(nodes).to.have.length(1);
      expect(nodes[0]?.name).to.eql('LA');
      expect(nodes[0]?.path).to.eql('LA');
      // The LA group does not exist as a tag, it is inferred from its children
      expect(nodes[0]?.tag).to.eql(undefined);
      expect(nodes[0]?.children.map((child) => child.name)).to.eql(['School', 'Work']);
      expect(nodes[0]?.children.map((child) => child.tag?.name)).to.eql(['LA/School', 'LA/Work']);
    });

    test('a parent tag is merged with the group inferred from its children', () => {
      const nodes = buildTagsHierarchy({
        tags: [createTag({ name: 'LA' }), createTag({ name: 'LA/School' })],
      });

      expect(nodes).to.have.length(1);
      expect(nodes[0]?.tag?.name).to.eql('LA');
      expect(nodes[0]?.children.map((child) => child.name)).to.eql(['School']);
    });

    test('groups are matched case insensitively', () => {
      const nodes = buildTagsHierarchy({
        tags: [createTag({ name: 'LA/School' }), createTag({ name: 'la/Work' })],
      });

      expect(nodes).to.have.length(1);
      expect(nodes[0]?.children.map((child) => child.name)).to.eql(['School', 'Work']);
    });

    test('deeply nested tags create all the intermediate groups', () => {
      const nodes = buildTagsHierarchy({ tags: [createTag({ name: 'LA/School/Class' })] });

      expect(nodes[0]?.children[0]?.children[0]?.tag?.name).to.eql('LA/School/Class');
    });
  });

  describe('getTagHierarchyNodeDocumentsCount', () => {
    test('the documents count of a group is the sum of the documents count of its descendants', () => {
      const [node] = buildTagsHierarchy({
        tags: [
          createTag({ name: 'LA', documentsCount: 2 }),
          createTag({ name: 'LA/School', documentsCount: 3 }),
          createTag({ name: 'LA/School/Class', documentsCount: 4 }),
          createTag({ name: 'LA/Work', documentsCount: 1 }),
        ],
      });

      if (!node) {
        throw new Error('Expected a root node');
      }

      expect(getTagHierarchyNodeDocumentsCount({ node })).to.eql(10);
      expect(getTagHierarchyNodeDocumentsCount({ node: node.children[0]! })).to.eql(7);
    });
  });

  describe('flattenTagsHierarchy', () => {
    const tags = [
      createTag({ name: 'LA/School' }),
      createTag({ name: 'LA/Work' }),
      createTag({ name: 'Invoices' }),
    ];

    test('rows are returned with their depth, parents first', () => {
      const rows = flattenTagsHierarchy({
        nodes: buildTagsHierarchy({ tags }),
        compare: byNameAsc,
        isExpanded: () => true,
      });

      expect(rows.map(({ node, depth }) => [node.path, depth])).to.eql([
        ['Invoices', 0],
        ['LA', 0],
        ['LA/School', 1],
        ['LA/Work', 1],
      ]);
    });

    test('children of collapsed nodes are not returned', () => {
      const rows = flattenTagsHierarchy({
        nodes: buildTagsHierarchy({ tags }),
        compare: byNameAsc,
        isExpanded: ({ node }) => node.path !== 'LA',
      });

      expect(
        rows.map(({ node, isExpanded, hasChildren }) => [node.path, isExpanded, hasChildren]),
      ).to.eql([
        ['Invoices', false, false],
        ['LA', false, true],
      ]);
    });

    test('each level is sorted with the given comparator', () => {
      const rows = flattenTagsHierarchy({
        nodes: buildTagsHierarchy({ tags }),
        compare: createTagHierarchyComparator({ sort: { key: 'name', direction: 'desc' } }),
        isExpanded: () => true,
      });

      expect(rows.map(({ node }) => node.path)).to.eql(['LA', 'LA/Work', 'LA/School', 'Invoices']);
    });
  });

  describe('isTagSuggestable', () => {
    test('visible tags are always suggested', () => {
      expect(isTagSuggestable({ tag: createTag({ name: 'School' }) })).to.eql(true);
    });

    test('tags without the visibility field are considered visible', () => {
      const legacyTag = createTag({ name: 'School' });
      delete (legacyTag as Partial<Tag>).isVisible;

      expect(isTagVisible({ tag: legacyTag })).to.eql(true);
      expect(isTagSuggestable({ tag: legacyTag })).to.eql(true);
    });

    test('hidden tags are not suggested, unless they are already selected', () => {
      const hiddenTag = createTag({ name: 'School', isVisible: false });

      expect(isTagSuggestable({ tag: hiddenTag })).to.eql(false);
      expect(isTagSuggestable({ tag: hiddenTag, selectedTagIds: ['another-tag'] })).to.eql(false);
      expect(isTagSuggestable({ tag: hiddenTag, selectedTagIds: [hiddenTag.id] })).to.eql(true);
    });
  });
});
