// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: QuickApplyModal (Modal for Submitting Job Applications)
// ============================================================

import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../lib/api';
import { candidateQueryKeys } from '../lib/queryKeys';
import { CandidateJob, CandidateResumeMetadata } from '../lib/types';
import { useCandidateAuth, useCandidateResume } from '../lib/session';
import { formatBytes, formatDate } from '../lib/format';
import { Button } from '@/portals/org/ui/ui';
import { toast } from '@/portals/org/ui/toast';
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react';

interface QuickApplyModalProps {
  job: CandidateJob;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickApplyModal: React.FC<QuickApplyModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { user, refetchMe } = useCandidateAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch candidate's active resume status via shared hook
  const { data: resumeData, refetch: refetchResume } = useCandidateResume();

  if (!isOpen) return null;

  const handleInlineResumeUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploadingResume(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await candidateApi.upload('/candidate/profile/resume', formData);
      toast.success('Resume uploaded successfully');
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.resume });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.me });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      await refetchResume();
      await refetchMe();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload resume. Please try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await candidateApi.post('/candidate/applications', {
        jobId: job.id,
        notes: notes.trim() || undefined,
      });

      toast.success(`Application submitted to ${job.companyName}!`);
      // Invalidate applications query cache
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.applications.all });
      onSuccess();
    } catch (err: any) {
      if (err?.status === 409 || err?.code === 'CONFLICT' || err?.message?.toLowerCase().includes('already')) {
        setError('You have already submitted an application for this position.');
      } else {
        setError(err?.message || 'Unable to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasResume = Boolean(resumeData?.hasResume || user?.profile?.resumeFileName);
  const resumeName = resumeData?.fileName || user?.profile?.resumeFileName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              Quick Application
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{job.title}</h2>
            <p className="text-xs text-slate-500">{job.companyName} • {job.location}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Candidate Profile Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Applying As
            </span>
            <div className="flex items-center justify-between text-slate-800 font-medium">
              <span>{user?.firstName} {user?.lastName}</span>
              <span className="text-slate-500 font-normal">{user?.email}</span>
            </div>
          </div>

          {/* Resume Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
              Attached Resume
            </label>

            {hasResume ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-[220px]">
                      {resumeName}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Ready to submit
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                >
                  {uploadingResume ? 'Replacing...' : 'Change'}
                </button>
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/50 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-900">No resume attached to profile</p>
                  <p className="text-[11px] text-amber-700">Upload a PDF or Word document (max 10MB)</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="text-xs bg-white border-amber-300 hover:bg-amber-100/50 text-amber-900 font-semibold"
                >
                  {uploadingResume ? 'Uploading...' : 'Upload Resume Now'}
                </Button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleInlineResumeUpload(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Note to Hiring Team */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
              Note to Hiring Team <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Highlight relevant experience, current notice period, or why you're a great fit for this position..."
              className="w-full text-xs text-slate-800 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="text-xs text-slate-600 px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || uploadingResume}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Application</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
