import type { DialogTriggerProps } from '@kobalte/core/dialog';
import type { Component, JSX, ValidComponent } from 'solid-js';
import type { TagHierarchySort } from '../tags.models';
import type { Tag as TagType } from '../tags.types';
import { safely } from '@corentinth/chisels';
import { getValues, setValue } from '@modular-forms/solid';
import { A, useParams } from '@solidjs/router';
import { useMutation, useQuery } from '@tanstack/solid-query';
import { createSolidTable, flexRender, getCoreRowModel } from '@tanstack/solid-table';
import { createMemo, createSignal, For, Show, Suspense } from 'solid-js';
import * as v from 'valibot';
import { makeDocumentSearchPermalink } from '@/modules/documents/document.models';
import { RelativeTime } from '@/modules/i18n/components/RelativeTime';
import { useI18n } from '@/modules/i18n/i18n.provider';
import { useConfirmModal } from '@/modules/shared/confirm';
import { createForm } from '@/modules/shared/form/form';
import { makeReturnVoidAsync } from '@/modules/shared/functions/void';
import { useI18nApiErrors } from '@/modules/shared/http/composables/i18n-api-errors';
import { queryClient } from '@/modules/shared/query/query-client';
import { cn } from '@/modules/shared/style/cn';
import { Button } from '@/modules/ui/components/button';
import { ColorSwatchPicker } from '@/modules/ui/components/color-swatch-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/modules/ui/components/dialog';
import { EmptyState } from '@/modules/ui/components/empty';
import { createToast } from '@/modules/ui/components/sonner';
import {
  Switch,
  SwitchControl,
  SwitchDescription,
  SwitchLabel,
  SwitchThumb,
} from '@/modules/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/ui/components/table';
import { TextArea } from '@/modules/ui/components/textarea';
import { TextField, TextFieldLabel, TextFieldRoot } from '@/modules/ui/components/textfield';
import { Tag as TagComponent, TagLink } from '../components/tag.component';
import {
  buildTagsHierarchy,
  createTagHierarchyComparator,
  flattenTagsHierarchy,
  formatTagName,
  isTagVisible,
  isValidTagName,
  maxTagHierarchyDepth,
} from '../tags.models';
import { createTag, deleteTag, fetchTags, updateTag } from '../tags.services';

// To keep, useful for generating swatches
// function generateSwatches(count = 9, saturation = 100, lightness = 74) {
//   const colors = [];
//   for (let i = 0; i < count; i++) {
//     const hue = Math.round((78 + i * 360 / count) % 360);
//     const hsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
//     colors.push(parseColor(hsl).toString('hex').toUpperCase());
//   }
//   return colors;
// }

const defaultColors = [
  '#D8FF75',
  '#7FFF7A',
  '#7AFFCE',
  '#7AD7FF',
  '#7A7FFF',
  '#CE7AFF',
  '#FF7AD7',
  '#FF7A7F',
  '#FFCE7A',
  '#FFFFFF',
];

const TagColorPicker: Component<{
  color: string;
  onChange: (color: string) => void;
}> = (props) => {
  return <ColorSwatchPicker value={props.color} onChange={props.onChange} colors={defaultColors} />;
};

export type TagFormValues = {
  name: string;
  color: string;
  description: string;
  isVisible: boolean;
};

