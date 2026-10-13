// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Job Preferences
// Real UI for preferredJobTypes, preferredWorkModes, preferred locations (auto-split on comma, max 10),
// expectedSalary with amount in words, noticePeriod, optional currentSalary (no hardcoded defaults)
// ============================================================

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { Chip } from '../../../../components/Chip';
import { EmptyState } from '../../../../components/EmptyState';
import { NOTICE_PERIODS, inrToWords } from '../../../../lib/constants';
import { CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Compass, Briefcase, MapPin, IndianRupee, Clock } from 'lucide-react';

const ALL_JOB_TYPES = ['Full-time', 'Internship', 'Contract', 'Part-time'] as const;
const ALL_WORK_MODES = ['Remote', 'Hybrid', 'Onsite'] as const;

const preferencesSchema = z.object({
  preferredJobTypes: z.array(z.string()).min(1, 'Select at least one job type'),
  preferredWorkModes: z.array(z.string()).min(1, 'Select at least one work mode'),
  preferredLocations: z
    .array(z.string())
    .max(10, 'Maximum 10 preferred locations allowed'),
  expectedSalary: z.coerce.number().min(0).optional(),
  currentSalary: z.coerce.number().min(0).optional(),
  noticePeriod: z.string().optional(),
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

export interface JobPreferencesSectionProps {
  profile: CandidateFullProfile;
}

export const JobPreferencesSection: React.FC<JobPreferencesSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isOpen, setIsOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  const isFromResume = Boolean(profile.fromResumeSections?.includes('jobPreferences'));

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredJobTypes: profile.preferredJobTypes || [],
      preferredWorkModes: (profile.preferredWorkModes || []).map((m) =>
        m === 'On-site' ? 'Onsite' : m,
      ),
      preferredLocations: profile.preferredLocations || [],
      expectedSalary: profile.expectedSalary || undefined,
      currentSalary: profile.currentSalary || undefined,
      noticePeriod: profile.noticePeriod || '',
    },
  });

  const selectedJobTypes = watch('preferredJobTypes') || [];
  const selectedWorkModes = watch('preferredWorkModes') || [];
  const selectedLocations = watch('preferredLocations') || [];
  const expectedSalary = watch('expectedSalary');
  const currentSalary = watch('currentSalary');

  const handleOpen = () => {
    reset({
      preferredJobTypes: profile.preferredJobTypes || [],
      preferredWorkModes: (profile.preferredWorkModes || []).map((m) =>
        m === 'On-site' ? 'Onsite' : m,
      ),
      preferredLocations: profile.preferredLocations || [],
      expectedSalary: profile.expectedSalary || undefined,
      currentSalary: profile.currentSalary || undefined,
      noticePeriod: profile.noticePeriod || '',
    });
    setLocationInput('');
    setIsOpen(true);
  };

  const handleAddLocations = (input: string) => {
    if (!input.trim()) return;
    const tokens = input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...selectedLocations, ...tokens])).slice(0, 10);
    setValue('preferredLocations', merged, { shouldDirty: true, shouldValidate: true });
    setLocationInput('');
  };

  const handleRemoveLocation = (locToRemove: string) => {
    const filtered = selectedLocations.filter((l) => l.toLowerCase() !== locToRemove.toLowerCase());
    setValue('preferredLocations', filtered, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: PreferencesFormValues) => {
    await updateMutation.mutateAsync({
      preferredJobTypes: values.preferredJobTypes,
      preferredWorkModes: values.preferredWorkModes,
      preferredLocations: values.preferredLocations,
      expectedSalary: values.expectedSalary ? Number(values.expectedSalary) : undefined,
      currentSalary: values.currentSalary ? Number(values.currentSalary) : undefined,
      noticePeriod: values.noticePeriod || undefined,
    });
    setIsOpen(false);
  };

  const hasPreferences =
    (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) ||
    (profile.preferredWorkModes && profile.preferredWorkModes.length > 0) ||
    (profile.preferredLocations && profile.preferredLocations.length > 0) ||
    profile.expectedSalary ||
    profile.noticePeriod;

  return (
    <>
      <SectionCard
        title="Job Preferences"
        fromResume={isFromResume}
        onEdit={handleOpen}
        editAriaLabel="Edit job preferences"
      >
        {hasPreferences ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Preferred Job Types */}
            <div>
              <span className="text-[#5C564E] font-medium block mb-1.5">Preferred Job Types</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferredJobTypes && profile.preferredJobTypes.length > 0 ? (
                  profile.preferredJobTypes.map((t) => <Chip key={t} label={t} variant="accent" />)
                ) : (
                  <span className="text-[#5C564E] italic">Not specified</span>
                )}
              </div>
            </div>

            {/* Preferred Work Modes */}
            <div>
              <span className="text-[#5C564E] font-medium block mb-1.5">Work Modes</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferredWorkModes && profile.preferredWorkModes.length > 0 ? (
                  profile.preferredWorkModes.map((m) => <Chip key={m} label={m} />)
                ) : (
                  <span className="text-[#5C564E] italic">Not specified</span>
                )}
              </div>
            </div>

            {/* Preferred Locations */}
            <div>
              <span className="text-[#5C564E] font-medium block mb-1.5">Preferred Locations</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferredLocations && profile.preferredLocations.length > 0 ? (
                  profile.preferredLocations.map((loc) => <Chip key={loc} label={loc} variant="muted" />)
                ) : (
                  <span className="text-[#5C564E] italic">Any location</span>
                )}
              </div>
            </div>

            {/* Compensation & Notice */}
            <div className="space-y-1.5">
              <span className="text-[#5C564E] font-medium block">Compensation & Availability</span>
              {profile.expectedSalary && (
                <p className="text-[#1B1A17] font-semibold flex items-center gap-1">
                  <span>Expected:</span>
                  <span>₹{profile.expectedSalary.toLocaleString('en-IN')} / year</span>
                </p>
              )}
              {profile.noticePeriod && (
                <p className="text-[#5C564E] flex items-center gap-1">
                  <span>Notice Period:</span>
                  <span className="text-[#1B1A17] font-medium">{profile.noticePeriod}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Compass className="w-8 h-8 text-[#5C564E]" />}
            title="No job preferences set"
            description="Specify desired job types, remote/onsite modes, salary expectations, and notice period."
            actionLabel="+ Set job preferences"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      {/* Preferences Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Job Preferences"
        subtitle="Specify what kind of opportunities, salary, and work setups you are looking for."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Job Types */}
          <div>
            <label className="block text-xs font-semibold text-[#1B1A17] mb-2">
              Preferred Job Types <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_JOB_TYPES.map((type) => {
                const checked = selectedJobTypes.includes(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#C2410C] bg-[#FFF1E6] text-[#C2410C]'
                        : 'border-[#E8DFD4] bg-white text-[#1B1A17] hover:bg-[#FAF6F1]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedJobTypes, type]
                          : selectedJobTypes.filter((t) => t !== type);
                        setValue('preferredJobTypes', next, { shouldDirty: true, shouldValidate: true });
                      }}
                      className="sr-only"
                    />
                    <span>{type}</span>
                  </label>
                );
              })}
            </div>
            {errors.preferredJobTypes && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.preferredJobTypes.message}
              </p>
            )}
          </div>

          {/* Work Modes */}
          <div>
            <label className="block text-xs font-semibold text-[#1B1A17] mb-2">
              Preferred Work Modes <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_WORK_MODES.map((mode) => {
                const checked = selectedWorkModes.includes(mode);
                return (
                  <label
                    key={mode}
                    className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#C2410C] bg-[#FFF1E6] text-[#C2410C]'
                        : 'border-[#E8DFD4] bg-white text-[#1B1A17] hover:bg-[#FAF6F1]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedWorkModes, mode]
                          : selectedWorkModes.filter((m) => m !== mode);
                        setValue('preferredWorkModes', next, { shouldDirty: true, shouldValidate: true });
                      }}
                      className="sr-only"
                    />
                    <span>{mode}</span>
                  </label>
                );
              })}
            </div>
            {errors.preferredWorkModes && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.preferredWorkModes.message}
              </p>
            )}
          </div>

          {/* Preferred Locations (Chips, auto-split on comma, max 10) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pref-loc-input" className="block text-xs font-semibold text-[#1B1A17]">
                Preferred Locations (Max 10)
              </label>
              <span className="text-[11px] text-[#5C564E]">
                {selectedLocations.length}/10 locations
              </span>
            </div>
            <div className="flex gap-2">
              <input
                id="pref-loc-input"
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocations(locationInput);
                  }
                }}
                placeholder="Type location and press Enter (or comma-separated: Mumbai, Pune)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              <button
                type="button"
                onClick={() => handleAddLocations(locationInput)}
                className="px-4 py-2.5 rounded-xl bg-[#FAF6F1] hover:bg-[#F2E9E0] text-[#1B1A17] font-semibold text-xs border border-[#E8DFD4] shrink-0"
              >
                Add
              </button>
            </div>

            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-2.5 rounded-xl bg-[#FAF6F1]/50 border border-[#E8DFD4]">
                {selectedLocations.map((loc) => (
                  <Chip
                    key={loc}
                    label={loc}
                    onRemove={() => handleRemoveLocation(loc)}
                    removeAriaLabel={`Remove location ${loc}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Salary Expectation with Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="expectedSalary" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Expected Annual Salary (INR)
              </label>
              <input
                id="expectedSalary"
                type="number"
                step="50000"
                {...register('expectedSalary')}
                placeholder="e.g. 1500000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {expectedSalary && Number(expectedSalary) > 0 && (
                <p className="text-[11px] text-[#C2410C] font-semibold mt-1">
                  {inrToWords(Number(expectedSalary))}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="currentSalary" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Current Annual Salary (INR, optional)
              </label>
              <input
                id="currentSalary"
                type="number"
                step="50000"
                {...register('currentSalary')}
                placeholder="e.g. 1200000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {currentSalary && Number(currentSalary) > 0 && (
                <p className="text-[11px] text-[#5C564E] font-medium mt-1">
                  {inrToWords(Number(currentSalary))}
                </p>
              )}
            </div>
          </div>

          {/* Notice Period */}
          <div>
            <label htmlFor="noticePeriod" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Notice Period
            </label>
            <select
              id="noticePeriod"
              {...register('noticePeriod')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            >
              <option value="">Select notice period</option>
              {NOTICE_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </>
  );
};
export default JobPreferencesSection;
