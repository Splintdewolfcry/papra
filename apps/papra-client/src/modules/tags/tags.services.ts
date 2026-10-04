import type { AsDto } from '../shared/http/http-client.types';
import type { Tag } from './tags.types';
import { apiClient } from '../shared/http/api-client';
import { coerceDates } from '../shared/http/http-client.models';

export async function fetchTags({ organizationId }: { organizationId: string }) {
  const { tags } = await apiClient<{ tags: AsDto<Tag>[] }>({
    path: `/api/organizations/${organizationId}/tags`,
    method: 'GET',
  });

  return {
    tags: tags.map(coerceDates),
  };
}

export async function createTag({
  organizationId,
  name,
  color,
  description,
  isVisible = true,
}: {
  organizationId: string;
  name: string;
  color: string;
  description: string;
  isVisible?: boolean;
}) {
  const { tag } = await apiClient<{ tag: AsDto<Tag> }>({
    path: `/api/organizations/${organizationId}/tags`,
    method: 'POST',
    body: { name, color, description, isVisible },
  });

  return {
    tag: coerceDates(tag),
  };
}

export async function updateTag({
  organizationId,
  tagId,
  name,
  color,
  description,
  isVisible,
}: {
  organizationId: string;
  tagId: string;
  name?: string;
  color?: string;
  description?: string;
  isVisible?: boolean;
}) {
  const { tag } = await apiClient<{ tag: AsDto<Tag> }>({
    path: `/api/organizations/${organizationId}/tags/${tagId}`,
    method: 'PUT',
    body: { name, color, description, isVisible },
  });

  return {
    tag: coerceDates(tag),
  };
}

export async function deleteTag({
  organizationId,
  tagId,
}: {
  organizationId: string;
  tagId: string;
}) {
  await apiClient({
    path: `/api/organizations/${organizationId}/tags/${tagId}`,
    method: 'DELETE',
  });
}

export async function addTagToDocument({
  organizationId,
  documentId,
  tagId,
}: {
  organizationId: string;
  documentId: string;
  tagId: string;
}) {
  await apiClient({
    path: `/api/organizations/${organizationId}/documents/${documentId}/tags`,
    method: 'POST',
    body: { tagId },
  });
}

export async function removeTagFromDocument({
  organizationId,
  documentId,
  tagId,
}: {
  organizationId: string;
  documentId: string;
  tagId: string;
}) {
  await apiClient({
    path: `/api/organizations/${organizationId}/documents/${documentId}/tags/${tagId}`,
    method: 'DELETE',
  });
}
