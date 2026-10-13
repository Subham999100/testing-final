// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Links
// LinkedIn, GitHub, and Portfolio URLs with domain validation
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
import { Link2, ExternalLink, Globe } from 'lucide-react';

const linksSchema = z.object({
  linkedin: z
    .string()
    .refine(
      (val) => !val || (val.startsWith('http') && val.toLowerCase().includes('linkedin.com')),
      { message: 'Must be a valid LinkedIn URL (https://linkedin.com/in/...)' },
    )
    .optional(),
  github: z
    .string()
    .refine(
      (val) => !val || (val.startsWith('http') && val.toLowerCase().includes('github.com')),
      { message: 'Must be a valid GitHub URL (https://github.com/...)' },
    )
    .optional(),
  portfolio: z
    .string()
    .refine((val) => !val || val.startsWith('http'), {
      message: 'Must be a valid URL starting with http:// or https://',
    })
    .optional(),
});

type LinksFormValues = z.infer<typeof linksSchema>;

export interface LinksSectionProps {
  profile: CandidateFullProfile;
}

export const LinksSection: React.FC<LinksSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isOpen, setIsOpen] = useState(false);

  const socialLinks = profile.socialLinks || {};
  const isFromResume = Boolean(profile.fromResumeSections?.includes('socialLinks'));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LinksFormValues>({
    resolver: zodResolver(linksSchema),
    defaultValues: {
      linkedin: socialLinks.linkedin || '',
      github: socialLinks.github || '',
      portfolio: socialLinks.portfolio || '',
    },
  });

  const handleOpen = () => {
    reset({
      linkedin: socialLinks.linkedin || '',
      github: socialLinks.github || '',
      portfolio: socialLinks.portfolio || '',
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: LinksFormValues) => {
    await updateMutation.mutateAsync({
      socialLinks: {
        linkedin: values.linkedin?.trim() || '',
        github: values.github?.trim() || '',
        portfolio: values.portfolio?.trim() || '',
      },
    });
    setIsOpen(false);
  };

  const hasLinks = socialLinks.linkedin || socialLinks.github || socialLinks.portfolio;

  return (
    <>
      <SectionCard
        title="Links"
        fromResume={isFromResume}
        onEdit={handleOpen}
        editAriaLabel="Edit social and portfolio links"
      >
        {hasLinks ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 hover:bg-[#FAF6F1] flex items-center justify-between gap-2 text-xs font-semibold text-[#1B1A17] hover:text-[#C2410C] transition-colors"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#5C564E]" />
              </a>
            )}

            {socialLinks.github && (
              <a
                href={socialLinks.github}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 hover:bg-[#FAF6F1] flex items-center justify-between gap-2 text-xs font-semibold text-[#1B1A17] hover:text-[#C2410C] transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#5C564E]" />
              </a>
            )}

            {socialLinks.portfolio && (
              <a
                href={socialLinks.portfolio}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 hover:bg-[#FAF6F1] flex items-center justify-between gap-2 text-xs font-semibold text-[#1B1A17] hover:text-[#C2410C] transition-colors"
              >
                <span>Portfolio / Blog</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#5C564E]" />
              </a>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Link2 className="w-8 h-8 text-[#5C564E]" />}
            title="No links provided"
            description="Add your LinkedIn, GitHub, and personal portfolio or technical blog."
            actionLabel="+ Add links"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      {/* Links Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Links"
        subtitle="Provide verified links to your professional profiles and code repositories."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="link-linkedin" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              LinkedIn Profile URL
            </label>
            <input
              id="link-linkedin"
              type="url"
              {...register('linkedin')}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.linkedin && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.linkedin.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="link-github" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              GitHub Profile URL
            </label>
            <input
              id="link-github"
              type="url"
              {...register('github')}
              placeholder="https://github.com/username"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.github && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.github.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="link-portfolio" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Personal Portfolio / Website
            </label>
            <input
              id="link-portfolio"
              type="url"
              {...register('portfolio')}
              placeholder="https://yourportfolio.dev"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.portfolio && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.portfolio.message}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
export default LinksSection;
