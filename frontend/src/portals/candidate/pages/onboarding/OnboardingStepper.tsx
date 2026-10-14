// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: OnboardingStepper
// Responsive 5-step stepper: full labels on desktop, collapses on mobile
// ============================================================

import React from 'react';
import { Check, Sparkles } from 'lucide-react';

export interface StepDef {
  number: number;
  label: string;
  shortLabel: string;
}

export const ONBOARDING_STEPS: StepDef[] = [
  { number: 1, label: 'Basic details', shortLabel: 'Basic' },
  { number: 2, label: 'Education', shortLabel: 'Education' },
  { number: 3, label: 'Professional details', shortLabel: 'Professional' },
  { number: 4, label: 'Resume upload', shortLabel: 'Resume' },
  { number: 5, label: 'AI video interview', shortLabel: 'AI Interview' },
];

interface OnboardingStepperProps {
  currentStep: number;
  completedStepMax: number;
  onStepClick: (step: number) => void;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStep,
  completedStepMax,
  onStepClick,
}) => {
  const currentStepDef = ONBOARDING_STEPS.find((s) => s.number === currentStep) || ONBOARDING_STEPS[0];
  const progressPercent = Math.round(((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100);

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
        {/* Mobile View: Collapsed to "Step X of 5" with progress bar */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-orange-600">
              Step {currentStep} of {ONBOARDING_STEPS.length}
            </span>
            <span className="font-medium text-slate-800">{currentStepDef.label}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-orange-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(10, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Desktop View: Full 5-step Stepper */}
        <div className="hidden sm:flex items-center justify-between relative">
          {/* Connector Line behind steps */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute top-4 left-6 h-0.5 bg-orange-600 -z-0 transition-all duration-500"
            style={{
              width: `${((Math.min(currentStep, completedStepMax) - 1) / (ONBOARDING_STEPS.length - 1)) * 100}%`,
            }}
          />

          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = step.number < currentStep || step.number <= completedStepMax;
            const isCurrent = step.number === currentStep;
            const isClickable = step.number <= completedStepMax || isCompleted;

            return (
              <button
                key={step.number}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.number)}
                className={`group flex flex-col items-center relative z-10 transition-all ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                {/* Step Circle Badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isCurrent
                      ? 'bg-orange-600 text-white ring-4 ring-orange-100 scale-110'
                      : isCompleted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-white border-2 border-slate-300 text-slate-500'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : step.number === 5 ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Step Title Label */}
                <span
                  className={`mt-2 text-xs font-medium text-center whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-orange-600 font-semibold'
                      : isCompleted
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
