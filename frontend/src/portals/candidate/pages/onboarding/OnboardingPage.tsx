// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: OnboardingPage (5-Step Wizard)
// Server authoritative state, auto-resumes at saved step, redirects on completion
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateApi, getCandidateToken } from '../../lib/api';
import { useCandidateAuth } from '../../lib/session';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { OnboardingStatusResponse } from '../../lib/types';
import { OnboardingStepper, ONBOARDING_STEPS } from './OnboardingStepper';
import { Step1BasicDetails, Step1FormData } from './Step1BasicDetails';
import { Step2Education, Step2FormData } from './Step2Education';
import { Step3ProfessionalDetails, Step3FormData } from './Step3ProfessionalDetails';
import { Step4ResumeUpload } from './Step4ResumeUpload';
import { Step5VideoInterview } from './Step5VideoInterview';
import { PageSkeleton } from '@/portals/org/ui/ui';
import { toast } from '@/portals/org/ui/toast';
import { joinFullName } from '../../lib/name.util';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getCandidateToken();
  const { isAuthenticated, isLoading: isAuthLoading } = useCandidateAuth();

  // Active step in the wizard (1-5)
  const [activeStep, setActiveStep] = useState<number>(1);
  const [completedMax, setCompletedMax] = useState<number>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [step1FieldErrors, setStep1FieldErrors] = useState<Record<string, string>>({});

  const parseStep1Errors = (err: any) => {
    const fieldErrors: Record<string, string> = {};
    const messages: string[] = [];

    if (Array.isArray(err?.rawMessages)) {
      messages.push(...err.rawMessages);
    } else if (Array.isArray(err?.message)) {
      messages.push(...err.message);
    } else if (typeof err?.message === 'string') {
      messages.push(...err.message.split(',').map((s: string) => s.trim()));
    }

    for (const msg of messages) {
      const lower = msg.toLowerCase();
      if (lower.includes('full name') || lower.includes('first name') || lower.includes('last name') || lower.includes('name')) {
        fieldErrors.fullName = msg;
      } else if (lower.includes('mobile') || lower.includes('phone')) {
        fieldErrors.phone = msg;
      } else if (lower.includes('city') || lower.includes('location')) {
        fieldErrors.location = msg;
      } else if (lower.includes('birth') || lower.includes('18')) {
        fieldErrors.dateOfBirth = msg;
      } else if (lower.includes('fresher') || lower.includes('work status')) {
        fieldErrors.isFresher = msg;
      }
    }

    return fieldErrors;
  };

  useEffect(() => {
    if (!token || (!isAuthLoading && !isAuthenticated)) {
      navigate('/login?next=/onboarding', { replace: true });
    }
  }, [token, isAuthenticated, isAuthLoading, navigate]);

  // 1. Fetch server-side onboarding status (Authoritative source of truth)
  const { data: status, isLoading, isError, refetch } = useQuery({
    queryKey: candidateQueryKeys.onboarding,
    queryFn: () => candidateApi.get<OnboardingStatusResponse>('/candidate/onboarding/status'),
    enabled: !!token && isAuthenticated,
    staleTime: 0,
  });

  // Sync active step with server-persisted state
  useEffect(() => {
    if (status) {
      if (status.onboardingStatus === 'COMPLETE') {
        // If already completed, redirect immediately to profile
        navigate('/candidate/profile', { replace: true });
        return;
      }

      const step = Math.min(5, Math.max(1, status.onboardingStep || 1));
      setActiveStep(step);
      setCompletedMax(Math.max(step, completedMax));
    }
  }, [status, navigate]);

  // Step 1 Save Mutation
  const step1Mutation = useMutation({
    mutationFn: (data: Step1FormData) =>
      candidateApi.patch('/candidate/onboarding/steps/1', data),
    onSuccess: (res: any) => {
      setServerError(null);
      setStep1FieldErrors({});
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.onboarding });
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      setActiveStep(2);
      setCompletedMax((prev) => Math.max(prev, 2));
    },
    onError: (err: any) => {
      const fieldErrors = parseStep1Errors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setStep1FieldErrors(fieldErrors);
        setServerError(null);
      } else {
        setStep1FieldErrors({});
        const msg = err?.message || 'Failed to save basic details. Please check your inputs.';
        setServerError(msg);
        toast.error(msg);
      }
    },
  });

  // Step 2 Save Mutation
  const step2Mutation = useMutation({
    mutationFn: (data: Step2FormData) =>
      candidateApi.patch('/candidate/onboarding/steps/2', data),
    onSuccess: (res: any) => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.onboarding });
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      setActiveStep(3);
      setCompletedMax((prev) => Math.max(prev, 3));
    },
    onError: (err: any) => {
      setServerError(err?.message || 'Failed to save education details.');
    },
  });

  // Step 3 Save Mutation
  const step3Mutation = useMutation({
    mutationFn: (data: Step3FormData) =>
      candidateApi.patch('/candidate/onboarding/steps/3', data),
    onSuccess: (res: any) => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.onboarding });
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      setActiveStep(4);
      setCompletedMax((prev) => Math.max(prev, 4));
    },
    onError: (err: any) => {
      setServerError(err?.message || 'Failed to save professional details.');
    },
  });

  // Step 4 Save Mutation
  const step4Mutation = useMutation({
    mutationFn: () => candidateApi.patch('/candidate/onboarding/steps/4', {}),
    onSuccess: (res: any) => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.onboarding });
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      setActiveStep(5);
      setCompletedMax((prev) => Math.max(prev, 5));
    },
    onError: (err: any) => {
      setServerError(err?.message || 'Please upload a valid resume to proceed.');
    },
  });

  // Step 5 Skip or Complete Mutation
  const step5Mutation = useMutation({
    mutationFn: (action: 'START' | 'SKIP') =>
      candidateApi.patch('/candidate/onboarding/steps/5', { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.onboarding });
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      navigate('/candidate/profile', { replace: true });
    },
    onError: (err: any) => {
      setServerError(err?.message || 'Failed to finalize onboarding.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <PageSkeleton />
      </div>
    );
  }

  const profile: any = status?.profile || {};
  const user: any = status?.user || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              C
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight">Clyptus</span>
              <span className="text-[11px] font-semibold text-orange-600 ml-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                Candidate Onboarding
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">All data auto-saved securely</span>
          </div>
        </div>
      </header>

      {/* Stepper Bar */}
      <OnboardingStepper
        currentStep={activeStep}
        completedStepMax={completedMax}
        onStepClick={(step) => {
          setServerError(null);
          setActiveStep(step);
        }}
      />

      {/* Main Wizard Form Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:px-6">
        {serverError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5 shadow-2xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Step 1: Basic Details */}
          {activeStep === 1 && (
            <Step1BasicDetails
              initialData={{
                fullName: profile.fullName || user.fullName || joinFullName(user.firstName, user.lastName),
                email: user.email,
                phone: profile.phone,
                phoneCountryCode: profile.phoneCountryCode || '+91',
                location: profile.location,
                dateOfBirth: profile.dateOfBirth,
                isFresher: profile.isFresher !== undefined ? profile.isFresher : true,
                gender: profile.gender,
              }}
              onSave={async (data) => {
                await step1Mutation.mutateAsync(data);
              }}
              isLoading={step1Mutation.isPending}
              serverFieldErrors={step1FieldErrors}
            />
          )}

          {/* Step 2: Education */}
          {activeStep === 2 && (
            <Step2Education
              initialData={{
                highestQualification: profile.highestQualification || 'Graduate',
                education: profile.education || [],
              }}
              onSave={async (data) => {
                await step2Mutation.mutateAsync(data);
              }}
              onBack={() => setActiveStep(1)}
              isLoading={step2Mutation.isPending}
            />
          )}

          {/* Step 3: Professional Details */}
          {activeStep === 3 && (
            <Step3ProfessionalDetails
              initialData={{
                headline: profile.headline || '',
                skills: profile.skills || [],
                currentJobTitle: profile.currentJobTitle || '',
                currentCompany: profile.currentCompany || '',
                experienceYears: profile.experienceYears,
                experienceMonths: profile.experienceMonths,
                currentSalary: profile.currentSalary,
                expectedSalary: profile.expectedSalary,
                noticePeriod: profile.noticePeriod,
                projects: profile.projects || [],
                preferredLocations: profile.preferredLocations || [],
                preferredJobTypes: profile.preferredJobTypes || [],
                preferredWorkModes: profile.preferredWorkModes || [],
                gender: profile.gender,
              }}
              isFresher={profile.isFresher !== false}
              userFullName={profile.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
              userDegree={profile.education?.[0]?.degree}
              onSave={async (data) => {
                await step3Mutation.mutateAsync(data);
              }}
              onBack={() => setActiveStep(2)}
              isLoading={step3Mutation.isPending}
            />
          )}

          {/* Step 4: Resume Upload */}
          {activeStep === 4 && (
            <Step4ResumeUpload
              initialResumeMeta={{
                hasResume: !!profile.resumeStorageKey,
                fileName: profile.resumeFileName,
                fileSize: profile.resumeFileSize,
                uploadedAt: profile.resumeUploadedAt,
              }}
              onSave={async () => {
                await step4Mutation.mutateAsync();
              }}
              onBack={() => setActiveStep(3)}
              isLoading={step4Mutation.isPending}
            />
          )}

          {/* Step 5: AI Video Interview */}
          {activeStep === 5 && (
            <Step5VideoInterview
              onStart={async () => {
                await step5Mutation.mutateAsync('START');
              }}
              onSkip={async () => {
                await step5Mutation.mutateAsync('SKIP');
              }}
              onBack={() => setActiveStep(4)}
              isLoading={step5Mutation.isPending}
            />
          )}
        </div>
      </main>
    </div>
  );
};
