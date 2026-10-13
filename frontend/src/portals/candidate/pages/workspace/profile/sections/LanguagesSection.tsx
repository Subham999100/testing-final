// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Languages
// Card view + language add/edit modal with structured proficiency levels
// Delete confirmation dialog
// ============================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { CandidateFullProfile, CandidateLanguageItem } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Languages as LanguagesIcon, Plus, Pencil, Trash2 } from 'lucide-react';

const PROFICIENCY_LEVELS = ['Basic', 'Conversational', 'Fluent', 'Native'] as const;

const languageItemSchema = z.object({
  name: z.string().min(2, 'Language name is required'),
  proficiency: z.enum(PROFICIENCY_LEVELS, {
    errorMap: () => ({ message: 'Please select a valid proficiency level' }),
  }),
});

type LanguageFormValues = z.infer<typeof languageItemSchema>;

export interface LanguagesSectionProps {
  profile: CandidateFullProfile;
}

export const LanguagesSection: React.FC<LanguagesSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Normalize languages into structured objects { name, proficiency }, filtering invalid items
  const rawLanguages = Array.isArray(profile.languages) ? profile.languages : [];
  const normalizedLanguages: CandidateLanguageItem[] = rawLanguages
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        return { name: item.trim(), proficiency: 'Fluent' };
      }
      if (
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as any).name === 'string' &&
        (item as any).name.trim().length > 0
      ) {
        return {
          name: (item as any).name.trim(),
          proficiency: (item as any).proficiency || 'Fluent',
        };
      }
      return null;
    })
    .filter((item): item is CandidateLanguageItem => item !== null);

  const isFromResume = Boolean(profile.fromResumeSections?.includes('languages'));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LanguageFormValues>({
    resolver: zodResolver(languageItemSchema),
    defaultValues: {
      name: '',
      proficiency: 'Fluent',
    },
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      name: '',
      proficiency: 'Fluent',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = normalizedLanguages[index];
    if (!item) return;

    setEditingIndex(index);
    reset({
      name: item.name,
      proficiency: (item.proficiency as any) || 'Fluent',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: LanguageFormValues) => {
    console.log('[LanguagesSection] Submitting language form:', values);
    const newItem: CandidateLanguageItem = {
      name: values.name.trim(),
      proficiency: values.proficiency,
    };

    const nextList = [...normalizedLanguages];
    if (editingIndex !== null) {
      nextList[editingIndex] = newItem;
    } else {
      nextList.push(newItem);
    }

    console.log('[LanguagesSection] Applying language updates to backend:', nextList);
    await updateMutation.mutateAsync({ languages: nextList });
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    const nextList = normalizedLanguages.filter((_, i) => i !== deleteIndex);
    console.log('[LanguagesSection] Deleting language, updated list:', nextList);
    await updateMutation.mutateAsync({ languages: nextList });
    setDeleteIndex(null);
  };


  return (
    <>
      <SectionCard
        title="Languages"
        count={normalizedLanguages.length}
        fromResume={isFromResume}
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label="Add language"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C2410C] hover:bg-[#FFF1E6] border border-[#C2410C]/30 transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add</span>
          </button>
        }
      >
        {normalizedLanguages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {normalizedLanguages.map((lang, index) => (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 hover:bg-[#FAF6F1]/60 transition-colors flex items-center justify-between gap-3 group"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#1B1A17]">{lang.name}</h3>
                  <span className="text-xs text-[#5C564E] font-medium">{lang.proficiency}</span>
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(index)}
                    aria-label={`Edit language ${lang.name}`}
                    className="p-1 rounded-lg text-[#5C564E] hover:text-[#C2410C] hover:bg-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    aria-label={`Delete language ${lang.name}`}
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
            icon={<LanguagesIcon className="w-8 h-8 text-[#5C564E]" />}
            title="No languages added"
            description="Add languages you speak and your proficiency level (e.g. English, Hindi, German)."
            actionLabel="+ Add language"
            onAction={handleOpenAdd}
          />
        )}
      </SectionCard>

      {/* Language Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? 'Edit Language' : 'Add Language'}
        subtitle="Specify language and your working proficiency level."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="lang-name" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Language <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="lang-name"
              type="text"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              placeholder="e.g. English, Hindi, Spanish"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.name && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lang-prof" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Proficiency Level <span className="text-[#DC2626]">*</span>
            </label>
            <select
              id="lang-prof"
              {...register('proficiency')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            >
              {PROFICIENCY_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Language?"
        message="Are you sure you want to remove this language entry from your profile? This cannot be undone."
        confirmLabel="Delete Language"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={updateMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
};
export default LanguagesSection;
