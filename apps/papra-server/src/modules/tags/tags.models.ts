import { createHierarchicalName } from '@papra/std';

/**
 * Tag names are hierarchical names, the `/` character is used as a separator, for instance the tag
 * named `LA/School` is the `School` tag nested under the `LA` group.
 */
export const tagHierarchySeparator = '/';

/**
 * Maximum number of nested levels a tag name can have. `LA/School/Class` has a depth of 3.
 */
export const maxTagHierarchyDepth = 5;

const tagNameHierarchy = createHierarchicalName({
  separator: tagHierarchySeparator,
  maxDepth: maxTagHierarchyDepth,
});

/**
 * Splits a tag name into its hierarchy levels.
 *
 * @example splitTagName({ name: 'LA/School' }) // ['LA', 'School']
 */
export const splitTagName = tagNameHierarchy.split;

/**
 * Joins hierarchy levels into a tag name.
 *
 * @example joinTagName({ segments: ['LA', 'School'] }) // 'LA/School'
 */
export const joinTagName = tagNameHierarchy.join;

/**
 * Normalizes a user input into a canonical tag name, levels are trimmed and empty levels removed.
 *
 * @example formatTagName({ name: ' LA / /School ' }) // 'LA/School'
 */
export const formatTagName = tagNameHierarchy.format;

/**
 * Whether a tag name is a valid hierarchy path.
 */
export const isValidTagName = tagNameHierarchy.isValid;

/**
 * The number of levels in a tag name hierarchy.
 *
 * @example getTagDepth({ name: 'LA/School' }) // 2
 */
export const getTagDepth = tagNameHierarchy.depth;

/**
 * The last level of a tag name, ie the name to display when the tag is rendered inside its group.
 *
 * @example getTagLeafName({ name: 'LA/School' }) // 'School'
 */
export const getTagLeafName = tagNameHierarchy.leafName;

/**
 * The path of the parent of a tag name, or null when the tag is at the root of the hierarchy.
 *
 * @example getTagParentPath({ name: 'LA/School' }) // 'LA'
 */
export const getTagParentPath = tagNameHierarchy.parentPath;

/**
 * All the ancestor paths of a tag name, from the root to its direct parent.
 *
 * @example getTagAncestorPaths({ name: 'LA/School/Class' }) // ['LA', 'LA/School']
 */
export const getTagAncestorPaths = tagNameHierarchy.ancestorPaths;
