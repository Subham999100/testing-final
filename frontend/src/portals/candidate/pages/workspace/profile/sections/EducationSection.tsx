// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Education
// Structured fields: institution, degree, fieldOfStudy, grade, start/end year,
// and a VISIBLE description textarea
// ============================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { CandidateEducationItem, CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { GraduationCap, Plus, Pencil, Trash2, Calendar, Award } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR + 6 - i);

const educationItemSchema = z
  .object({
    institution: z.string().min(2, 'Institution is required'),
    degree: z.string().min(2, 'Degree is required'),
    fieldOfStudy: z.string().optional(),
    grade: z.string().optional(),
    startYear: z.coerce.number().min(1970, 'Valid start year required'),
    endYear: z.coerce.number().min(1970, 'Valid end year required'),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
  })
  .refine((data) => data.endYear >= data.startYear, {
    message: 'End year must be equal to or greater than start year',
    path: ['endYear'],
  });

type EducationFormValues = z.infer<typeof educationItemSchema>;

export interface EducationSectionProps {
  profile: CandidateFullProfile;
}

export const EducationSection: React.FC<EducationSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const educationList = profile.education || [];
  const isFromResume = Boolean(profile.fromResumeSections?.includes('education'));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationItemSchema),
    defaultValues: {
      institution: '',
      degree: '',
      fieldOfStudy: '',
      grade: '',
      startYear: CURRENT_YEAR - 4,
      endYear: CURRENT_YEAR,
      description: '',
    },
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      grade: '',
      startYear: CURRENT_YEAR - 4,
      endYear: CURRENT_YEAR,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = educationList[index];
    if (!item) return;

    setEditingIndex(index);
    reset({
      institution: item.institution || '',
      degree: item.degree || '',
      fieldOfStudy: item.fieldOfStudy || '',
      grade: item.grade || '',
      startYear: item.startYear || CURRENT_YEAR - 4,
      endYear: item.endYear || CURRENT_YEAR,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: EducationFormValues) => {
    const newItem: CandidateEducationItem = {
      institution: values.institution.trim(),
      degree: values.degree.trim(),
      fieldOfStudy: values.fieldOfStudy?.trim() || undefined,
      grade: values.grade?.trim() || undefined,
      startYear: values.startYear,
      endYear: values.endYear,
      description: values.description?.trim() || undefined,
    };

    const nextList = [...educationList];
    if (editingIndex !== null) {
      nextList[editingIndex] = newItem;
    } else {
      nextList.push(newItem);
    }

    await updateMutation.mutateAsync({ education: nextList });
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    const nextList = educationList.filter((_, i) => i !== deleteIndex);
    await updateMutation.mutateAsync({ education: nextList });
    setDeleteIndex(null);
  };

  return (
    <>
      <SectionCard
        title="Education"
        count={educationList.length}
        fromResume={isFromResume}
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label="Add education"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C2410C] hover:bg-[#FFF1E6] border border-[#C2410C]/30 transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add</span>
          </button>
        }
      >
        {educationList.length > 0 ? (
          <div className="space-y-4">
            {educationList.map((edu, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 hover:bg-[#FAF6F1]/60 transition-colors flex items-start justify-between gap-4 group"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
                    {edu.degree}
                    {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                  </h3>
                  <p className="text-xs font-medium text-[#5C564E] mt-0.5">{edu.institution}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#5C564E] mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#5C564E]" />
                      {edu.startYear} – {edu.endYear}
                    </span>
                    {edu.grade && (
                      <span className="flex items-center gap-1 font-semibold text-[#1B1A17]">
                        <Award className="w-3 h-3 text-[#C2410C]" />
                        Grade: {edu.grade}
                      </span>
                    )}
                  </div>
                  {/* VISIBLE description text */}
                  {edu.description && (
                    <p className="text-xs text-[#1B1A17]/85 mt-2 whitespace-pre-line leading-relaxed">
                      {edu.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(index)}
                    aria-label={`Edit education at ${edu.institution}`}
                    className="p-1 rounded-lg text-[#5C564E] hover:text-[#C2410C] hover:bg-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    aria-label={`Delete education at ${edu.institution}`}
                    className="p-1 rounded-lg text-[#5C564E] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8 text-[#5C564E]" />}
            title="No education listed"
            description="Add your university, college, degrees, field of study, and academic honors."
            actionLabel="+ Add education"
            onAction={handleOpenAdd}
          />
        )}
      </SectionCard>

      {/* Education Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? 'Edit Education' : 'Add Education'}
        subtitle="Provide structured details of your qualification and institution."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="institution" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Institution / University <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="institution"
              type="text"
              {...register('institution')}
              aria-invalid={Boolean(errors.institution)}
              aria-describedby={errors.institution ? 'institution-error' : undefined}
              placeholder="e.g. Indian Institute of Technology, Bombay"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
                errors.institution ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
              }`}
            />
            {errors.institution && (
              <p id="institution-error" className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.institution.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="degree" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Degree <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="degree"
                type="text"
                {...register('degree')}
                aria-invalid={Boolean(errors.degree)}
                aria-describedby={errors.degree ? 'degree-error' : undefined}
                placeholder="e.g. Bachelor of Technology (B.Tech)"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
                  errors.degree ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
                }`}
              />
              {errors.degree && (
                <p id="degree-error" className="text-xs text-[#DC2626] mt-1" role="alert">
                  {errors.degree.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fieldOfStudy" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Field of Study
              </label>
              <input
                id="fieldOfStudy"
                type="text"
                {...register('fieldOfStudy')}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="startYear" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Start Year <span className="text-[#DC2626]">*</span>
              </label>
              <select
                id="startYear"
                {...register('startYear')}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="endYear" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                End Year <span className="text-[#DC2626]">*</span>
              </label>
              <select
                id="endYear"
                {...register('endYear')}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {errors.endYear && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">
                  {errors.endYear.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="grade" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Grade / CGPA
              </label>
              <input
                id="grade"
                type="text"
                {...register('grade')}
                placeholder="e.g. 8.9 / 10 or 85%"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
            </div>
          </div>

          {/* VISIBLE description textarea */}
          <div>
            <label htmlFor="edu-desc" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Description & Activities (Visible on profile)
            </label>
            <textarea
              id="edu-desc"
              rows={3}
              {...register('description')}
              placeholder="Notable projects, coursework, honors, publications, or extracurriculars..."
              className="w-full p-3.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Education Entry?"
        message="Are you sure you want to remove this education entry from your profile? This cannot be undone."
        confirmLabel="Delete Education"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={updateMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
};
export default EducationSection;
