import type { Tag } from './tags.types';
import { createHierarchicalName } from '@papra/std';

/**
 * Tag names are hierarchical names, the `/` character is used as a separator, for instance the tag
 * named `LA/School` is the `School` tag nested under the `LA` group.
 *
 * This mirrors the server side implementation in `apps/papra-server/src/modules/tags/tags.models.ts`.
 */
export const tagHierarchySeparator = '/';

export const maxTagHierarchyDepth = 5;

const tagNameHierarchy = createHierarchicalName({
  separator: tagHierarchySeparator,
  maxDepth: maxTagHierarchyDepth,
});

export const splitTagName = tagNameHierarchy.split;
export const joinTagName = tagNameHierarchy.join;
export const formatTagName = tagNameHierarchy.format;
export const isValidTagName = tagNameHierarchy.isValid;
export const getTagDepth = tagNameHierarchy.depth;
export const getTagLeafName = tagNameHierarchy.leafName;
export const getTagParentPath = tagNameHierarchy.parentPath;
export const getTagAncestorPaths = tagNameHierarchy.ancestorPaths;

export type TagHierarchyNode = {
  /**
   * The name of the node, ie the last level of its path. `School` for the `LA/School` tag.
   */
  name: string;
  /**
   * The full path of the node, eg `LA/School`.
   */
  path: string;
  /**
   * The tag when one exists at this exact path. Groups inferred from the hierarchy of other tags
   * (eg the `LA` group of the `LA/School` tag) don't have a tag attached.
   */
  tag?: Tag;
  children: TagHierarchyNode[];
};

export type TagHierarchyRow = {
  node: TagHierarchyNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  /**
   * Number of documents attached to the tag, or to any of its descendants for groups.
   */
  documentsCount: number;
};

/**
 * Builds the tag hierarchy tree from a flat list of tags.
 *
 * Groups are matched case insensitively so that `LA/School` and `la/Work` end up under the same
 * `LA` group.
 */
export function buildTagsHierarchy({ tags }: { tags: Tag[] }): TagHierarchyNode[] {
  const rootNodes: TagHierarchyNode[] = [];
  const nodesByPath = new Map<string, TagHierarchyNode>();

  for (const tag of tags) {
    const segments = splitTagName({ name: tag.name });
    const isLastSegment = (index: number) => index === segments.length - 1;

    let siblings = rootNodes;
    let currentPath = '';

    for (const [index, segment] of segments.entries()) {
      currentPath = index === 0 ? segment : `${currentPath}${tagHierarchySeparator}${segment}`;

      const nodeKey = currentPath.toLowerCase();
      let node = nodesByPath.get(nodeKey);

      if (!node) {
        node = { name: segment, path: currentPath, children: [] };
        nodesByPath.set(nodeKey, node);
        siblings.push(node);
      }

      if (isLastSegment(index)) {
        node.name = segment;
        node.tag = tag;
      }

      siblings = node.children;
    }
  }

  return rootNodes;
}

/**
 * The number of documents attached to a node, aggregated with its descendants for groups.
 */
export function getTagHierarchyNodeDocumentsCount({ node }: { node: TagHierarchyNode }): number {
  return (
    (node.tag?.documentsCount ?? 0) +
    node.children.reduce(
      (count, child) => count + getTagHierarchyNodeDocumentsCount({ node: child }),
      0,
    )
  );
}

/**
 * Flattens the hierarchy tree into the rows to display, sorting each level with the given
 * comparator and skipping the children of collapsed nodes.
 */
export function flattenTagsHierarchy({
  nodes,
  compare,
  isExpanded,
  depth = 0,
}: {
  nodes: TagHierarchyNode[];
  compare: (a: TagHierarchyNode, b: TagHierarchyNode) => number;
  isExpanded: (args: { node: TagHierarchyNode }) => boolean;
  depth?: number;
}): TagHierarchyRow[] {
  return [...nodes].toSorted(compare).flatMap((node) => {
    const hasChildren = node.children.length > 0;
    const expanded = hasChildren && isExpanded({ node });

    return [
      {
        node,
        depth,
        hasChildren,
        isExpanded: expanded,
        documentsCount: getTagHierarchyNodeDocumentsCount({ node }),
      },
      ...(expanded
        ? flattenTagsHierarchy({ nodes: node.children, compare, isExpanded, depth: depth + 1 })
        : []),
    ];
  });
}

export type TagHierarchySort = {
  key: 'name' | 'description' | 'documentsCount' | 'createdAt';
  direction: 'asc' | 'desc';
};

/**
 * Creates the comparator used to sort the tags of a same hierarchy level.
 */
export function createTagHierarchyComparator({ sort }: { sort: TagHierarchySort }) {
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;

  const getValue = (node: TagHierarchyNode): string | number => {
    switch (sort.key) {
      case 'description':
        return node.tag?.description ?? '';
      case 'documentsCount':
        return getTagHierarchyNodeDocumentsCount({ node });
      case 'createdAt':
        // Groups don't have a creation date, the oldest tag of the subtree is used
        return getOldestTagCreatedAt({ node })?.getTime() ?? 0;
      case 'name':
      default:
        return node.name;
    }
  };

  return (a: TagHierarchyNode, b: TagHierarchyNode) => {
    const aValue = getValue(a);
    const bValue = getValue(b);

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * directionMultiplier;
    }

    return (
      String(aValue).localeCompare(String(bValue), undefined, { numeric: true }) *
      directionMultiplier
    );
  };
}

function getOldestTagCreatedAt({ node }: { node: TagHierarchyNode }): Date | undefined {
  const dates = [
    ...(node.tag?.createdAt ? [node.tag.createdAt] : []),
    ...node.children.flatMap((child) => {
      const childDate = getOldestTagCreatedAt({ node: child });

      return childDate ? [childDate] : [];
    }),
  ];

  return dates.toSorted((a, b) => a.getTime() - b.getTime())[0];
}

/**
 * Whether a tag is visible. Tags created before the visibility option existed (demo mode local
 * storage, stale caches) don't have the field and are considered visible.
 */
export function isTagVisible({ tag }: { tag: Pick<Tag, 'isVisible'> }): boolean {
  return tag.isVisible !== false;
}

/**
 * Whether a tag should be suggested in a tag picker. Hidden tags are still displayed when they are
 * already attached to the document being edited, so that they can be removed.
 */
export function isTagSuggestable({
  tag,
  selectedTagIds = [],
}: {
  tag: Pick<Tag, 'id' | 'isVisible'>;
  selectedTagIds?: string[];
}): boolean {
  return isTagVisible({ tag }) || selectedTagIds.includes(tag.id);
}
