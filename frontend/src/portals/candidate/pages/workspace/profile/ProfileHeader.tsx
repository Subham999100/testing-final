// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: ProfileHeader
// Overlaps banner with 96px avatar (48px overlap, 4px ground ring #FAF6F1)
// Monogram fallback, camera action menu, serif name (26px), headline,
// "City · Open to work" line, and primary Edit Profile CTA
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Trash2, Upload, Pencil, CheckCircle2, Share2 } from 'lucide-react';
import { PhotoCropModal } from '../../../components/PhotoCropModal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { EditProfileModal } from './EditProfileModal';
import { ShareProfileModal } from './ShareProfileModal';
import { CandidateFullProfile } from '../../../lib/types';
import { candidateApi } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { candidateQueryKeys } from '../../../lib/queryKeys';
import { toast } from '@/portals/org/ui/toast';

export interface ProfileHeaderProps {
  profile: CandidateFullProfile;
  isLoading?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, isLoading = false }) => {
  const queryClient = useQueryClient();
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletePhotoOpen, setIsDeletePhotoOpen] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isShareProfileOpen, setIsShareProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);

  const [avatarImage, setAvatarImage] = useState<string | null>(profile.photoUrl || null);

  // Sync avatarImage when profile prop changes
  useEffect(() => {
    setAvatarImage(profile.photoUrl || null);
  }, [profile.photoUrl]);

  // Close photo menu on outside click or Escape key
  useEffect(() => {
    if (!isPhotoMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPhotoMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setIsPhotoMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPhotoMenuOpen]);

  const initials = (
    (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '')
  ).toUpperCase() || 'C';

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile photo must be less than 5 MB.');
      return;
    }

    setSelectedPhotoFile(file);
    setIsCropModalOpen(true);
    setIsPhotoMenuOpen(false);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob, previewUrl: string) => {
    console.log('[ProfileHeader] Apply clicked, starting upload flow', {
      blobSize: croppedBlob.size,
      blobType: croppedBlob.type,
      previewUrl,
    });

    // 1. Immediately update UI state with local preview blob URL
    setAvatarImage(previewUrl);
    console.log('[ProfileHeader] State updated with immediate preview', previewUrl);

    // 2. Upload to backend
    setIsUploadingPhoto(true);
    console.log('[ProfileHeader] Upload request sent to /candidate/profile/photo');

    try {
      const res = await candidateApi.uploadPhoto(croppedBlob);
      console.log('[ProfileHeader] Upload response received', res);

      const returnedUrl = res?.photoUrl || previewUrl;
      const cacheBustedUrl = returnedUrl.startsWith('data:')
        ? returnedUrl
        : `${returnedUrl}?t=${Date.now()}`;

      setAvatarImage(cacheBustedUrl);
      console.log('[ProfileHeader] State updated with cache-busted uploaded URL', cacheBustedUrl);

      toast.success('Profile photo updated.');

      // Close modal only after upload succeeds
      setIsCropModalOpen(false);
      setSelectedPhotoFile(null);

      // Invalidate profile query to synchronize server cache
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
    } catch (err: any) {
      console.error('[ProfileHeader] Upload failed:', err);
      toast.error(err?.message || 'Failed to upload photo.');
      // Revert to original photoUrl on error
      setAvatarImage(profile.photoUrl || null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setIsDeletingPhoto(true);
    try {
      await candidateApi.deletePhoto();
      toast.success('Profile photo removed.');
      setAvatarImage(null);
      setIsDeletePhotoOpen(false);
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
    } catch (err: any) {
      console.error('[ProfileHeader] Delete failed:', err);
      toast.error(err?.message || 'Failed to remove photo.');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-6 pb-6 pt-0 relative bg-white border-b border-[#E8DFD4]">
        <div className="-mt-12 mb-4 w-24 h-24 rounded-full bg-[#FAF6F1] animate-pulse ring-4 ring-[#FAF6F1]" />
        <div className="h-7 w-48 bg-[#FAF6F1] animate-pulse rounded mb-2" />
        <div className="h-4 w-72 bg-[#FAF6F1] animate-pulse rounded" />
      </div>
    );
  }

  const displayName = profile.fullName || `${profile.firstName} ${profile.lastName || ''}`.trim();
  const headline = profile.headline || 'Add your professional headline';
  const city = profile.location;
  const openToWork = Boolean(profile.openToWork);

  return (
    <div className="px-5 sm:px-8 pb-6 pt-0 bg-white border-b border-[#E8DFD4] relative">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-12">
        {/* Avatar with ground-colored ring */}
        <div ref={photoMenuRef} className="relative inline-block w-24 h-24 shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#FAF6F1] bg-[#FFF1E6] shadow-sm flex items-center justify-center select-none">
            {avatarImage ? (
              <img
                src={avatarImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[#C2410C] font-serif tracking-tight">
                {initials}
              </span>
            )}
          </div>

          {/* Camera overlay button */}
          <button
            type="button"
            onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
            aria-label="Edit profile photo"
            aria-expanded={isPhotoMenuOpen}
            aria-haspopup="true"
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white hover:bg-[#FAF6F1] text-[#1B1A17] hover:text-[#C2410C] shadow-md border border-[#E8DFD4] transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Avatar Menu */}
          {isPhotoMenuOpen && (
            <div
              className="absolute left-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-[#E8DFD4] py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsPhotoMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-[#1B1A17] hover:bg-[#FAF6F1] flex items-center gap-2 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#5C564E]" />
                <span>Upload photo</span>
              </button>

              {profile.photoUrl && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsPhotoMenuOpen(false);
                    setIsDeletePhotoOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 transition-colors border-t border-[#E8DFD4]/60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove photo</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Buttons (aligned right on desktop) */}
        <div className="sm:self-end flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsShareProfileOpen(true)}
            aria-label="Share public profile"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8DFD4] hover:border-[#C2410C]/40 bg-[#FAF6F1]/50 hover:bg-[#FAF6F1] text-[#1B1A17] text-xs font-semibold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Share2 className="w-3.5 h-3.5 text-[#C2410C]" aria-hidden="true" />
            <span>Share profile</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            aria-label="Edit profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit profile</span>
          </button>
        </div>
      </div>


      {/* Candidate Name & Info */}
      <div className="mt-4">
        <h1 className="text-[26px] leading-tight font-bold text-[#1B1A17] font-serif tracking-tight">
          {displayName}
        </h1>

        <p className="text-sm text-[#5C564E] font-normal leading-relaxed mt-1 max-w-2xl">
          {headline}
        </p>

        {/* City · Open to work line */}
        <div className="flex items-center gap-2 text-xs text-[#5C564E] font-medium mt-2 flex-wrap">
          {city && <span>{city}</span>}
          {city && openToWork && <span className="text-[#E8DFD4]">·</span>}
          {openToWork && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              Open to work
            </span>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Circular Photo Crop Modal */}
      <PhotoCropModal
        imageFile={selectedPhotoFile}
        isOpen={isCropModalOpen}
        onClose={() => {
          setIsCropModalOpen(false);
          setSelectedPhotoFile(null);
        }}
        onCropComplete={handleCropComplete}
        isLoading={isUploadingPhoto}
        aspectRatio="1:1"
      />

      {/* Delete Photo Confirmation */}
      <ConfirmDialog
        isOpen={isDeletePhotoOpen}
        title="Remove Profile Photo?"
        message="Are you sure you want to remove your profile photo? Your initials will be displayed instead."
        confirmLabel="Remove Photo"
        cancelLabel="Keep Photo"
        variant="danger"
        isLoading={isDeletingPhoto}
        onConfirm={handleDeletePhoto}
        onCancel={() => setIsDeletePhotoOpen(false)}
      />

      {/* Edit Profile Details Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        profile={profile}
      />

      {/* Share Public Profile Modal */}
      <ShareProfileModal
        isOpen={isShareProfileOpen}
        onClose={() => setIsShareProfileOpen(false)}
        profile={profile}
      />
    </div>
  );
};

export default ProfileHeader;
