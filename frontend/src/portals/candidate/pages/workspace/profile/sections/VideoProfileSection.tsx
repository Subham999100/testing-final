// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: VideoProfileSection
// Bottom section of Candidate Profile featuring:
// 1. "AI Video Profile" card with inline player, recording, uploading,
//    replace & delete with ConfirmDialog
// 2. "AI Video Interview" card with 15-minute simulation & "Coming soon" modal
// 3. Server-state driven mutual exclusivity (videoMode: NONE | PROFILE | INTERVIEW)
// ============================================================

import React, { useState } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  FileVideo,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { CandidateFullProfile } from '../../../../lib/types';
import { useVideoProfile } from '../hooks/useVideoProfile';
import { VideoRecordModal } from './VideoRecordModal';
import { VideoUploadModal } from './VideoUploadModal';
import { VideoInterviewModal } from './VideoInterviewModal';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { getCandidateToken } from '../../../../lib/api';

interface VideoProfileSectionProps {
  profile: CandidateFullProfile;
}

export const VideoProfileSection: React.FC<VideoProfileSectionProps> = ({ profile }) => {
  const {
    videoProfile,
    isLoading,
    uploadMutation,
    deleteMutation,
    uploadProgress,
  } = useVideoProfile();

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Derive state from server videoProfile or fallback to candidate profile fields
  const hasVideo = Boolean(videoProfile?.hasVideo || profile.videoProfile);
  const videoMode = videoProfile?.videoMode || profile.videoMode || 'NONE';
  const interviewStatus =
    videoProfile?.videoInterviewStatus || profile.videoInterviewStatus || 'NOT_STARTED';

  // Mutual Exclusivity Rules:
  // 1. If video profile exists -> Interview disabled with note: "Delete your video profile to take the video interview instead"
  // 2. If interview chosen/started/completed -> Video profile disabled with matching note
  const isProfileDisabled =
    videoMode === 'INTERVIEW' ||
    interviewStatus === 'IN_PROGRESS' ||
    interviewStatus === 'COMPLETED';

  const isInterviewDisabled =
    hasVideo || videoMode === 'PROFILE';

  const token = getCandidateToken();
  const streamUrl = `/api/v1/candidate/video-profile/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const thumbnailUrl = `/api/v1/candidate/video-profile/thumbnail${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  const formatDuration = (secs?: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Handlers
  const handleSaveRecorded = async (file: File, durationSeconds: number) => {
    try {
      await uploadMutation.mutateAsync({
        file,
        consent: true,
        clientDurationSeconds: durationSeconds,
      });
      setIsRecordModalOpen(false);
    } catch (err) {
      // Re-throw so VideoRecordModal catches and displays retry state without closing
      throw err;
    }
  };

  const handleSaveUploaded = async (file: File, durationSeconds: number) => {
    try {
      await uploadMutation.mutateAsync({
        file,
        consent: true,
        clientDurationSeconds: durationSeconds,
      });
      setIsUploadModalOpen(false);
    } catch (err) {
      throw err;
    }
  };


  const handleConfirmDelete = async () => {
    await deleteMutation.mutateAsync();
    setIsDeleteDialogOpen(false);
  };

  return (
    <section
      className="space-y-4"
      aria-labelledby="video-options-heading"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="video-options-heading"
            className="text-lg sm:text-xl font-semibold text-[#1B1A17] font-serif tracking-tight flex items-center gap-2"
          >
            <span>AI Video Options</span>
            <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#FFF1E6] text-[#C2410C] border border-[#C2410C]/20">
              Interactive
            </span>
          </h2>
          <p className="text-xs text-[#5C564E] mt-0.5">
            Boost your profile engagement by introducing yourself on video or testing your interview readiness.
          </p>
        </div>
      </div>

      {/* Two Cards Side by Side (Stacked on Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* CARD 1: AI VIDEO PROFILE */}
        <div
          className={`flex flex-col justify-between rounded-2xl border transition-all ${
            isProfileDisabled
              ? 'bg-[#FAF6F1]/50 border-[#E8DFD4] opacity-60'
              : 'bg-white border-[#E8DFD4] shadow-xs hover:shadow-sm'
          } p-5 sm:p-6`}
        >
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C] shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1B1A17] font-serif">
                    AI Video Profile
                  </h3>
                  <p className="text-xs text-[#5C564E]">
                    30 seconds to 3 minutes introductory video
                  </p>
                </div>
              </div>

              {hasVideo && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>

            {/* Mutual Exclusivity Note if disabled */}
            {isProfileDisabled && (
              <div className="p-3 rounded-xl bg-[#FFF8EE] border border-[#FDBA74]/50 text-xs text-[#7C2D12] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Reset or complete your AI Video Interview to record or upload a video profile instead.
                </p>
              </div>
            )}

            {/* When Video DOES NOT Exist */}
            {!hasVideo && (
              <div className="space-y-3">
                <p className="text-xs text-[#5C564E] leading-relaxed">
                  Introduce yourself to hiring managers in your own voice. Highlight your background, passions, and top achievements in a quick 30s&ndash;3m video.
                </p>

                <div className="p-3.5 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4] space-y-1.5 text-xs text-[#5C564E]">
                  <div className="flex items-center gap-2 text-[#1B1A17] font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Duration: 30s minimum &middot; 3 min maximum</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#1B1A17] font-medium">
                    <FileVideo className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Formats: MP4, WebM, MOV up to 100 MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* When Video EXISTS: Inline Player & Details */}
            {hasVideo && (
              <div className="space-y-3">
                {/* Inline Player */}
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#E8DFD4] shadow-inner group">
                  <video
                    src={streamUrl}
                    poster={videoProfile?.hasThumbnail ? thumbnailUrl : undefined}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Metadata & Status */}
                <div className="flex items-center justify-between text-xs text-[#5C564E] pt-1 border-t border-[#E8DFD4]/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Duration: <strong className="text-[#1B1A17]">{formatDuration(videoProfile?.durationSeconds)}</strong></span>
                  </div>

                  {videoProfile?.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5C564E]" />
                      <span>Uploaded {formatDate(videoProfile.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-4 border-t border-[#E8DFD4]/60 flex items-center justify-between gap-2.5">
            {!hasVideo ? (
              <div className="flex items-center gap-2.5 w-full">
                <button
                  type="button"
                  disabled={isProfileDisabled || uploadMutation.isPending}
                  onClick={() => setIsRecordModalOpen(true)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                    isProfileDisabled
                      ? 'bg-[#E8DFD4] text-[#8C8479] cursor-not-allowed'
                      : 'bg-[#C2410C] hover:bg-[#9A3412] text-white cursor-pointer'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Record Video</span>
                </button>

                <button
                  type="button"
                  disabled={isProfileDisabled || uploadMutation.isPending}
                  onClick={() => setIsUploadModalOpen(true)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    isProfileDisabled
                      ? 'border-[#E8DFD4] text-[#8C8479] cursor-not-allowed'
                      : 'border-[#D7C9BA] hover:border-[#C2410C] text-[#1B1A17] hover:bg-[#FAF6F1] cursor-pointer'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(true)}
                    disabled={isProfileDisabled || uploadMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D7C9BA] hover:border-[#C2410C] text-[#1B1A17] text-xs font-semibold hover:bg-[#FAF6F1] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FCA5A5] text-xs font-semibold transition-colors"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: AI VIDEO INTERVIEW */}
        <div
          className={`flex flex-col justify-between rounded-2xl border transition-all ${
            isInterviewDisabled
              ? 'bg-[#FAF6F1]/50 border-[#E8DFD4] opacity-70'
              : 'bg-white border-[#E8DFD4] shadow-xs hover:shadow-sm'
          } p-5 sm:p-6`}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C] shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1B1A17] font-serif">
                    AI Video Interview
                  </h3>
                  <p className="text-xs text-[#5C564E]">
                    15-minute timed AI interview
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF1E6] text-[#C2410C] border border-[#C2410C]/20">
                <Sparkles className="w-3 h-3" /> Coming Soon
              </span>
            </div>

            {/* Mutual Exclusivity Note if disabled */}
            {isInterviewDisabled && (
              <div className="p-3 rounded-xl bg-[#FFF8EE] border border-[#FDBA74]/50 text-xs text-[#7C2D12] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Delete your video profile to take the video interview instead.
                </p>
              </div>
            )}

            {/* Description & Details */}
            <p className="text-xs text-[#5C564E] leading-relaxed">
              Complete a 15-minute guided AI video interview. Practice answering realistic industry questions, test your readiness, and earn verified communication indicators for hiring teams.
            </p>

            <div className="p-3.5 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4] space-y-2 text-xs text-[#5C564E]">
              <div className="flex items-center gap-2 text-[#1B1A17] font-medium">
                <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Format: 5 questions &middot; 15 minutes structured</span>
              </div>
              <div className="flex items-center gap-2 text-[#1B1A17] font-medium">
                <BrainCircuit className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Real-time speech fluency & answer structure insights</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-5 pt-4 border-t border-[#E8DFD4]/60">
            <button
              type="button"
              disabled={isInterviewDisabled}
              onClick={() => setIsInterviewModalOpen(true)}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                isInterviewDisabled
                  ? 'bg-[#E8DFD4] text-[#8C8479] cursor-not-allowed'
                  : 'bg-[#C2410C] hover:bg-[#9A3412] text-white cursor-pointer'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Interview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Record Modal */}
      <VideoRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={handleSaveRecorded}
        isUploading={uploadMutation.isPending}
        uploadProgress={uploadProgress}
      />

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleSaveUploaded}
        isUploading={uploadMutation.isPending}
        uploadProgress={uploadProgress}
      />

      {/* AI Interview Coming Soon Modal */}
      <VideoInterviewModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Video Profile?"
        message="Are you sure you want to delete your AI video profile? This will permanently remove your recorded video, thumbnail, and analysis report, and allow you to take the AI video interview instead."
        confirmLabel="Yes, Delete Video"
        cancelLabel="Keep Video"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </section>
  );
};