const TagForm: Component<{
  onSubmit: (values: TagFormValues) => unknown;
  initialValues?: {
    name?: string;
    color?: string;
    description?: string | null;
    isVisible?: boolean;
  };
  submitButton: JSX.Element;
}> = (props) => {
  const { t } = useI18n();
  const { form, Form, Field } = createForm({
    onSubmit: makeReturnVoidAsync(props.onSubmit),
    schema: v.object({
      name: v.pipe(
        v.string(),
        v.trim(),
        v.nonEmpty(t('tags.form.name.required')),
        v.maxLength(64, t('tags.form.name.max-length')),
        v.check(
          (name) => isValidTagName({ name: formatTagName({ name }) }),
          t('tags.form.name.invalid-hierarchy', { maxDepth: maxTagHierarchyDepth }),
        ),
      ),
      color: v.pipe(
        v.string(),
        v.trim(),
        v.nonEmpty(t('tags.form.color.required')),
        v.hexColor(t('tags.form.color.invalid')),
      ),
      description: v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(256, t('tags.form.description.max-length')),
      ),
      isVisible: v.boolean(),
    }),
    initialValues: {
      name: props.initialValues?.name,
      color: props.initialValues?.color,
      description: props.initialValues?.description ?? undefined,
      isVisible: props.initialValues?.isVisible ?? true,
    },
  });

  const getFormValues = () => getValues(form);

  return (
    <Form>
      <Field name="name">
        {(field, inputProps) => (
          <TextFieldRoot class="flex flex-col gap-1 mb-4">
            <TextFieldLabel for="name">{t('tags.form.name.label')}</TextFieldLabel>
            <TextField
              type="text"
              id="name"
              {...inputProps}
              autoFocus
              value={field.value}
              aria-invalid={Boolean(field.error)}
              placeholder={t('tags.form.name.placeholder')}
            />
            <div class="text-muted-foreground text-xs">{t('tags.form.name.hierarchy-hint')}</div>
            {field.error && <div class="text-red-500 text-sm">{field.error}</div>}
          </TextFieldRoot>
        )}
      </Field>

      <Field name="color">
        {(field) => (
          <TextFieldRoot class="flex flex-col gap-1 mb-4">
            <TextFieldLabel for="color">{t('tags.form.color.label')}</TextFieldLabel>
            <TagColorPicker
              color={field.value ?? ''}
              onChange={(color) => setValue(form, 'color', color)}
            />
            {field.error && <div class="text-red-500 text-sm">{field.error}</div>}
          </TextFieldRoot>
        )}
      </Field>

      <Field name="description">
        {(field, inputProps) => (
          <TextFieldRoot class="flex flex-col gap-1 mb-4">
            <TextFieldLabel for="description">
              {t('tags.form.description.label')}
              <span class="font-normal ml-1 text-muted-foreground">
                {t('tags.form.description.optional')}
              </span>
            </TextFieldLabel>
            <TextArea
              id="description"
              {...inputProps}
              value={field.value}
              aria-invalid={Boolean(field.error)}
              placeholder={t('tags.form.description.placeholder')}
            />
            {field.error && <div class="text-red-500 text-sm">{field.error}</div>}
          </TextFieldRoot>
        )}
      </Field>

      <Field name="isVisible" type="boolean">
        {(field) => (
          <Switch
            class="flex items-center justify-between gap-4 mb-2"
            checked={field.value ?? true}
            onChange={(isVisible) => setValue(form, 'isVisible', isVisible)}
          >
            <div class="flex flex-col gap-0.5">
              <SwitchLabel class="text-sm font-medium">
                {t('tags.form.visibility.label')}
              </SwitchLabel>
              <SwitchDescription class="text-muted-foreground text-xs">
                {t('tags.form.visibility.description')}
              </SwitchDescription>
            </div>

            <SwitchControl>
              <SwitchThumb />
            </SwitchControl>
          </Switch>
        )}
      </Field>

      <div class="flex flex-row-reverse justify-between items-center mt-6">
        {props.submitButton}

        <Show when={getFormValues().name}>
          <TagComponent name={getFormValues().name} color={getFormValues().color} />
        </Show>
      </div>
    </Form>
  );
};

