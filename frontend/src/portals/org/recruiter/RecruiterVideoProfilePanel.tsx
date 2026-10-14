// ============================================================
// Clyptus Job Portal - Recruiter Portal
// Component: RecruiterVideoProfilePanel
// Watch panel for candidate's AI Video Profile in the recruiter view
// ============================================================

import React from 'react';
import {
  Calendar,
  Clock,
  FileVideo,
  Play,
  Video,
  VideoOff,
} from 'lucide-react';
import { TalentDetail } from './types';

interface RecruiterVideoProfilePanelProps {
  candidate: TalentDetail;
}

export const RecruiterVideoProfilePanel: React.FC<RecruiterVideoProfilePanelProps> = ({
  candidate,
}) => {
  const vp = candidate.videoProfile;
  const orgToken =
    sessionStorage.getItem('clyptus_org_token') ||
    localStorage.getItem('clyptus_org_token') ||
    '';

  const streamUrl = `/api/v1/recruiter/candidates/${candidate.id}/video-profile/stream${
    orgToken ? `?token=${encodeURIComponent(orgToken)}` : ''
  }`;

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

  return (
    <section className="r-card r-video-profile-panel" aria-labelledby="r-video-heading">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8DFD4]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C]">
            <Video size={16} />
          </div>
          <h2 id="r-video-heading" className="text-base font-semibold text-[#1B1A17] m-0">
            Video Profile
          </h2>
        </div>

        {vp?.hasVideo && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
            Available
          </span>
        )}
      </div>

      {vp?.hasVideo ? (
        <div className="space-y-3">
          {/* Video Player */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-[#E8DFD4]">
            <video
              src={streamUrl}
              controls
              preload="metadata"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Details & Metadata */}
          <div className="flex items-center justify-between text-xs text-[#5C564E] pt-1 border-t border-[#E8DFD4]/60">
            <div className="flex items-center gap-1.5 font-medium text-[#1B1A17]">
              <Clock size={13} className="text-[#C2410C]" />
              <span>Duration: {formatDuration(vp.durationSeconds)}</span>
            </div>

            {vp.createdAt && (
              <div className="flex items-center gap-1.5 text-[#5C564E]">
                <Calendar size={13} />
                <span>Uploaded {formatDate(vp.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 px-4 text-center text-xs text-[#5C564E] bg-[#FAF6F1]/50 rounded-xl border border-dashed border-[#E8DFD4] space-y-1.5">
          <VideoOff size={22} className="mx-auto text-[#8C8479] opacity-70 mb-1" />
          <p className="font-medium text-[#1B1A17]">No Video Profile Available</p>
          <p className="text-[11px] text-[#8C8479]">
            This candidate has not recorded or uploaded an AI video profile yet.
          </p>
        </div>
      )}
    </section>
  );
};
