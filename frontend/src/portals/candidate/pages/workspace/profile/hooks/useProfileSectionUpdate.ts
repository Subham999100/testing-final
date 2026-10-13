// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Hook: useProfileSectionUpdate
// Handles per-section PATCH /candidate/profile with optimistic updates,
// cache rollback on failure, and server score recalculation
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../../../../lib/api';
import { candidateQueryKeys } from '../../../../lib/queryKeys';
import { CandidateFullProfile, UpdateCandidateProfileRequest } from '../../../../lib/types';
import { toast } from '@/portals/org/ui/toast';

export function useProfileSectionUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<UpdateCandidateProfileRequest>) => {
      return candidateApi.updateProfile<CandidateFullProfile>(payload);
    },
    onMutate: async (newSectionData) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: candidateQueryKeys.profile });

      // Snapshot previous profile
      const previousProfile = queryClient.getQueryData<CandidateFullProfile>(
        candidateQueryKeys.profile,
      );

      // Optimistically update profile in cache
      if (previousProfile) {
        queryClient.setQueryData<CandidateFullProfile>(candidateQueryKeys.profile, {
          ...previousProfile,
          ...newSectionData,
        });
      }

      return { previousProfile };
    },
    onError: (err: any, _variables, context) => {
      // Rollback to previous state
      if (context?.previousProfile) {
        queryClient.setQueryData(candidateQueryKeys.profile, context.previousProfile);
      }
      toast.error(err?.message || 'Failed to update section. Please try again.');
    },
    onSuccess: (updatedProfile) => {
      // Set the returned full profile with fresh server score
      if (updatedProfile) {
        queryClient.setQueryData(candidateQueryKeys.profile, updatedProfile);
      }
      toast.success('Section updated successfully');
    },
    onSettled: () => {
      // Ensure server data and scoring breakdown are synchronized
      void queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: candidateQueryKeys.me });
    },
  });
}
