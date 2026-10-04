export type HierarchicalName = {
  /**
   * The separator used between the levels of a hierarchical name.
   */
  separator: string;
  /**
   * The maximum number of levels a hierarchical name can have.
   */
  maxDepth: number;
  /**
   * Splits a hierarchical name into its levels, trimming each of them.
   *
   * @example split({ name: 'LA/School' }) // ['LA', 'School']
   */
  split: (args: { name: string }) => string[];
  /**
   * Joins levels into a hierarchical name.
   *
   * @example join({ segments: ['LA', 'School'] }) // 'LA/School'
   */
  join: (args: { segments: string[] }) => string;
  /**
   * Normalizes a user input into a canonical hierarchical name: levels are trimmed and empty
   * levels are removed.
   *
   * @example format({ name: ' LA / /School ' }) // 'LA/School'
   */
  format: (args: { name: string }) => string;
  /**
   * Whether a name is a valid hierarchical name, ie all its levels are non empty and it does not
   * exceed the maximum depth.
   */
  isValid: (args: { name: string }) => boolean;
  /**
   * The number of levels of a hierarchical name.
   *
   * @example depth({ name: 'LA/School' }) // 2
   */
  depth: (args: { name: string }) => number;
  /**
   * The last level of a hierarchical name.
   *
   * @example leafName({ name: 'LA/School' }) // 'School'
   */
  leafName: (args: { name: string }) => string;
  /**
   * The path of the parent of a hierarchical name, or null when it is at the root level.
   *
   * @example parentPath({ name: 'LA/School' }) // 'LA'
   */
  parentPath: (args: { name: string }) => string | null;
  /**
   * All the ancestor paths of a hierarchical name, from the root to its direct parent.
   *
   * @example ancestorPaths({ name: 'LA/School/Class' }) // ['LA', 'LA/School']
   */
  ancestorPaths: (args: { name: string }) => string[];
};

/**
 * Creates the helpers to manipulate names organized in a hierarchy, such as tags named
 * `LA/School` for the `School` tag nested under the `LA` group.
 */
export function createHierarchicalName({
  separator,
  maxDepth = Number.POSITIVE_INFINITY,
}: {
  separator: string;
  maxDepth?: number;
}): HierarchicalName {
  const split = ({ name }: { name: string }) => name.split(separator).map((level) => level.trim());

  const join = ({ segments }: { segments: string[] }) => segments.join(separator);

  const depth = ({ name }: { name: string }) => split({ name }).length;

  return {
    separator,
    maxDepth,
    split,
    join,
    format: ({ name }) => join({ segments: split({ name }).filter((level) => level.length > 0) }),
    isValid: ({ name }) => {
      const levels = split({ name });

      if (levels.length === 0 || levels.some((level) => level.length === 0)) {
        return false;
      }

      return depth({ name }) <= maxDepth;
    },
    depth,
    leafName: ({ name }) => {
      const levels = split({ name });

      return levels[levels.length - 1] ?? name;
    },
    parentPath: ({ name }) => {
      const levels = split({ name });

      if (levels.length <= 1) {
        return null;
      }

      return join({ segments: levels.slice(0, -1) });
    },
    ancestorPaths: ({ name }) => {
      const levels = split({ name });

      return levels.slice(0, -1).map((_, index) => join({ segments: levels.slice(0, index + 1) }));
    },
  };
}
