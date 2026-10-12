// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ResumePage (Resume Management, Upload & Onboarding)
// ============================================================

import React, { useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateResumeMetadata } from '../../lib/types';
import { useCandidateAuth } from '../../lib/session';
import { formatDate, formatBytes } from '../../lib/format';
import { Button, PageSkeleton, ConfirmDialog } from '@/portals/org/ui/ui';
import { toast } from '@/portals/org/ui/toast';
import { Download, FileText, Trash2, UploadCloud, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ResumePage: React.FC = () => {
  const { refetchMe } = useCandidateAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const nextUrl = searchParams.get('next') || '';

  const { data: resume, isLoading, refetch } = useQuery({
    queryKey: candidateQueryKeys.resume,
    queryFn: () => candidateApi.get<CandidateResumeMetadata>('/candidate/profile/resume'),
  });

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

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Onboarding Banner */}
      {isOnboarding && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
              Welcome Onboard
            </span>
            <h2 className="text-base font-bold text-slate-900">Upload your resume to complete profile setup</h2>
            <p className="text-xs text-slate-600">
              Having an active resume lets you apply to any open position in just one click.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleProceed}
            className="text-xs whitespace-nowrap text-slate-600 hover:text-slate-900 font-semibold"
          >
            Skip for now
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Resume</h1>
          <p className="text-sm text-slate-500 mt-1">Upload your resume to apply for open roles with a single click.</p>
        </div>

        {resume?.hasResume && (isOnboarding || nextUrl) && (
          <Button
            variant="primary"
            onClick={handleProceed}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center gap-1.5 px-4 py-2 rounded-lg shadow-sm"
          >
            <span>{nextUrl ? 'Continue to Job' : 'Go to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {resume?.hasResume ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900">{resume.fileName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatBytes(resume.fileSize)} • Uploaded {formatDate(resume.uploadedAt)}
                </p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Resume
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#DC2626] hover:bg-red-700 active:bg-red-800 text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
                aria-label="Delete resume"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                Delete
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Need to update your resume?</p>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs"
            >
              Replace Resume
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4 hover:border-orange-500 transition-colors">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Upload your resume</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Supports PDF, DOC, DOCX or TXT files up to 10MB. Stored securely in your private candidate vault.
            </p>
          </div>

          <div>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg"
            >
              {uploading ? `Uploading (${uploadProgress}%)...` : 'Browse File'}
            </Button>
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
