<script lang="ts">
  import ControlAppBar from '#lib/components/shared-components/ControlAppBar.svelte';
  import { timeBeforeShowLoadingSpinner } from '#lib/constants.ts';
  import { executeMutation, queryClient } from '#lib/queries/client.ts';
  import { createPersonMutation, getAllPeopleQuery, reassignFacesMutation } from '#lib/queries/person.query.ts';
  import { handleError } from '#lib/utils/handle-error.ts';
  import { type AssetFaceUpdateItem, type PersonResponseDto } from '@immich/sdk';
  import { Button, toastManager } from '@immich/ui';
  import { mdiMerge, mdiPlus } from '@mdi/js';
  import { createQuery, type MutationMeta } from '@tanstack/svelte-query';
  import { type Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import FaceThumbnail from './FaceThumbnail.svelte';
  import PeopleList from './PeopleList.svelte';

  interface Props {
    assetIds: string[];
    personAssets: PersonResponseDto;
    onConfirm: () => void;
    onClose: () => void;
    header?: Snippet;
    merge?: Snippet;
  }

  let { assetIds, personAssets, onConfirm, onClose, header, merge }: Props = $props();

  const query = createQuery(
    () => ({ ...getAllPeopleQuery({ withHidden: false }), staleTime: 0 }),
    () => queryClient,
  );
  const people = $derived(query.data?.people ?? []);
  let selectedPerson: PersonResponseDto | null = $state(null);
  let disableButtons = $state(false);
  let showLoadingSpinnerCreate = $state(false);
  let showLoadingSpinnerReassign = $state(false);
  let hasSelection = $state(false);
  let screenHeight: number = $state(0);

  let peopleToNotShow = $derived(selectedPerson ? [personAssets, selectedPerson] : [personAssets]);

  const selectedPeople: AssetFaceUpdateItem[] = Array.from(assetIds, (assetId) => ({
    assetId,
    personId: personAssets.id,
  }));

  const handleSelectedPerson = (person: PersonResponseDto) => {
    if (selectedPerson && selectedPerson.id === person.id) {
      handleRemoveSelectedPerson();
      return;
    }
    selectedPerson = person;
    hasSelection = true;
  };

  const handleRemoveSelectedPerson = () => {
    selectedPerson = null;
    hasSelection = false;
  };

  const handleCreate = async () => {
    const timeout = setTimeout(() => (showLoadingSpinnerCreate = true), timeBeforeShowLoadingSpinner);

    disableButtons = true;
    const meta: MutationMeta = { error: { toast: 'errors.unable_to_reassign_assets_new_person' } };
    const person = await executeMutation(() => createPersonMutation(meta), [{ personCreateDto: {} }]);
    if (person) {
      await executeMutation(
        () => reassignFacesMutation(meta),
        [{ id: person.id, assetFaceUpdateDto: { data: selectedPeople } }],
        {
          onSuccess: () =>
            toastManager.primary($t('reassigned_assets_to_new_person', { values: { count: assetIds.length } })),
        },
      );
    }
    clearTimeout(timeout);

    showLoadingSpinnerCreate = false;
    onConfirm();
  };

  const handleReassign = async () => {
    const timeout = setTimeout(() => (showLoadingSpinnerReassign = true), timeBeforeShowLoadingSpinner);
    disableButtons = true;
    if (selectedPerson) {
      const values = { count: assetIds.length, name: selectedPerson.name || null };
      await executeMutation(
        () => reassignFacesMutation({ error: { toast: false } }),
        [{ id: selectedPerson.id, assetFaceUpdateDto: { data: selectedPeople } }],
        {
          onSuccess: () => toastManager.primary($t('reassigned_assets_to_existing_person', { values })),
          onError: (error) => handleError(error, $t('errors.unable_to_reassign_assets_existing_person', { values })),
        },
      );
    }
    clearTimeout(timeout);

    showLoadingSpinnerReassign = false;
    onConfirm();
  };
</script>

<svelte:window bind:innerHeight={screenHeight} />

<section
  transition:fly={{ y: 500, duration: 100, easing: quintOut }}
  class="absolute inset-s-0 top-0 size-full bg-light"
>
  <ControlAppBar {onClose}>
    {#snippet leading()}
      {@render header?.()}
      <div></div>
    {/snippet}
    {#snippet trailing()}
      <div class="flex gap-4">
        <Button
          shape="round"
          title={$t('create_new_person_hint')}
          leadingIcon={mdiPlus}
          loading={showLoadingSpinnerCreate}
          size="small"
          disabled={disableButtons || hasSelection}
          onclick={handleCreate}
        >
          {$t('create_new_person')}</Button
        >
        <Button
          size="small"
          shape="round"
          title={$t('reassing_hint')}
          leadingIcon={mdiMerge}
          loading={showLoadingSpinnerReassign}
          disabled={disableButtons || !hasSelection}
          onclick={handleReassign}
        >
          {$t('reassign')}
        </Button>
      </div>
    {/snippet}
  </ControlAppBar>
  {@render merge?.()}
  <section class="px-17.5 pt-25">
    <section id="merge-face-selector relative">
      {#if selectedPerson !== null}
        <div class="mb-10 h-50 place-content-center place-items-center">
          <p class="mb-4 text-center uppercase dark:text-white">Choose matching faces to re assign</p>

          <div class="grid grid-flow-col-dense place-content-center place-items-center gap-4">
            <FaceThumbnail
              person={selectedPerson}
              border
              circle
              selectable
              thumbnailSize={180}
              onClick={handleRemoveSelectedPerson}
            />
          </div>
        </div>
      {/if}
      <PeopleList {people} {peopleToNotShow} {screenHeight} onSelect={handleSelectedPerson} />
    </section>
  </section>
</section>
