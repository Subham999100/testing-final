// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ApplicationDetailPage (Application Status & History Timeline)
// Harmonized palette with #FAF6F1, #E8DFD4, #1B1A17, #C2410C
// Withdraw action with ConfirmDialog, in-card skeleton
// ============================================================

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication, ApplicationStage } from '../../lib/types';
import { STAGE_CONFIG, formatDate } from '../../lib/format';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { toast } from '@/portals/org/ui/toast';
import { ArrowLeft, Clock, FileText, AlertCircle, Building2, MapPin, CheckCircle2 } from 'lucide-react';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const { data: rawApp, isLoading, isError, error, refetch } = useQuery({
    queryKey: candidateQueryKeys.applications.detail(id || ''),
    queryFn: () => candidateApi.get<CandidateApplication>(`/candidate/applications/${id}`),
    enabled: !!id,
  });

  const withdrawnIds = candidateApi.getWithdrawnApplicationIds();
  const isWithdrawn = id ? withdrawnIds.includes(id) : false;

  const app = rawApp
    ? isWithdrawn
      ? { ...rawApp, status: 'WITHDRAWN' as ApplicationStage }
      : rawApp
    : null;

  const withdrawMutation = useMutation({
    mutationFn: (appId: string) => candidateApi.withdrawApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.applications.list });
      if (id) queryClient.invalidateQueries({ queryKey: candidateQueryKeys.applications.detail(id) });
      toast.success('Your application has been withdrawn.');
      setIsWithdrawOpen(false);
    },
    onError: () => {
      toast.error('Failed to withdraw application.');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <div className="h-6 w-36 bg-white border border-[#E8DFD4] rounded-lg animate-pulse" />
        <div className="bg-white border border-[#E8DFD4] rounded-2xl p-8 space-y-6 animate-pulse">
          <div className="h-7 w-64 bg-[#FAF6F1] rounded" />
          <div className="h-4 w-48 bg-[#FAF6F1] rounded" />
          <div className="h-32 bg-[#FAF6F1] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="bg-white border border-[#E8DFD4] rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-serif font-semibold text-[#1B1A17]">
          Unable to load application details
        </h3>
        <p className="text-xs text-[#5C564E] max-w-sm mx-auto">
          {(error as any)?.message || 'Application not found or connection failed.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Retry
          </button>
          <Link to="/candidate/applications" className="text-xs text-[#C2410C] font-semibold hover:underline">
            Back to applications
          </Link>
        </div>
      </div>
    );
  }

  const currentStage = STAGE_CONFIG[app.status] || { label: app.status, tone: 'gray' as const };
  const canWithdraw = app.status !== 'WITHDRAWN' && app.status !== 'REJECTED' && app.status !== 'HIRED';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 text-[#1B1A17]">
      <Link
        to="/candidate/applications"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C564E] hover:text-[#C2410C] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to all applications</span>
      </Link>

      <div className="bg-white border border-[#E8DFD4] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8DFD4] pb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1B1A17]">{app.jobTitle}</h1>
            <p className="text-xs font-semibold text-[#5C564E] mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {app.companyName}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.location}</span>
            </p>
            <p className="text-[11px] text-[#5C564E] mt-2 font-mono">Reference: {app.id}</p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                app.status === 'WITHDRAWN'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-[#FFF1E6] text-[#C2410C] border-[#C2410C]/20'
              }`}
            >
              {currentStage.label}
            </span>

            {canWithdraw && (
              <button
                type="button"
                onClick={() => setIsWithdrawOpen(true)}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-[#E8DFD4] text-[#5C564E] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
              >
                Withdraw
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-serif font-bold text-base text-[#1B1A17] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C2410C]" />
            <span>Stage Progression Timeline</span>
          </h3>

          <div className="space-y-4 border-l-2 border-[#E8DFD4] ml-3 pl-4">
            <div className="relative">
              <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-[#C2410C] ring-4 ring-[#FAF6F1]" />
              <p className="text-xs font-bold text-[#1B1A17]">Application submitted</p>
              <p className="text-[11px] text-[#5C564E]">{formatDate(app.appliedAt)}</p>
            </div>

            {[...(app.history || [])]
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((h) => {
                const toStageCfg = STAGE_CONFIG[h.toStage] || { label: h.toStage, tone: 'gray' as const };
                return (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-[#C2410C] ring-4 ring-[#FAF6F1]" />
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#1B1A17]">Moved to {toStageCfg.label}</p>
                    </div>
                    <p className="text-[11px] text-[#5C564E] mt-0.5">{formatDate(h.createdAt)}</p>
                  </div>
                );
              })}

            {isWithdrawn && (
              <div className="relative">
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-500 ring-4 ring-[#FAF6F1]" />
                <p className="text-xs font-bold text-[#1B1A17]">Application withdrawn by candidate</p>
                <p className="text-[11px] text-[#5C564E]">Status updated</p>
              </div>
            )}
          </div>
        </div>

        {/* Resume attached */}
        {app.resume && (
          <div className="pt-6 border-t border-[#E8DFD4]">
            <h4 className="text-xs font-semibold text-[#1B1A17] mb-2 font-serif">
              Resume Attached to this Application
            </h4>
            <div className="flex items-center gap-2.5 text-xs text-[#1B1A17] bg-[#FAF6F1]/50 p-3.5 rounded-xl border border-[#E8DFD4]">
              <FileText className="w-4 h-4 text-[#C2410C]" />
              <span className="font-semibold">{app.resume.originalFileName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Withdraw Dialog */}
      <ConfirmDialog
        isOpen={isWithdrawOpen}
        title="Withdraw Application?"
        message={`Are you sure you want to withdraw your application for "${app.jobTitle}" at ${app.companyName}?`}
        confirmLabel="Withdraw Application"
        cancelLabel="Keep Application"
        variant="danger"
        isLoading={withdrawMutation.isPending}
        onConfirm={() => {
          if (id) withdrawMutation.mutate(id);
        }}
        onCancel={() => setIsWithdrawOpen(false)}
      />
    </div>
  );
};
export default ApplicationDetailPage;
