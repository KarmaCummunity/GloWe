// FR-POST-022 — save/unsave toggle for PostMenuSheet.
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getIsPostSavedUseCase,
  getSavePostUseCase,
  getUnsavePostUseCase,
} from '../services/savedPostsComposition';
import { useAuthStore } from '../store/authStore';
import { useFeedSessionStore } from '../store/feedSessionStore';
import { hapticLightImpact } from '../lib/haptics';

export function usePostSavedActions(postId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.userId ?? null);

  const savedQuery = useQuery({
    queryKey: ['post-saved', postId, userId],
    queryFn: () => getIsPostSavedUseCase().execute(postId),
    enabled: Boolean(userId),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['post-saved', postId] });
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: ['saved-posts', userId] });
    }
  }, [postId, queryClient, userId]);

  const toast = useFeedSessionStore.getState().showEphemeralToast;

  const saveMutation = useMutation({
    mutationFn: () => getSavePostUseCase().execute(postId),
    onSuccess: () => {
      hapticLightImpact();
      toast(t('post.saveSuccess'), 'success');
      invalidate();
    },
    onError: () => {
      toast(t('post.saveError'), 'error', 2800);
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => getUnsavePostUseCase().execute(postId),
    onSuccess: () => {
      toast(t('post.unsaveSuccess'), 'success');
      invalidate();
    },
    onError: () => {
      toast(t('post.unsaveError'), 'error', 2800);
    },
  });

  const isSaved = savedQuery.data === true;
  const busy = saveMutation.isPending || unsaveMutation.isPending;

  const toggleSave = useCallback(() => {
    if (busy) return;
    if (isSaved) unsaveMutation.mutate();
    else saveMutation.mutate();
  }, [busy, isSaved, saveMutation, unsaveMutation]);

  return {
    isSaved,
    isLoading: savedQuery.isLoading,
    busy,
    toggleSave,
  };
}
