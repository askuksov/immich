import { getStorageTemplateOptions } from '@immich/sdk';
import { queryOptions } from '@tanstack/svelte-query';

export const getStorageTemplateOptionsQuery = () =>
  queryOptions({
    queryKey: ['system-config', 'storage-template-options'],
    queryFn: ({ signal }) => getStorageTemplateOptions({ signal }),
  });
