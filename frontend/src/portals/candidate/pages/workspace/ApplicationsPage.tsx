// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ApplicationsPage (Candidate Applications List)
// In-card skeletons, Stage timeline with dates, Withdraw action with ConfirmDialog
// Harmonized palette with #FAF6F1, #E8DFD4, #1B1A17, #C2410C
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication, ApplicationStage } from '../../lib/types';
import { STAGE_CONFIG, formatDate } from '../../lib/format';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { toast } from '@/portals/org/ui/toast';
import {
  Briefcase,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

const STAGE_ORDER: ApplicationStage[] = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
];

export const ApplicationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [withdrawTarget, setWithdrawTarget] = useState<CandidateApplication | null>(null);

  const { data: rawApplications, isLoading, isError, error, refetch } = useQuery({
    queryKey: candidateQueryKeys.applications.list,
    queryFn: () => candidateApi.get<CandidateApplication[]>('/candidate/applications'),
  });

  const withdrawnIds = candidateApi.getWithdrawnApplicationIds();

  // Merge withdrawn status
  const applications = (rawApplications || []).map((app) => {
    if (withdrawnIds.includes(app.id)) {
      return { ...app, status: 'WITHDRAWN' as ApplicationStage };
    }
    return app;
  });

  const withdrawMutation = useMutation({
    mutationFn: (appId: string) => candidateApi.withdrawApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.applications.list });
      toast.success('Your application has been withdrawn.');
      setWithdrawTarget(null);
    },
    onError: () => {
      toast.error('Failed to withdraw application.');
    },
  });

  const getStageIndex = (stage: ApplicationStage) => {
    return STAGE_ORDER.indexOf(stage);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 text-[#1B1A17]">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1B1A17]">My Job Applications</h1>
        <p className="text-xs text-[#5C564E] mt-1">
          Track stage progression, interview rounds, and live status across employers.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E8DFD4] rounded-2xl p-6 space-y-4 animate-pulse shadow-xs"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-[#FAF6F1] rounded" />
                  <div className="h-3 w-32 bg-[#FAF6F1] rounded" />
                </div>
                <div className="h-6 w-20 bg-[#FAF6F1] rounded-full" />
              </div>
              <div className="h-8 bg-[#FAF6F1] rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white border border-[#E8DFD4] rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-xs">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-semibold text-[#1B1A17]">
            Unable to load applications
          </h3>
          <p className="text-xs text-[#5C564E] max-w-sm mx-auto">
            {(error as any)?.message || 'A network error occurred while retrieving your applications.'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Retry
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-[#E8DFD4] rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-[#FAF6F1] border border-[#E8DFD4] rounded-full flex items-center justify-center mx-auto text-[#5C564E]">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">No applications yet</h3>
          <p className="text-xs text-[#5C564E] max-w-sm mx-auto">
            You haven't submitted any job applications yet. Browse open roles and apply with your profile.
          </p>
          <div className="pt-2">
            <Link
              to="/jobs"
              className="inline-block px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Find Open Jobs
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const stageCfg = STAGE_CONFIG[app.status] || { label: app.status, tone: 'gray' as const };
            const isWithdrawn = app.status === 'WITHDRAWN';
            const isRejected = app.status === 'REJECTED';
            const isHired = app.status === 'HIRED';
            const canWithdraw = !isWithdrawn && !isRejected && !isHired;
            const currentIndex = getStageIndex(app.status);

            return (
              <div
                key={app.id}
                className="bg-white border border-[#E8DFD4] rounded-2xl p-5 sm:p-6 shadow-xs hover:border-[#C2410C]/30 transition-all space-y-5"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#1B1A17]">
                      <Link to={`/candidate/applications/${app.id}`} className="hover:text-[#C2410C] transition-colors">
                        {app.jobTitle}
                      </Link>
                    </h3>
                    <p className="text-xs font-semibold text-[#5C564E] mt-0.5">
                      {app.companyName} • {app.location}
                    </p>
                    <p className="text-[11px] text-[#5C564E] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Applied on {formatDate(app.appliedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isWithdrawn
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : isRejected
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isHired
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#FFF1E6] text-[#C2410C] border-[#C2410C]/20'
                      }`}
                    >
                      {stageCfg.label}
                    </span>

                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setWithdrawTarget(app)}
                        className="text-xs font-semibold px-3 py-1 rounded-xl border border-[#E8DFD4] text-[#5C564E] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                      >
                        Withdraw
                      </button>
                    )}

                    <Link
                      to={`/candidate/applications/${app.id}`}
                      className="p-2 rounded-xl text-[#5C564E] hover:text-[#C2410C] hover:bg-[#FAF6F1] transition-colors"
                      title="View Details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Stage Progression Timeline */}
                <div className="p-3.5 rounded-xl bg-[#FAF6F1]/50 border border-[#E8DFD4]/80">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#5C564E] mb-2 px-1">
                    <span>Application Submitted</span>
                    <span>Screening</span>
                    <span>Interview</span>
                    <span>Offer / Final</span>
                  </div>

                  {/* Progress bar line */}
                  <div className="relative w-full h-2 bg-[#E8DFD4] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isWithdrawn
                          ? 'bg-slate-400'
                          : isRejected
                          ? 'bg-red-500'
                          : isHired
                          ? 'bg-emerald-600'
                          : 'bg-[#C2410C]'
                      }`}
                      style={{
                        width: isWithdrawn
                          ? '30%'
                          : currentIndex >= 4
                          ? '100%'
                          : currentIndex >= 3
                          ? '75%'
                          : currentIndex >= 1
                          ? '50%'
                          : '25%',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#5C564E] mt-2 px-1">
                    <span>{formatDate(app.appliedAt)}</span>
                    <span className="font-medium text-[#1B1A17]">
                      {isWithdrawn
                        ? 'Candidate Withdrawn'
                        : isRejected
                        ? 'Not Moving Forward'
                        : isHired
                        ? 'Offer Accepted'
                        : `Current Stage: ${stageCfg.label}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Withdraw Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(withdrawTarget)}
        title="Withdraw Application?"
        message={`Are you sure you want to withdraw your application for "${withdrawTarget?.jobTitle}" at ${withdrawTarget?.companyName}? The hiring team will be notified and your submission will be archived.`}
        confirmLabel="Withdraw Application"
        cancelLabel="Keep Application"
        variant="danger"
        isLoading={withdrawMutation.isPending}
        onConfirm={() => {
          if (withdrawTarget) {
            withdrawMutation.mutate(withdrawTarget.id);
          }
        }}
        onCancel={() => setWithdrawTarget(null)}
      />
    </div>
  );
};
export default ApplicationsPage;
