// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: About
// Card view + accessible Edit modal with bio textarea and char counter
// ============================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { FileText } from 'lucide-react';

const aboutSchema = z.object({
  bio: z
    .string()
    .max(2000, 'About summary must not exceed 2000 characters')
    .optional(),
});

type AboutFormValues = z.infer<typeof aboutSchema>;

export interface AboutSectionProps {
  profile: CandidateFullProfile;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const updateMutation = useProfileSectionUpdate();

  const isFromResume = Boolean(
    profile.fromResumeSections?.includes('bio') || profile.fromResumeSections?.includes('about'),
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AboutFormValues>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      bio: profile.bio || '',
    },
  });

  const bioValue = watch('bio') || '';

  const handleOpen = () => {
    reset({ bio: profile.bio || '' });
    setIsOpen(true);
  };

  const onSubmit = async (values: AboutFormValues) => {
    await updateMutation.mutateAsync({
      bio: values.bio?.trim() || undefined,
    });
    setIsOpen(false);
  };

  return (
    <>
      <SectionCard
        title="About"
        fromResume={isFromResume}
        onEdit={handleOpen}
        editAriaLabel="Edit About summary"
      >
        {profile.bio ? (
          <p className="text-sm text-[#1B1A17] whitespace-pre-line leading-relaxed">
            {profile.bio}
          </p>
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-[#5C564E]" />}
            title="No summary added yet"
            description="Introduce yourself, highlight your key accomplishments and what you are looking for next."
            actionLabel="+ Add summary"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit About"
        subtitle="Write a brief professional summary to introduce yourself to hiring teams."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="lg"
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="bio" className="block text-xs font-semibold text-[#1B1A17]">
              Professional Summary
            </label>
            <span
              className={`text-[11px] ${
                bioValue.length > 2000 ? 'text-[#DC2626] font-semibold' : 'text-[#5C564E]'
              }`}
            >
              {bioValue.length}/2000
            </span>
          </div>
          <textarea
            id="bio"
            rows={6}
            {...register('bio')}
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
            placeholder="Highlight your background, core strengths, tech stacks, and career aspirations..."
            className={`w-full p-3.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
              errors.bio ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
            }`}
          />
          {errors.bio && (
            <p id="bio-error" className="text-xs text-[#DC2626] mt-1" role="alert">
              {errors.bio.message}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
};
export default AboutSection;
