// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ResumePage (Resume Management, Upload & Onboarding)
// ============================================================

import React, { useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateResumeMetadata } from '../../lib/types';
import { useCandidateAuth, useCandidateResume } from '../../lib/session';
import { formatDate, formatBytes } from '../../lib/format';
import { Button, PageSkeleton, ConfirmDialog } from '@/portals/org/ui/ui';
import { toast } from '@/portals/org/ui/toast';
import { Download, FileText, Trash2, UploadCloud, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const ResumePage: React.FC = () => {
  const { refetchMe } = useCandidateAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const nextUrl = searchParams.get('next') || '';

  const { data: resume, isLoading, isError, error, refetch } = useCandidateResume();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB maximum limit');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await candidateApi.upload('/candidate/profile/resume', formData, (p) => {
        setUploadProgress(p);
      });
      toast.success('Resume uploaded successfully to secure vault');
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.resume });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.me });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      await refetch();
      await refetchMe();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!resume?.fileName) return;
    try {
      await candidateApi.downloadBlob('/candidate/profile/resume/download', resume.fileName);
      toast.success('Resume downloaded successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download resume');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await candidateApi.delete('/candidate/profile/resume');
      toast.success('Resume deleted successfully');
      setDeleteConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.resume });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.me });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      await refetch();
      await refetchMe();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete resume');
    } finally {
      setDeleting(false);
    }
  };

  const handleProceed = () => {
    if (nextUrl) {
      navigate(nextUrl);
    } else {
      navigate('/candidate/dashboard');
    }
  };

  if (isError) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-[#1B1A17]">Unable to load resume</h3>
        <p className="text-sm text-[#5C564E] max-w-sm mx-auto">
          {(error as any)?.message || 'A network error occurred while connecting to the resume vault.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl text-[#1B1A17] font-sans">
      {/* Onboarding Banner */}
      {isOnboarding && (
        <div className="bg-[#FFF1E6] border border-[#E8DFD4] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#C2410C] bg-white px-2 py-0.5 rounded-lg border border-[#E8DFD4]">
              Welcome Onboard
            </span>
            <h2 className="text-base font-bold text-[#1B1A17]">Upload your resume to complete profile setup</h2>
            <p className="text-xs text-[#5C564E]">
              Having an active resume lets you apply to any open position in just one click.
            </p>
          </div>
          <button
            type="button"
            onClick={handleProceed}
            className="text-xs whitespace-nowrap text-[#5C564E] hover:text-[#1B1A17] font-semibold px-3 py-1.5 rounded-xl border border-[#E8DFD4] bg-white hover:bg-[#FAF6F1] transition-colors"
          >
            Skip for now
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1B1A17]">Manage Resume</h1>
          <p className="text-sm text-[#5C564E] mt-1">Upload your resume to apply for open roles with a single click.</p>
        </div>

        {resume?.hasResume && (isOnboarding || nextUrl) && (
          <button
            type="button"
            onClick={handleProceed}
            className="bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold text-xs flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-xs transition-colors"
          >
            <span>{nextUrl ? 'Continue to Job' : 'Go to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white border border-[#E8DFD4] rounded-2xl p-8 space-y-4 animate-pulse shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FAF6F1] rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 bg-[#FAF6F1] rounded" />
              <div className="h-3 w-32 bg-[#FAF6F1] rounded" />
            </div>
          </div>
        </div>
      ) : resume?.hasResume ? (
        <div className="bg-white border border-[#E8DFD4] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFF1E6] border border-[#E8DFD4] flex items-center justify-center text-[#C2410C]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#1B1A17]">{resume.fileName}</h3>
                <p className="text-xs text-[#5C564E] mt-0.5">
                  {formatBytes(resume.fileSize)} • Uploaded {formatDate(resume.uploadedAt)}
                </p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Resume
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E8DFD4] bg-white hover:bg-[#FAF6F1] text-[#1B1A17] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#DC2626] hover:bg-red-700 active:bg-red-800 text-white shadow-xs transition-colors cursor-pointer"
                aria-label="Delete resume"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                Delete
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#FAF6F1] flex items-center justify-between">
            <p className="text-xs text-[#5C564E]">Need to update your resume?</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#E8DFD4] bg-white hover:bg-[#FAF6F1] text-[#1B1A17] transition-colors"
            >
              Replace Resume
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-[#E8DFD4] rounded-2xl p-10 text-center space-y-4 hover:border-[#C2410C] transition-colors shadow-xs">
          <div className="w-14 h-14 bg-[#FFF1E6] text-[#C2410C] rounded-2xl flex items-center justify-center mx-auto">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1B1A17]">Upload your resume</h3>
            <p className="text-xs text-[#5C564E] mt-1 max-w-sm mx-auto">
              Supports PDF, DOC, DOCX or TXT files up to 10MB. Stored securely in your private candidate vault.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              {uploading ? `Uploading (${uploadProgress}%)...` : 'Browse File'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Resume"
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        tone="danger"
        loading={deleting}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{resume?.fileName}</span>? You will need to upload a new resume when applying for jobs.
        </p>
      </ConfirmDialog>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
