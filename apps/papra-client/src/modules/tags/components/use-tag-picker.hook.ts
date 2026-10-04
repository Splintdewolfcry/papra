import type { Tag } from '../tags.types';
import { createMemo, createSignal } from 'solid-js';
import { toArrayIf } from '@/modules/shared/utils/array';
import {
  buildTagsHierarchy,
  createTagHierarchyComparator,
  flattenTagsHierarchy,
  isTagSuggestable,
} from '../tags.models';

export type UseTagPickerOptions = {
  getAvailableTags: () => Tag[];
  getSelectedTagIds: () => string[];
};

export type HighlightedItem =
  | { tagId: string; action?: never }
  | { tagId?: never; action: 'create-new-tag' }
  | { tagId?: never; action?: never }; // represents no highlight

export type TagPickerListItemTag = {
  type: 'tag';
  tag: Tag;
  isSelected: boolean;
  /**
   * The name to display, the last level of the hierarchy when displayed inside its group, the full
   * path when the list is filtered.
   */
  displayName: string;
  /**
   * The nesting level of the tag in the hierarchy, 0 being the root.
   */
  depth: number;
};

export type TagPickerListItemGroup = {
  type: 'tag-group';
  name: string;
  depth: number;
};

export type TagPickerListItem =
  | TagPickerListItemTag
  | TagPickerListItemGroup
  | {
      type: 'create-new-tag-button';
      name?: string;
    }
  | {
      type: 'initially-selected-separator';
    };