export const CreateTagModal: Component<{
  children?: <T extends ValidComponent | HTMLElement>(props: DialogTriggerProps<T>) => JSX.Element;
  organizationId: string;
  onTagCreated?: (args: { tag: TagType }) => void | Promise<void>;
  initialName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}> = (props) => {
  const [getInternalIsModalOpen, setInternalIsModalOpen] = createSignal(false);
  const { t } = useI18n();
  const { getErrorMessage } = useI18nApiErrors({ t });

  // Use controlled state if provided, otherwise use internal state
  const getIsModalOpen = () => props.open ?? getInternalIsModalOpen();
  const setIsModalOpen = (value: boolean) => {
    props.onOpenChange?.(value);
    if (props.open === undefined) {
      setInternalIsModalOpen(value);
    }
  };

  const createTagMutation = useMutation(() => ({
    mutationFn: async (data: TagFormValues) =>
      createTag({
        name: data.name,
        color: data.color.toLowerCase(),
        description: data.description,
        isVisible: data.isVisible,
        organizationId: props.organizationId,
      }),
    onSuccess: async ({ tag }, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['organizations', props.organizationId, 'tags'],
        refetchType: 'all',
      });

      createToast({
        message: t('tags.create.success', { name: variables.name }),
        type: 'success',
      });

      setIsModalOpen(false);
      void props.onTagCreated?.({ tag });
    },
    onError: (error) => {
      createToast({
        message: getErrorMessage({ error }),
        type: 'error',
      });
    },
  }));

  return (
    <Dialog open={getIsModalOpen()} onOpenChange={setIsModalOpen}>
      {props.children && <DialogTrigger as={props.children} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tags.create')}</DialogTitle>
        </DialogHeader>

        <TagForm
          onSubmit={createTagMutation.mutateAsync}
          initialValues={{ color: '#D8FF75', name: props.initialName }}
          submitButton={
            <Button
              type="submit"
              isLoading={createTagMutation.isPending}
              disabled={!getIsModalOpen()} // As the dialog closing animation may still be running
            >
              {t('tags.create')}
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
};

const UpdateTagModal: Component<{
  children: (props: DialogTriggerProps) => JSX.Element;
  organizationId: string;
  tag: TagType;
}> = (props) => {
  const [getIsModalOpen, setIsModalOpen] = createSignal(false);
  const { t } = useI18n();
  const { getErrorMessage } = useI18nApiErrors({ t });

  const updateTagMutation = useMutation(() => ({
    mutationFn: async (data: TagFormValues) =>
      updateTag({
        name: data.name,
        color: data.color.toLowerCase(),
        description: data.description,
        isVisible: data.isVisible,
        organizationId: props.organizationId,
        tagId: props.tag.id,
      }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['organizations', props.organizationId],
        refetchType: 'all',
      });

      createToast({
        message: t('tags.update.success', { name: variables.name }),
        type: 'success',
      });

      setIsModalOpen(false);
    },
    onError: (error) => {
      createToast({
        message: getErrorMessage({ error }),
        type: 'error',
      });
    },
  }));

  return (
    <Dialog open={getIsModalOpen()} onOpenChange={setIsModalOpen}>
      <DialogTrigger as={props.children} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tags.update')}</DialogTitle>
        </DialogHeader>

        <TagForm
          onSubmit={updateTagMutation.mutate}
          initialValues={props.tag}
          submitButton={
            <Button
              type="submit"
              isLoading={updateTagMutation.isPending}
              disabled={!getIsModalOpen()} // As the dialog closing animation may still be running
            >
              {t('tags.update')}
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
};

/**
 * A row of the tags table, either a tag or a group of tags coming from the hierarchy
 * (eg the `LA` group of the `LA/School` tag).
 */
type TagTableRow = {
  path: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  tag?: TagType;
  description: string | null;
  documentsCount: number;
  createdAt?: Date;
};

export const TagsPage: Component = () => {
  const params = useParams();
  const { confirm } = useConfirmModal();
  const { t } = useI18n();
  const { getErrorMessage } = useI18nApiErrors({ t });

  const query = useQuery(() => ({
    queryKey: ['organizations', params.organizationId, 'tags'],
    queryFn: async () => fetchTags({ organizationId: params.organizationId }),
  }));

  const [getCollapsedPaths, setCollapsedPaths] = createSignal<Set<string>>(new Set());
  const [getSorting, setSorting] = createSignal<{ id: TagHierarchySort['key']; desc: boolean }>({
    id: 'name',
    desc: false,
  });

  const getIsPathExpanded = (path: string) => !getCollapsedPaths().has(path.toLowerCase());

  const togglePath = ({ path }: { path: string }) => {
    const normalizedPath = path.toLowerCase();

    setCollapsedPaths((collapsedPaths) => {
      const nextCollapsedPaths = new Set(collapsedPaths);

      if (nextCollapsedPaths.has(normalizedPath)) {
        nextCollapsedPaths.delete(normalizedPath);
      } else {
        nextCollapsedPaths.add(normalizedPath);
      }

      return nextCollapsedPaths;
    });
  };

  const getRows = createMemo<TagTableRow[]>(() => {
    const nodes = buildTagsHierarchy({ tags: query.data?.tags ?? [] });
    const sorting = getSorting();

    const rows = flattenTagsHierarchy({
      nodes,
      compare: createTagHierarchyComparator({
        sort: { key: sorting.id, direction: sorting.desc ? 'desc' : 'asc' },
      }),
      isExpanded: ({ node }) => getIsPathExpanded(node.path),
    });

    return rows.map(({ node, depth, hasChildren, isExpanded, documentsCount }) => ({
      path: node.path,
      name: node.name,
      depth,
      hasChildren,
      isExpanded,
      tag: node.tag,
      description: node.tag?.description ?? null,
      documentsCount,
      createdAt: node.tag?.createdAt,
    }));
  });

  const getTableSortingState = () => [{ id: getSorting().id, desc: getSorting().desc }];

  const updateTagVisibilityMutation = useMutation(() => ({
    mutationFn: async ({ tagId, isVisible }: { tagId: string; isVisible: boolean }) =>
      updateTag({ organizationId: params.organizationId, tagId, isVisible }),
    onSuccess: async ({ tag }) => {
      queryClient.setQueryData<{ tags: TagType[] }>(
        ['organizations', params.organizationId, 'tags'],
        (data) =>
          data
            ? {
                ...data,
                tags: data.tags.map((existingTag) =>
                  existingTag.id === tag.id ? tag : existingTag,
                ),
              }
            : data,
      );

      createToast({
        message: isTagVisible({ tag })
          ? t('tags.visibility.shown', { name: tag.name })
          : t('tags.visibility.hidden', { name: tag.name }),
        type: 'success',
      });
    },
    onError: (error) => {
      createToast({
        message: getErrorMessage({ error }),
        type: 'error',
      });
    },
  }));

  const del = async ({ tag }: { tag: TagType }) => {
    const confirmed = await confirm({
      title: t('tags.delete.confirm.title'),
      message: t('tags.delete.confirm.message', { name: tag.name }),
      cancelButton: {
        text: t('tags.delete.confirm.cancel-button'),
        variant: 'secondary',
      },
      confirmButton: {
        text: t('tags.delete.confirm.confirm-button'),
        variant: 'destructive',
      },
    });

    if (!confirmed) {
      return;
    }

    const [, error] = await safely(
      deleteTag({
        organizationId: params.organizationId,
        tagId: tag.id,
      }),
    );

    if (error) {
      createToast({
        message: getErrorMessage({ error }),
        type: 'error',
      });

      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ['organizations', params.organizationId],
      refetchType: 'all',
    });

    createToast({
      message: t('tags.delete.success'),
      type: 'success',
    });
  };

  const table = createSolidTable<TagTableRow>({
    get data() {
      return getRows();
    },
    // Sorting is handled by the hierarchy flattening so that tags stay grouped with their parents
    manualSorting: true,
    state: {
      get sorting() {
        return getTableSortingState();
      },
    },
    onSortingChange: (updaterOrValue) => {
      const sorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(getTableSortingState())
          : updaterOrValue;

      const [firstSorting] = sorting;

      setSorting({
        id: (firstSorting?.id ?? 'name') as TagHierarchySort['key'],
        desc: firstSorting?.desc ?? false,
      });
    },
    columns: [
      {
        header: () => t('tags.table.headers.tag'),
        accessorKey: 'name',
        sortingFn: 'alphanumeric',
        cell: ({ row }) => {
          const tagRow = row.original;

          return (
            <div
              class="flex items-center gap-1"
              style={{ 'padding-left': `${tagRow.depth * 16}px` }}
            >
              <Show when={tagRow.hasChildren} fallback={<div class="size-4 flex-shrink-0" />}>
                <button
                  type="button"
                  class="size-4 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
                  aria-label={tagRow.isExpanded ? t('tags.table.collapse') : t('tags.table.expand')}
                  onClick={() => togglePath({ path: tagRow.path })}
                >
                  <div
                    class={cn(
                      'size-3.5',
                      tagRow.isExpanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-right',
                    )}
                  />
                </button>
              </Show>

              <Show
                when={tagRow.tag}
                fallback={
                  <span class="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                    <div class="i-tabler-folder size-4" />
                    {tagRow.name}
                  </span>
                }
              >
                {(getTag) => (
                  <span class="inline-flex items-center gap-1.5">
                    <TagLink
                      id={getTag().id}
                      name={tagRow.name}
                      color={getTag().color}
                      description={getTag().description}
                      organizationId={params.organizationId}
                      class={cn(!isTagVisible({ tag: getTag() }) && 'text-muted-foreground')}
                      title={getTag().name}
                    />

                    <Show when={!isTagVisible({ tag: getTag() })}>
                      <div
                        class="i-tabler-eye-off size-3.5 text-muted-foreground"
                        title={t('tags.visibility.hidden-tag')}
                      />
                    </Show>
                  </span>
                )}
              </Show>
            </div>
          );
        },
      },
      {
        header: () => t('tags.table.headers.description'),
        accessorKey: 'description',
        sortingFn: 'alphanumeric',
        cell: (data) => (
          <span class="text-wrap">
            {data.getValue<string | null>() || (
              <span class="text-muted-foreground">{t('tags.form.no-description')}</span>
            )}
          </span>
        ),
      },
      {
        header: () => t('tags.table.headers.documents'),
        accessorKey: 'documentsCount',
        sortingFn: 'basic',
        cell: ({ row }) => {
          const tagRow = row.original;

          return (
            <Show
              when={tagRow.tag}
              fallback={
                <span class="inline-flex items-center gap-1 text-muted-foreground">
                  <div class="i-tabler-file-text size-5" />
                  {tagRow.documentsCount}
                </span>
              }
            >
              {(getTag) => (
                <A
                  href={makeDocumentSearchPermalink({
                    organizationId: params.organizationId,
                    search: { tags: [getTag()] },
                  })}
                  class="inline-flex items-center gap-1 hover:underline"
                >
                  <div class="i-tabler-file-text size-5 text-muted-foreground" />
                  {tagRow.documentsCount}
                </A>
              )}
            </Show>
          );
        },
      },
      {
        header: () => t('tags.table.headers.created'),
        accessorKey: 'createdAt',
        sortingFn: 'datetime',
        cell: ({ row }) => (
          <Show when={row.original.createdAt}>
            {(getCreatedAt) => <RelativeTime date={getCreatedAt()} class="text-muted-foreground" />}
          </Show>
        ),
      },
      {
        id: 'actions',
        header: () => <div class="text-right">{t('tags.table.headers.actions')}</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const tagRow = row.original;

          return (
            <Show when={tagRow.tag}>
              {(getTag) => (
                <div class="flex gap-2 justify-end">
                  <Button
                    size="icon"
                    variant="outline"
                    class="size-7"
                    title={
                      isTagVisible({ tag: getTag() })
                        ? t('tags.visibility.hide-tooltip')
                        : t('tags.visibility.show-tooltip')
                    }
                    aria-label={
                      isTagVisible({ tag: getTag() })
                        ? t('tags.visibility.hide-tooltip')
                        : t('tags.visibility.show-tooltip')
                    }
                    isLoading={
                      updateTagVisibilityMutation.isPending &&
                      updateTagVisibilityMutation.variables?.tagId === getTag().id
                    }
                    onClick={() =>
                      updateTagVisibilityMutation.mutate({
                        tagId: getTag().id,
                        isVisible: !isTagVisible({ tag: getTag() }),
                      })
                    }
                  >
                    <div
                      class={cn(
                        'size-4',
                        isTagVisible({ tag: getTag() }) ? 'i-tabler-eye' : 'i-tabler-eye-off',
                      )}
                    />
                  </Button>

                  <UpdateTagModal organizationId={params.organizationId} tag={getTag()}>
                    {(props) => (
                      <Button size="icon" variant="outline" class="size-7" {...props}>
                        <div class="i-tabler-edit size-4" />
                      </Button>
                    )}
                  </UpdateTagModal>

                  <Button
                    size="icon"
                    variant="outline"
                    class="size-7 text-red"
                    onClick={async () => del({ tag: getTag() })}
                  >
                    <div class="i-tabler-trash size-4" />
                  </Button>
                </div>
              )}
            </Show>
          );
        },
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div class="p-6 mt-4 pb-32 mx-auto max-w-5xl">
      <Suspense>
        <Show when={query.data?.tags}>
          {(getTags) => (
            <Show
              when={getTags().length > 0}
              fallback={
                <EmptyState
                  title={t('tags.no-tags.title')}
                  icon="i-tabler-tag"
                  description={t('tags.no-tags.description')}
                  cta={
                    <CreateTagModal organizationId={params.organizationId}>
                      {(props) => (
                        <Button {...props}>
                          <div class="i-tabler-plus size-4 mr-2" />
                          {t('tags.no-tags.create-tag')}
                        </Button>
                      )}
                    </CreateTagModal>
                  }
                />
              }
            >
              <div class="flex justify-between sm:items-center pb-6 gap-4 flex-col sm:flex-row">
                <div>
                  <h2 class="text-xl font-bold ">{t('tags.title')}</h2>

                  <p class="text-muted-foreground mt-1">{t('tags.description')}</p>
                </div>

                <div class="flex-shrink-0">
                  <CreateTagModal organizationId={params.organizationId}>
                    {(props) => (
                      <Button class="w-full" {...props}>
                        <div class="i-tabler-plus size-4 mr-2" />
                        {t('tags.create')}
                      </Button>
                    )}
                  </CreateTagModal>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <For each={table.getHeaderGroups()}>
                    {(headerGroup) => (
                      <TableRow>
                        <For each={headerGroup.headers}>
                          {(header) => (
                            <TableHead>
                              <Show
                                when={header.column.getCanSort()}
                                fallback={flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              >
                                <button
                                  class="flex items-center gap-1 cursor-pointer select-none"
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  <Show when={header.column.getIsSorted() === 'asc'}>
                                    <div class="i-tabler-arrow-down size-3.5" />
                                  </Show>
                                  <Show when={header.column.getIsSorted() === 'desc'}>
                                    <div class="i-tabler-arrow-up size-3.5" />
                                  </Show>
                                  <Show when={!header.column.getIsSorted()}>
                                    <div class="i-tabler-arrows-sort size-3.5 opacity-40" />
                                  </Show>
                                </button>
                              </Show>
                            </TableHead>
                          )}
                        </For>
                      </TableRow>
                    )}
                  </For>
                </TableHeader>
                <TableBody>
                  <For each={table.getRowModel().rows}>
                    {(row) => (
                      <TableRow>
                        <For each={row.getVisibleCells()}>
                          {(cell) => (
                            <TableCell>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          )}
                        </For>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </Show>
          )}
        </Show>
      </Suspense>
    </div>
  );
};
