import type { Component } from 'solid-js';
import type { HighlightedItem, TagPickerListItem } from './use-tag-picker.hook';
import { For, Match, Switch } from 'solid-js';
import {
  TagPickerItemCreateNewTag,
  TagPickerItemGroup,
  TagPickerItemTag,
} from './tag-picker-item.component';

export type TagPickerListProps = {
  listItems: TagPickerListItem[];
  highlighted: HighlightedItem;
  onToggle: (tagId: string, selected: boolean) => void;
  onToggleVisibility?: (tagId: string, isVisible: boolean) => void;
  onCreateNewTag?: () => void;
};

export const TagPickerList: Component<TagPickerListProps> = (props) => {
  return (
    <ul role="listbox" class="py-1">
      <For each={props.listItems}>
        {(baseItem) => (
          <Switch>
            <Match when={baseItem.type === 'tag' ? baseItem : null}>
              {(getTagItem) => (
                <TagPickerItemTag
                  tag={getTagItem().tag}
                  displayName={getTagItem().displayName}
                  depth={getTagItem().depth}
                  selected={getTagItem().isSelected}
                  highlighted={props.highlighted.tagId === getTagItem().tag.id}
                  onToggle={(selected) => props.onToggle(getTagItem().tag.id, selected)}
                  onToggleVisibility={
                    props.onToggleVisibility
                      ? (isVisible) => props.onToggleVisibility?.(getTagItem().tag.id, isVisible)
                      : undefined
                  }
                />
              )}
            </Match>

            <Match when={baseItem.type === 'tag-group' ? baseItem : null}>
              {(getGroupItem) => (
                <TagPickerItemGroup name={getGroupItem().name} depth={getGroupItem().depth} />
              )}
            </Match>

            <Match when={baseItem.type === 'create-new-tag-button' ? baseItem : null}>
              {(getCreateTagItem) => (
                <TagPickerItemCreateNewTag
                  highlighted={props.highlighted.action === 'create-new-tag'}
                  onClick={() => props.onCreateNewTag?.()}
                  name={getCreateTagItem().name}
                />
              )}
            </Match>

            <Match when={baseItem.type === 'initially-selected-separator' ? baseItem : null}>
              <li role="separator">
                <hr class="my-1 border-t border-border/50" />
              </li>
            </Match>
          </Switch>
        )}
      </For>
    </ul>
  );
};