export function useTagPicker(options: UseTagPickerOptions) {
  const [filterQuery, setFilterQuery] = createSignal('');
  const [highlighted, setHighlighted] = createSignal<HighlightedItem>({});

  const initiallySelectedTagIds = options.getSelectedTagIds?.() ?? [];

  const getTrimmedFilterQuery = createMemo(() => filterQuery().trim());
  const getNormalizedFilterQuery = createMemo(() => getTrimmedFilterQuery().toLowerCase());

  // Hidden tags are not suggested, unless they are already attached to the document
  const getSuggestableTags = createMemo(() =>
    options
      .getAvailableTags()
      .filter((tag) => isTagSuggestable({ tag, selectedTagIds: options.getSelectedTagIds() })),
  );

  const getTagsListItems = createMemo<TagPickerListItemTag[]>(() =>
    getSuggestableTags()
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({
        type: 'tag' as const,
        tag,
        displayName: tag.name,
        depth: 0,
        isSelected: options.getSelectedTagIds().includes(tag.id),
        isInitiallySelected: initiallySelectedTagIds.includes(tag.id),
      })),
  );

  const getFilteredTagListItems = createMemo(() =>
    getTagsListItems().filter(({ tag }) =>
      tag.name.toLowerCase().includes(getNormalizedFilterQuery()),
    ),
  );

  /**
   * When nothing is filtered, tags are displayed grouped by hierarchy, showing only the last level
   * of each tag name since its parents are displayed above it.
   */
  const getHierarchyListItems = createMemo<TagPickerListItem[]>(() => {
    const nodes = buildTagsHierarchy({ tags: getSuggestableTags() });

    const rows = flattenTagsHierarchy({
      nodes,
      compare: createTagHierarchyComparator({ sort: { key: 'name', direction: 'asc' } }),
      isExpanded: () => true,
    });

    return rows.flatMap<TagPickerListItem>(({ node, depth }) => {
      if (!node.tag) {
        return [{ type: 'tag-group' as const, name: node.name, depth }];
      }

      const tag = node.tag;

      return [
        {
          type: 'tag' as const,
          tag,
          displayName: node.name,
          depth,
          isSelected: options.getSelectedTagIds().includes(tag.id),
        },
      ];
    });
  });

  /**
   * When filtering, the whole hierarchy path is matched and displayed as a flat list, initially
   * selected tags first.
   */
  const getFlatListItems = createMemo<TagPickerListItem[]>(() => {
    const tagListItems = getFilteredTagListItems();
    const initiallySelectedTagsItems = tagListItems.filter((item) =>
      initiallySelectedTagIds.includes(item.tag.id),
    );
    const nonInitiallySelectedTagsItems = tagListItems.filter(
      (item) => !initiallySelectedTagIds.includes(item.tag.id),
    );

    const showSeparator =
      initiallySelectedTagsItems.length > 0 && nonInitiallySelectedTagsItems.length > 0;

    return [
      ...initiallySelectedTagsItems,
      ...toArrayIf(showSeparator, { type: 'initially-selected-separator' as const }),
      ...nonInitiallySelectedTagsItems,
    ];
  });

  const isExactMatch = createMemo(() =>
    getFilteredTagListItems().some(
      ({ tag }) => tag.name.toLowerCase() === getNormalizedFilterQuery(),
    ),
  );

  const shouldShowCreateOption = createMemo(() => {
    if (options.getAvailableTags().length === 0) {
      return true;
    }
    return getNormalizedFilterQuery().length > 0 && !isExactMatch();
  });

  const getListItems = createMemo<TagPickerListItem[]>(() => {
    const isFiltering = getNormalizedFilterQuery().length > 0;

    return [
      ...(isFiltering ? getFlatListItems() : getHierarchyListItems()),
      ...toArrayIf(shouldShowCreateOption(), {
        type: 'create-new-tag-button',
        name: getTrimmedFilterQuery(),
      } as const),
    ];
  });

  const getHighlightableItems = createMemo(() =>
    getListItems().filter((item) => item.type === 'tag' || item.type === 'create-new-tag-button'),
  );

  const highlightItem = (item: TagPickerListItem) => {
    if (item.type === 'tag') {
      setHighlighted({ tagId: item.tag.id });
    } else if (item.type === 'create-new-tag-button') {
      setHighlighted({ action: 'create-new-tag' });
    }
  };

  const getCurrentHighlightIndex = () => {
    const current = highlighted();
    const highlightableItems = getHighlightableItems();

    return highlightableItems.findIndex((item) => {
      if (current.tagId && item.type === 'tag') {
        return item.tag.id === current.tagId;
      }
      if (current.action === 'create-new-tag' && item.type === 'create-new-tag-button') {
        return true;
      }
      return false;
    });
  };

  const highlightNext = () => {
    const highlightableItems = getHighlightableItems();
    const itemsCount = highlightableItems.length;
    if (itemsCount === 0) {
      return;
    }

    const currentIndex = getCurrentHighlightIndex();

    // No highlight - go to first item
    if (currentIndex === -1) {
      const firstItem = highlightableItems[0];
      highlightItem(firstItem);
      return;
    }

    // Go to next item or wrap to first
    const nextIndex = (currentIndex + 1) % itemsCount;
    const nextItem = highlightableItems[nextIndex];
    highlightItem(nextItem);
  };

  const highlightPrevious = () => {
    const highlightableItems = getHighlightableItems();
    const itemsCount = highlightableItems.length;
    if (itemsCount === 0) {
      return;
    }

    const currentIndex = getCurrentHighlightIndex();

    // No highlight - go to last item
    if (currentIndex === -1) {
      const lastItem = highlightableItems[itemsCount - 1];
      highlightItem(lastItem);
      return;
    }

    // Go to previous item or wrap to last
    const previousIndex = (currentIndex - 1 + itemsCount) % itemsCount;
    const previousItem = highlightableItems[previousIndex];
    highlightItem(previousItem);
  };

  const resetHighlight = () => {
    setHighlighted({});
  };

  return {
    getListItems,
    filterQuery,
    setFilterQuery,
    getNormalizedFilterQuery,
    getTrimmedFilterQuery,
    getTagsListItems,
    highlighted,
    highlightNext,
    highlightPrevious,
    resetHighlight,
  };
}
