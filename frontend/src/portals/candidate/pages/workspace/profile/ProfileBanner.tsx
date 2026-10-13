// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: ProfileBanner
// LinkedIn-style 4:1 cover banner with camera button menu (Upload, Presets, Remove)
// Fallback brand tint #F3D9C4, skeleton loader, and delete confirmation dialog
// ============================================================

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Palette, Upload } from 'lucide-react';
import { PhotoCropModal } from '../../../components/PhotoCropModal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { candidateApi } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { candidateQueryKeys } from '../../../lib/queryKeys';
import { toast } from '@/portals/org/ui/toast';

export const PRESET_COVERS = [
  { id: 'tint', name: 'Brand Tint', style: { backgroundColor: '#F3D9C4' } },
  { id: 'sunset', name: 'Sunset Amber', style: { background: 'linear-gradient(135deg, #FFF1E6 0%, #FED7AA 50%, #FDBA74 100%)' } },
  { id: 'terracotta', name: 'Terracotta Dark', style: { background: 'linear-gradient(135deg, #C2410C 0%, #EA580C 50%, #9A3412 100%)' } },
  { id: 'sage', name: 'Soft Sage', style: { background: 'linear-gradient(135deg, #E6EFE9 0%, #D1E5D8 100%)' } },
  { id: 'sandstone', name: 'Sandstone Dune', style: { background: 'linear-gradient(135deg, #FAF6F1 0%, #E8DFD4 50%, #D7C7B8 100%)' } },
  { id: 'midnight', name: 'Midnight Slate', style: { background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)' } },
];

export interface ProfileBannerProps {
  coverUrl?: string | null;
  isLoading?: boolean;
}

export const ProfileBanner: React.FC<ProfileBannerProps> = ({ coverUrl, isLoading = false }) => {
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // File upload & crop state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Cover photo must be less than 5 MB.');
      return;
    }

    setSelectedFile(file);
    setIsCropOpen(true);
    setIsMenuOpen(false);
    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      await candidateApi.uploadCover(croppedBlob);
      toast.success('Cover photo updated successfully.');
      setIsCropOpen(false);
      setSelectedFile(null);
      setImageError(false);
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload cover photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCover = async () => {
    setIsDeleting(true);
    try {
      await candidateApi.deleteCover();
      toast.success('Cover photo removed.');
      setIsConfirmDeleteOpen(false);
      setImageError(false);
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove cover photo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectPreset = async (preset: (typeof PRESET_COVERS)[0]) => {
    try {
      // Save preset gradient or color as coverUrl value or style identifier
      await candidateApi.updateProfile({ coverUrl: `preset:${preset.id}` });
      toast.success(`Applied ${preset.name} cover.`);
      setIsPresetModalOpen(false);
      setImageError(false);
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply preset cover.');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[100px] sm:h-[140px] md:h-[200px] rounded-t-2xl bg-[#FAF6F1] animate-pulse border-b border-[#E8DFD4]" />
    );
  }

  // Determine preset or custom image
  const isPreset = coverUrl?.startsWith('preset:');
  const activePreset = isPreset
    ? PRESET_COVERS.find((p) => p.id === coverUrl?.replace('preset:', ''))
    : null;

  return (
    <div className="relative w-full h-[100px] sm:h-[140px] md:h-[200px] rounded-t-2xl overflow-hidden select-none bg-[#F3D9C4]">
      {/* Banner Display */}
      {coverUrl && !imageError ? (
        activePreset ? (
          <div className="w-full h-full" style={activePreset.style} />
        ) : (
          <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full bg-[#F3D9C4]" />
      )}

      {/* Camera Action Button */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Edit cover photo"
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/95 hover:bg-white text-[#1B1A17] hover:text-[#C2410C] shadow-md border border-[#E8DFD4] text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-xs focus-visible:outline-2 focus-visible:outline-[#C2410C]"
        >
          <Camera className="w-4 h-4 text-[#1B1A17]" aria-hidden="true" />
          <span className="hidden sm:inline">Edit cover photo</span>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-[#E8DFD4] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1B1A17] hover:bg-[#FAF6F1] flex items-center gap-2.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#5C564E]" />
              <span>Upload photo</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                setIsPresetModalOpen(true);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1B1A17] hover:bg-[#FAF6F1] flex items-center gap-2.5 transition-colors"
            >
              <Palette className="w-3.5 h-3.5 text-[#5C564E]" />
              <span>Choose preset</span>
            </button>

            {coverUrl && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsConfirmDeleteOpen(true);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2.5 transition-colors border-t border-[#E8DFD4]/60 mt-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Crop Modal */}
      <PhotoCropModal
        imageFile={selectedFile}
        isOpen={isCropOpen}
        onClose={() => {
          setIsCropOpen(false);
          setSelectedFile(null);
        }}
        onCropComplete={handleCropComplete}
        isLoading={isUploading}
        aspectRatio="4:1"
      />

      {/* Presets Picker Dialog */}
      {isPresetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preset-cover-title"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-[#E8DFD4] p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 id="preset-cover-title" className="text-base font-semibold text-[#1B1A17] font-serif">
              Choose Preset Cover
            </h3>
            <p className="text-xs text-[#5C564E] mt-1">
              Select one of the curated brand themes for your profile banner.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {PRESET_COVERS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="group rounded-xl border border-[#E8DFD4] overflow-hidden hover:border-[#C2410C] text-left transition-all p-1"
                >
                  <div className="h-16 rounded-lg w-full mb-2" style={preset.style} />
                  <span className="text-xs font-semibold text-[#1B1A17] group-hover:text-[#C2410C] px-1 pb-1 block">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-5 pt-3 border-t border-[#E8DFD4]">
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#1B1A17] bg-[#FAF6F1] hover:bg-[#F2E9E0] border border-[#E8DFD4] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cover Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Remove Cover Photo?"
        message="Are you sure you want to remove your profile cover photo? The default brand theme will be restored."
        confirmLabel="Remove Cover"
        cancelLabel="Keep Cover"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteCover}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
};
export default ProfileBanner;
