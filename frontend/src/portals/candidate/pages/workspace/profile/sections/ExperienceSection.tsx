// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Experience
// Vertical timeline with dot, title, company, dates, description
// Empty state with "+ Add experience" (never a blank form)
// Month/Year pickers (no free text), "Currently working here" disables end date
// Accessible delete confirmation dialog
// ============================================================

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { CandidateExperienceItem, CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Briefcase, Plus, Pencil, Trash2, Calendar, MapPin } from 'lucide-react';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 45 }, (_, i) => String(CURRENT_YEAR - i));

const experienceItemSchema = z
  .object({
    jobTitle: z.string().min(2, 'Job title is required'),
    company: z.string().min(2, 'Company name is required'),
    employmentType: z.string().optional(),
    location: z.string().optional(),
    startMonth: z.string().min(1, 'Start month is required'),
    startYear: z.string().min(1, 'Start year is required'),
    currentJob: z.boolean(),
    endMonth: z.string().optional(),
    endYear: z.string().optional(),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
  })
  .refine(
    (data) => {
      if (data.currentJob) return true;
      return Boolean(data.endMonth && data.endYear);
    },
    {
      message: 'End date is required when not currently working here',
      path: ['endMonth'],
    },
  );

type ExperienceFormValues = z.infer<typeof experienceItemSchema>;

