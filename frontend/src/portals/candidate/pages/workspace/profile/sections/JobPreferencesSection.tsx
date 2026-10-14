// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Job Preferences
// Target job roles (tag input, max 10), preferredJobTypes, preferredWorkModes,
// preferred locations, relocation toggle, work authorization dropdown,
// expectedSalary with amount in words, noticePeriod, and optional currentSalary
// ============================================================

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { Chip } from '../../../../components/Chip';
import { EmptyState } from '../../../../components/EmptyState';
import { NOTICE_PERIODS, inrToWords, WORK_AUTHORIZATION_OPTIONS } from '../../../../lib/constants';
import { CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Compass, Briefcase, MapPin, IndianRupee, Clock, ShieldCheck, Globe2 } from 'lucide-react';

const ALL_JOB_TYPES = ['Full-time', 'Internship', 'Contract', 'Part-time'] as const;
const ALL_WORK_MODES = ['Remote', 'Hybrid', 'Onsite'] as const;

const preferencesSchema = z.object({
  targetRoles: z.array(z.string()).max(10, 'Maximum 10 target roles allowed').optional(),
  preferredJobTypes: z.array(z.string()).min(1, 'Select at least one job type'),
  preferredWorkModes: z.array(z.string()).min(1, 'Select at least one work mode'),
  preferredLocations: z
    .array(z.string())
    .max(10, 'Maximum 10 preferred locations allowed'),
  willingToRelocate: z.boolean().optional(),
  workAuthorization: z.string().optional(),
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
  const [roleInput, setRoleInput] = useState('');
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
      targetRoles: profile.targetRoles || [],
      preferredJobTypes: profile.preferredJobTypes || [],
      preferredWorkModes: (profile.preferredWorkModes || []).map((m) =>
        m === 'On-site' ? 'Onsite' : m,
      ),
      preferredLocations: profile.preferredLocations || [],
      willingToRelocate: Boolean(profile.willingToRelocate),
      workAuthorization: profile.workAuthorization || '',
      expectedSalary: profile.expectedSalary || undefined,
      currentSalary: profile.currentSalary || undefined,
      noticePeriod: profile.noticePeriod || '',
    },
  });

  const selectedRoles = watch('targetRoles') || [];
  const selectedJobTypes = watch('preferredJobTypes') || [];
  const selectedWorkModes = watch('preferredWorkModes') || [];
  const selectedLocations = watch('preferredLocations') || [];
  const expectedSalary = watch('expectedSalary');
  const currentSalary = watch('currentSalary');

  const handleOpen = () => {
    reset({
      targetRoles: profile.targetRoles || [],
      preferredJobTypes: profile.preferredJobTypes || [],
      preferredWorkModes: (profile.preferredWorkModes || []).map((m) =>
        m === 'On-site' ? 'Onsite' : m,
      ),
      preferredLocations: profile.preferredLocations || [],
      willingToRelocate: Boolean(profile.willingToRelocate),
      workAuthorization: profile.workAuthorization || '',
      expectedSalary: profile.expectedSalary || undefined,
      currentSalary: profile.currentSalary || undefined,
      noticePeriod: profile.noticePeriod || '',
    });
    setRoleInput('');
    setLocationInput('');
    setIsOpen(true);
  };

  const handleAddRoles = (input: string) => {
    if (!input.trim()) return;
    const tokens = input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...selectedRoles, ...tokens])).slice(0, 10);
    setValue('targetRoles', merged, { shouldDirty: true, shouldValidate: true });
    setRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    const filtered = selectedRoles.filter((r) => r.toLowerCase() !== roleToRemove.toLowerCase());
    setValue('targetRoles', filtered, { shouldDirty: true, shouldValidate: true });
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
      targetRoles: values.targetRoles,
      preferredJobTypes: values.preferredJobTypes,
      preferredWorkModes: values.preferredWorkModes,
      preferredLocations: values.preferredLocations,
      willingToRelocate: values.willingToRelocate,
      workAuthorization: values.workAuthorization || undefined,
      expectedSalary: values.expectedSalary ? Number(values.expectedSalary) : undefined,
      currentSalary: values.currentSalary ? Number(values.currentSalary) : undefined,
      noticePeriod: values.noticePeriod || undefined,
    });
    setIsOpen(false);
  };

  const hasPreferences =
    (profile.targetRoles && profile.targetRoles.length > 0) ||
    (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) ||
    (profile.preferredWorkModes && profile.preferredWorkModes.length > 0) ||
    (profile.preferredLocations && profile.preferredLocations.length > 0) ||
    profile.willingToRelocate ||
    profile.workAuthorization ||
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
          <div className="space-y-4 text-xs">
            {/* Target Job Roles */}
            {profile.targetRoles && profile.targetRoles.length > 0 && (
              <div>
                <span className="text-[#5C564E] font-medium block mb-1.5">Target Job Roles</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetRoles.map((role) => (
                    <Chip key={role} label={role} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Preferred Job Types */}
              <div>
                <span className="text-[#5C564E] font-medium block mb-1.5">Preferred Job Types</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.preferredJobTypes || []).map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E8DFD4] text-[#1B1A17] font-semibold text-[11px]"
                    >
                      <Briefcase className="w-3 h-3 text-[#C2410C]" />
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Work Modes */}
              <div>
                <span className="text-[#5C564E] font-medium block mb-1.5">Work Modes</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.preferredWorkModes || []).map((mode) => (
                    <span
                      key={mode}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E8DFD4] text-[#1B1A17] font-semibold text-[11px]"
                    >
                      <Compass className="w-3 h-3 text-[#C2410C]" />
                      {mode}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Locations & Relocation */}
              <div>
                <span className="text-[#5C564E] font-medium block mb-1.5">Preferred Locations</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.preferredLocations || []).map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E8DFD4] text-[#1B1A17] font-medium text-[11px]"
                    >
                      <MapPin className="w-3 h-3 text-[#5C564E]" />
                      {loc}
                    </span>
                  ))}
                  {profile.willingToRelocate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDF4] border border-[#16A34A]/20 text-[#16A34A] font-semibold text-[11px]">
                      <Globe2 className="w-3 h-3" />
                      Willing to relocate
                    </span>
                  )}
                </div>
              </div>

              {/* Work Authorization */}
              {profile.workAuthorization && (
                <div>
                  <span className="text-[#5C564E] font-medium block mb-1.5">Work Authorization</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E8DFD4] text-[#1B1A17] font-semibold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                    {profile.workAuthorization}
                  </span>
                </div>
              )}

              {/* Expected & Current Salary */}
              <div>
                <span className="text-[#5C564E] font-medium block mb-1.5">Compensation</span>
                <div className="space-y-0.5">
                  {profile.expectedSalary ? (
                    <p className="font-semibold text-[#1B1A17]">
                      Expected: ₹{Number(profile.expectedSalary).toLocaleString('en-IN')}/yr
                      <span className="text-[11px] text-[#5C564E] font-normal block">
                        ({inrToWords(Number(profile.expectedSalary))})
                      </span>
                    </p>
                  ) : (
                    <p className="text-[#5C564E] italic">Expected salary not specified</p>
                  )}
                  {profile.currentSalary && (
                    <p className="text-[#5C564E] text-[11px]">
                      Current: ₹{Number(profile.currentSalary).toLocaleString('en-IN')}/yr
                    </p>
                  )}
                </div>
              </div>

              {/* Notice Period */}
              <div>
                <span className="text-[#5C564E] font-medium block mb-1.5">Notice Period</span>
                {profile.noticePeriod ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E8DFD4] text-[#1B1A17] font-semibold text-[11px]">
                    <Clock className="w-3 h-3 text-[#5C564E]" />
                    {profile.noticePeriod}
                  </span>
                ) : (
                  <span className="text-[#5C564E] italic">Not specified</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Compass className="w-8 h-8 text-[#5C564E]" />}
            title="No preferences configured"
            description="Set your target roles, job types, preferred locations, and expected compensation to get tailored opportunities."
            actionLabel="+ Set preferences"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      {/* Preferences Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Job Preferences"
        subtitle="Set your target titles, availability, work modes, and compensation expectations."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Target Job Roles (Tag input, max 10) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="target-role-input" className="block text-xs font-semibold text-[#1B1A17]">
                Target Job Roles / Desired Titles (Max 10)
              </label>
              <span className="text-[11px] text-[#5C564E]">
                {selectedRoles.length}/10 roles
              </span>
            </div>
            <div className="flex gap-2">
              <input
                id="target-role-input"
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRoles(roleInput);
                  }
                }}
                placeholder="e.g. Frontend Engineer, Full Stack Developer, Tech Lead..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              <button
                type="button"
                onClick={() => handleAddRoles(roleInput)}
                className="px-4 py-2.5 rounded-xl bg-[#FAF6F1] hover:bg-[#F2E9E0] text-[#1B1A17] font-semibold text-xs border border-[#E8DFD4] shrink-0"
              >
                Add
              </button>
            </div>

            {selectedRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-2.5 rounded-xl bg-[#FAF6F1]/50 border border-[#E8DFD4]">
                {selectedRoles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    onRemove={() => handleRemoveRole(role)}
                    removeAriaLabel={`Remove target role ${role}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preferred Job Types */}
          <div>
            <label className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
              Preferred Job Types <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_JOB_TYPES.map((type) => {
                const isSelected = selectedJobTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? selectedJobTypes.filter((t) => t !== type)
                        : [...selectedJobTypes, type];
                      setValue('preferredJobTypes', updated, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#C2410C] text-white border-[#C2410C]'
                        : 'bg-white text-[#1B1A17] border-[#E8DFD4] hover:bg-[#FAF6F1]'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {errors.preferredJobTypes && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.preferredJobTypes.message}
              </p>
            )}
          </div>

          {/* Preferred Work Modes */}
          <div>
            <label className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
              Preferred Work Modes <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_WORK_MODES.map((mode) => {
                const isSelected = selectedWorkModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? selectedWorkModes.filter((m) => m !== mode)
                        : [...selectedWorkModes, mode];
                      setValue('preferredWorkModes', updated, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#C2410C] text-white border-[#C2410C]'
                        : 'bg-white text-[#1B1A17] border-[#E8DFD4] hover:bg-[#FAF6F1]'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            {errors.preferredWorkModes && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.preferredWorkModes.message}
              </p>
            )}
          </div>

          {/* Locations */}
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

          {/* Relocation Toggle & Work Authorization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Relocation Toggle */}
            <div className="p-3 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#1B1A17] block">Willing to Relocate</span>
                <span className="text-[11px] text-[#5C564E] block mt-0.5">Open to moving for the right role</span>
              </div>
              <Controller
                name="willingToRelocate"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    aria-label="Willing to relocate"
                    className="w-4 h-4 rounded border-[#D7C9BA] text-[#C2410C] focus:ring-[#C2410C] accent-[#C2410C] cursor-pointer"
                  />
                )}
              />
            </div>

            {/* Work Authorization Selector */}
            <div>
              <label htmlFor="workAuthorization" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Work Authorization Status
              </label>
              <select
                id="workAuthorization"
                {...register('workAuthorization')}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              >
                <option value="">Select work authorization</option>
                {WORK_AUTHORIZATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
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
