// ============================================================
// Clyptus Job Portal - Candidate Portal
// Hook: useVideoProfile
// Queries and manages candidate video profile state, upload progress,
// and delete operations with cache invalidation
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../../../../lib/api';
import { candidateQueryKeys } from '../../../../lib/queryKeys';
import { VideoProfileResponse } from '../../../../lib/video-profile.constants';
import { toast } from '@/portals/org/ui/toast';
import { useState } from 'react';

export function useVideoProfile() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const query = useQuery<VideoProfileResponse>({
    queryKey: candidateQueryKeys.videoProfile,
    queryFn: async () => {
      return candidateApi.getVideoProfile<VideoProfileResponse>();
    },
    staleTime: 30000,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      consent,
      clientDurationSeconds,
    }: {
      file: Blob | File;
      consent: boolean;
      clientDurationSeconds?: number;
    }) => {
      setUploadProgress(0);
      return candidateApi.uploadVideoProfile<VideoProfileResponse>(
        file,
        consent,
        clientDurationSeconds,
        (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(candidateQueryKeys.videoProfile, data);
      void queryClient.invalidateQueries({ queryKey: candidateQueryKeys.videoProfile });
      void queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      setUploadProgress(100);
      toast.success('Video profile uploaded successfully!');
    },
    onError: (err: any) => {
      setUploadProgress(0);
      const rawMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to upload video profile.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return candidateApi.deleteVideoProfile<{ success: boolean; message: string }>();
    },
    onSuccess: () => {
      queryClient.setQueryData<VideoProfileResponse>(candidateQueryKeys.videoProfile, (prev) => {
        return {
          hasVideo: false,
          videoMode: 'NONE',
          videoInterviewStatus: prev?.videoInterviewStatus || 'NOT_STARTED',
          canRecordProfile: true,
          canStartInterview: true,
          modeConflictNote: null,
        };
      });
      void queryClient.invalidateQueries({ queryKey: candidateQueryKeys.videoProfile });
      void queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      toast.success('Video profile removed successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete video profile.');
    },
  });

  return {
    ...query,
    videoProfile: query.data,
    uploadMutation,
    deleteMutation,
    uploadProgress,
    setUploadProgress,
  };
}
