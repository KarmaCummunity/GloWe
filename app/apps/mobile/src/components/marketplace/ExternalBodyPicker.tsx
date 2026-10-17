// Searchable picker for verified external organisations (public.external_bodies)
// required by routed worlds (medical / animals / environment, rule 0266).
// Reuses SearchablePicker so it looks and behaves like the City/Street pickers.

import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { externalBodyLabel, matchExternalBody, type ExternalBodyOption } from '@kc/domain';
import { SearchablePicker } from '../SearchablePicker/SearchablePicker';
import { marketplaceRepository } from '../../services/marketplaceComposition';

interface Props {
  readonly worldSlug: string;
  readonly value: { id: string; name: string } | null;
  readonly onChange: (selection: { id: string; name: string }) => void;
  readonly disabled?: boolean;
}

export function ExternalBodyPicker({ worldSlug, value, onChange, disabled }: Props) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error, refetch } = useQuery<ExternalBodyOption[]>({
    queryKey: ['marketplace', 'externalBodies', worldSlug],
    queryFn: () => marketplaceRepository().searchExternalBodies(worldSlug),
    staleTime: 1000 * 60 * 30,
  });

  const renderRow = useCallback(
    (b: ExternalBodyOption) => ({ id: b.bodyId, name: externalBodyLabel(b, i18n.language) }),
    [i18n.language],
  );

  return (
    <SearchablePicker<ExternalBodyOption>
      title={t('marketplace.orgPicker.title')}
      placeholder={t('marketplace.orgPicker.placeholder')}
      value={value}
      items={data ?? null}
      isLoading={isLoading}
      error={error}
      disabled={disabled}
      onSelect={onChange}
      matchItem={matchExternalBody}
      renderRow={renderRow}
      emptyText={t('marketplace.orgPicker.empty')}
      errorText={t('marketplace.orgPicker.error')}
      onErrorRetry={() => void refetch()}
    />
  );
}
