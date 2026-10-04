import type { Component, ComponentProps, ParentComponent } from 'solid-js';
import type { Tag } from '../tags.types';
import { splitProps } from 'solid-js';
import { useI18n } from '@/modules/i18n/i18n.provider';
import { cn } from '@/modules/shared/style/cn';
import { Checkbox, CheckboxControl } from '@/modules/ui/components/checkbox';
import { isTagVisible } from '../tags.models';

export type TagPickerItemProps = {
  selected: boolean;
  highlighted: boolean;
} & ComponentProps<'li'>;

export const TagPickerItem: ParentComponent<TagPickerItemProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'selected', 'highlighted']);

  return (
    <li class="px-1 cursor-pointer group" role="option" aria-selected={local.selected} {...rest}>
      <div
        class={cn(
          'flex items-center gap-2 rounded-md cursor-pointer transition-colors',
          local.highlighted ? 'bg-accent' : 'group-hover:bg-accent/50',
        )}
      >
        {local.children}
      </div>
    </li>
  );
};

export type TagPickerItemTagProps = {
  tag: Tag;
  /**
   * The name to display, the last level of the hierarchy when the tag is displayed inside its group.
   */
  displayName?: string;
  /**
   * The nesting level of the tag in the hierarchy, used for indentation.
   */
  depth?: number;
  selected: boolean;
  highlighted: boolean;
  onToggle: (selected: boolean) => void;
  onToggleVisibility?: (isVisible: boolean) => void;
};

export const TagPickerItemTag: Component<TagPickerItemTagProps> = (props) => {
  const { t } = useI18n();

  const handleRowClick = () => props.onToggle(!props.selected);
  const handleCheckboxChange = (checked: boolean) => props.onToggle(checked);

  const handleCheckboxAreaClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onToggle(!props.selected);
  };

  const getVisibilityLabel = () =>
    isTagVisible({ tag: props.tag })
      ? t('tags.visibility.hide-tooltip')
      : t('tags.visibility.show-tooltip');

  return (
    <TagPickerItem
      selected={props.selected}
      highlighted={props.highlighted}
      onClick={handleRowClick}
    >
      <div
        class="flex items-center justify-center h-full py-2"
        style={{ 'padding-left': `${8 + (props.depth ?? 0) * 12}px` }}
        onClick={handleCheckboxAreaClick}
      >
        <Checkbox
          checked={props.selected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        >
          <CheckboxControl class="border-transparent group-hover:border-border data-[checked]:(border-primary group-hover:border-primary)" />
        </Checkbox>
      </div>

      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span
          class="size-2 rounded-full flex-shrink-0"
          style={{ 'background-color': props.tag.color }}
        />
        <span
          class={cn(
            'text-sm truncate',
            !isTagVisible({ tag: props.tag }) && 'text-muted-foreground',
          )}
        >
          {props.displayName ?? props.tag.name}
        </span>
      </div>

      {props.onToggleVisibility && (
        <button
          type="button"
          class="flex items-center pr-2 flex-shrink-0 cursor-pointer"
          title={getVisibilityLabel()}
          aria-label={getVisibilityLabel()}
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleVisibility?.(!isTagVisible({ tag: props.tag }));
          }}
          // Enter and Space would otherwise also toggle the tag selection from the parent keydown
          // handler, arrow keys are left bubbling so keyboard navigation keeps working
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
            }
          }}
        >
          <div
            class={cn(
              'size-4 text-muted-foreground hover:text-foreground transition',
              isTagVisible({ tag: props.tag })
                ? 'i-tabler-eye-off opacity-0 group-hover:opacity-100'
                : 'i-tabler-eye',
            )}
          />
        </button>
      )}
    </TagPickerItem>
  );
};

export const TagPickerItemGroup: Component<{ name: string; depth?: number }> = (props) => {
  return (
    <li
      class="px-1 select-none"
      role="presentation"
      style={{ 'padding-left': `${4 + (props.depth ?? 0) * 12}px` }}
    >
      <div class="flex items-center gap-1.5 py-1.5 text-muted-foreground">
        <div class="i-tabler-folder size-3.5 flex-shrink-0" />
        <span class="text-xs font-medium truncate">{props.name}</span>
      </div>
    </li>
  );
};

export const TagPickerItemCreateNewTag: Component<{
  highlighted: boolean;
  onClick: () => void;
  name?: string;
}> = (props) => {
  const { t } = useI18n();

  return (
    <TagPickerItem selected={false} highlighted={props.highlighted} onClick={props.onClick}>
      <div class="flex items-center gap-2 pl-2 py-2 text-muted-foreground">
        <div class="i-tabler-plus size-4" />
        <span class="text-sm">
          {props.name
            ? t('tags.picker.create-new-with-name', { name: props.name })
            : t('tags.picker.create-new')}
        </span>
      </div>
    </TagPickerItem>
  );
};