export interface ExperienceSectionProps {
  profile: CandidateFullProfile;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const experiences = profile.experience || [];
  const isFromResume = Boolean(profile.fromResumeSections?.includes('experience'));

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceItemSchema),
    defaultValues: {
      jobTitle: '',
      company: '',
      employmentType: 'Full-time',
      location: '',
      startMonth: '',
      startYear: '',
      currentJob: false,
      endMonth: '',
      endYear: '',
      description: '',
    },
  });

  const isCurrent = watch('currentJob');

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      jobTitle: '',
      company: '',
      employmentType: 'Full-time',
      location: '',
      startMonth: '',
      startYear: '',
      currentJob: false,
      endMonth: '',
      endYear: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = experiences[index];
    if (!item) return;

    // Parse start date "Month Year" or "YYYY-MM"
    const startParts = (item.startDate || '').split(/[\s-]+/);
    const endParts = (item.endDate || '').split(/[\s-]+/);

    let sMonth = '';
    let sYear = '';
    if (startParts.length >= 2) {
      if (/^\d{4}$/.test(startParts[0])) {
        sYear = startParts[0];
        const mIdx = parseInt(startParts[1], 10) - 1;
        sMonth = MONTHS[mIdx] || '';
      } else {
        sMonth = startParts[0];
        sYear = startParts[1];
      }
    }

    let eMonth = '';
    let eYear = '';
    if (endParts.length >= 2) {
      if (/^\d{4}$/.test(endParts[0])) {
        eYear = endParts[0];
        const mIdx = parseInt(endParts[1], 10) - 1;
        eMonth = MONTHS[mIdx] || '';
      } else {
        eMonth = endParts[0];
        eYear = endParts[1];
      }
    }

    setEditingIndex(index);
    reset({
      jobTitle: item.jobTitle || (item as any).title || '',
      company: item.company || '',
      employmentType: item.employmentType || 'Full-time',
      location: item.location || '',
      startMonth: sMonth,
      startYear: sYear,
      currentJob: Boolean(item.currentJob),
      endMonth: eMonth,
      endYear: eYear,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: ExperienceFormValues) => {
    const formattedStartDate = `${values.startMonth} ${values.startYear}`.trim();
    const formattedEndDate = values.currentJob
      ? undefined
      : `${values.endMonth} ${values.endYear}`.trim();

    const newItem: CandidateExperienceItem = {
      jobTitle: values.jobTitle.trim(),
      company: values.company.trim(),
      employmentType: values.employmentType,
      location: values.location?.trim() || undefined,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      currentJob: values.currentJob,
      description: values.description?.trim() || undefined,
    };

    const nextList = [...experiences];
    if (editingIndex !== null) {
      nextList[editingIndex] = newItem;
    } else {
      nextList.push(newItem);
    }

    await updateMutation.mutateAsync({ experience: nextList });
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    const nextList = experiences.filter((_, i) => i !== deleteIndex);
    await updateMutation.mutateAsync({ experience: nextList });
    setDeleteIndex(null);
  };

  return (
    <>
      <SectionCard
        title="Experience"
        count={experiences.length}
        fromResume={isFromResume}
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label="Add experience"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C2410C] hover:bg-[#FFF1E6] border border-[#C2410C]/30 transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add</span>
          </button>
        }
      >
        {experiences.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8DFD4]">
            {experiences.map((exp, index) => {
              const title = exp.jobTitle || (exp as any).title;
              const dateRange = exp.currentJob
                ? `${exp.startDate || ''} – Present`
                : `${exp.startDate || ''} – ${exp.endDate || ''}`;

              return (
                <div key={index} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-[#C2410C] shadow-xs" />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
                        {title}
                      </h3>
                      <p className="text-xs font-medium text-[#5C564E] mt-0.5">
                        {exp.company}
                        {exp.employmentType && ` · ${exp.employmentType}`}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#5C564E] mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#5C564E]" />
                          {dateRange}
                        </span>
                        {exp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#5C564E]" />
                            {exp.location}
                          </span>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-[#1B1A17]/85 mt-2 whitespace-pre-line leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(index)}
                        aria-label={`Edit experience at ${exp.company}`}
                        className="p-1 rounded-lg text-[#5C564E] hover:text-[#C2410C] hover:bg-[#FAF6F1] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteIndex(index)}
                        aria-label={`Delete experience at ${exp.company}`}
                        className="p-1 rounded-lg text-[#5C564E] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Briefcase className="w-8 h-8 text-[#5C564E]" />}
            title="No experience listed"
            description="Add your work experience, internships, or freelance roles to demonstrate your track record."
            actionLabel="+ Add experience"
            onAction={handleOpenAdd}
          />
        )}
      </SectionCard>

      {/* Experience Edit/Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? 'Edit Experience' : 'Add Experience'}
        subtitle="Specify role, organization, dates, and key accomplishments."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="jobTitle" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Job Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="jobTitle"
              type="text"
              {...register('jobTitle')}
              aria-invalid={Boolean(errors.jobTitle)}
              aria-describedby={errors.jobTitle ? 'jobTitle-error' : undefined}
              placeholder="e.g. Senior Frontend Engineer"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
                errors.jobTitle ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
              }`}
            />
            {errors.jobTitle && (
              <p id="jobTitle-error" className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.jobTitle.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="company" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Company / Organization <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="company"
                type="text"
                {...register('company')}
                aria-invalid={Boolean(errors.company)}
                aria-describedby={errors.company ? 'company-error' : undefined}
                placeholder="e.g. Acme Technologies"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
                  errors.company ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
                }`}
              />
              {errors.company && (
                <p id="company-error" className="text-xs text-[#DC2626] mt-1" role="alert">
                  {errors.company.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="employmentType" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Employment Type
              </label>
              <select
                id="employmentType"
                {...register('employmentType')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              >
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Part-time">Part-time</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="exp-location" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Location
            </label>
            <input
              id="exp-location"
              type="text"
              {...register('location')}
              placeholder="e.g. Bengaluru, India (or Remote)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
          </div>

          {/* Currently Working Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Controller
                name="currentJob"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8DFD4] text-[#C2410C] focus:ring-[#C2410C] accent-[#C2410C]"
                  />
                )}
              />
              <span className="text-xs font-medium text-[#1B1A17]">Currently working here</span>
            </label>
          </div>

          {/* Start Date Month/Year Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Start Date <span className="text-[#DC2626]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  {...register('startMonth')}
                  aria-label="Start month"
                  className="w-full px-2.5 py-2 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none"
                >
                  <option value="">Month</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  {...register('startYear')}
                  aria-label="Start year"
                  className="w-full px-2.5 py-2 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none"
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {(errors.startMonth || errors.startYear) && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">
                  Start month and year are required
                </p>
              )}
            </div>

            {/* End Date Month/Year Picker (disabled when currentJob) */}
            <div>
              <label className="block text-xs font-semibold text-[#1B1A17] mb-1">
                End Date {!isCurrent && <span className="text-[#DC2626]">*</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  {...register('endMonth')}
                  disabled={isCurrent}
                  aria-label="End month"
                  className="w-full px-2.5 py-2 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none disabled:bg-[#FAF6F1] disabled:text-[#5C564E]/50"
                >
                  <option value="">Month</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  {...register('endYear')}
                  disabled={isCurrent}
                  aria-label="End year"
                  className="w-full px-2.5 py-2 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none disabled:bg-[#FAF6F1] disabled:text-[#5C564E]/50"
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {errors.endMonth && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">
                  {errors.endMonth.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="exp-desc" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Description / Key Responsibilities
            </label>
            <textarea
              id="exp-desc"
              rows={4}
              {...register('description')}
              placeholder="Outline what you built, shipped, scaled, or managed..."
              className="w-full p-3.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Experience Entry?"
        message="Are you sure you want to remove this experience item from your profile? This cannot be undone."
        confirmLabel="Delete Experience"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={updateMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
};
export default ExperienceSection;
