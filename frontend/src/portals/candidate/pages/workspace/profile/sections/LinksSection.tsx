// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Links
// LinkedIn, GitHub, Portfolio, Twitter/X, LeetCode, Kaggle, Behance
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
import { Link2, ExternalLink, Globe, Code2, Terminal, Palette, Twitter } from 'lucide-react';

const validateUrl = (val?: string) => {
  if (!val || val.trim().length === 0) return true;
  try {
    const testUrl = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    new URL(testUrl);
    return true;
  } catch {
    return false;
  }
};

const linksSchema = z.object({
  linkedin: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
  github: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
  portfolio: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
  twitter: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
  leetcode: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
  kaggle: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
  behance: z.string().optional().refine(validateUrl, { message: 'Must be a valid web link' }),
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
      twitter: socialLinks.twitter || socialLinks.x || '',
      leetcode: socialLinks.leetcode || '',
      kaggle: socialLinks.kaggle || '',
      behance: socialLinks.behance || '',
    },
  });

  const handleOpen = () => {
    reset({
      linkedin: socialLinks.linkedin || '',
      github: socialLinks.github || '',
      portfolio: socialLinks.portfolio || '',
      twitter: socialLinks.twitter || socialLinks.x || '',
      leetcode: socialLinks.leetcode || '',
      kaggle: socialLinks.kaggle || '',
      behance: socialLinks.behance || '',
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: LinksFormValues) => {
    await updateMutation.mutateAsync({
      socialLinks: {
        linkedin: values.linkedin?.trim() || '',
        github: values.github?.trim() || '',
        portfolio: values.portfolio?.trim() || '',
        twitter: values.twitter?.trim() || '',
        leetcode: values.leetcode?.trim() || '',
        kaggle: values.kaggle?.trim() || '',
        behance: values.behance?.trim() || '',
      },
    });
    setIsOpen(false);
  };

  const linkItems = [
    { key: 'linkedin', label: 'LinkedIn', icon: Globe, url: socialLinks.linkedin },
    { key: 'github', label: 'GitHub', icon: Code2, url: socialLinks.github },
    { key: 'portfolio', label: 'Portfolio', icon: Globe, url: socialLinks.portfolio },
    { key: 'twitter', label: 'X / Twitter', icon: Twitter, url: socialLinks.twitter || socialLinks.x },
    { key: 'leetcode', label: 'LeetCode', icon: Terminal, url: socialLinks.leetcode },
    { key: 'kaggle', label: 'Kaggle', icon: Terminal, url: socialLinks.kaggle },
    { key: 'behance', label: 'Behance / Dribbble', icon: Palette, url: socialLinks.behance },
  ].filter((item) => Boolean(item.url));

  const hasLinks = linkItems.length > 0;

  const normalizeHref = (url?: string) => {
    if (!url) return '#';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  return (
    <>
      <SectionCard
        title="Links & Profiles"
        fromResume={isFromResume}
        onEdit={handleOpen}
        editAriaLabel="Edit social and portfolio links"
      >
        {hasLinks ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {linkItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.key}
                  href={normalizeHref(item.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 hover:bg-[#FAF6F1] flex items-center justify-between gap-2 text-xs font-semibold text-[#1B1A17] hover:text-[#C2410C] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#5C564E] shrink-0" />
                </a>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Link2 className="w-8 h-8 text-[#5C564E]" />}
            title="No links provided"
            description="Add your LinkedIn, GitHub, LeetCode, Kaggle, and personal portfolio or design profiles."
            actionLabel="+ Add links"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      {/* Links Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Links & Profiles"
        subtitle="Provide verified links to your professional profiles, code repositories, and portfolios."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
        maxWidth="lg"
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="link-linkedin" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                LinkedIn Profile URL
              </label>
              <input
                id="link-linkedin"
                type="text"
                {...register('linkedin')}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.linkedin && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.linkedin.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="link-github" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                GitHub Profile URL
              </label>
              <input
                id="link-github"
                type="text"
                {...register('github')}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.github && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.github.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="link-portfolio" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Personal Portfolio / Blog URL
              </label>
              <input
                id="link-portfolio"
                type="text"
                {...register('portfolio')}
                placeholder="https://yourportfolio.dev"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.portfolio && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.portfolio.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="link-twitter" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                X (Twitter) Profile URL
              </label>
              <input
                id="link-twitter"
                type="text"
                {...register('twitter')}
                placeholder="https://x.com/username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.twitter && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.twitter.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="link-leetcode" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                LeetCode Profile URL
              </label>
              <input
                id="link-leetcode"
                type="text"
                {...register('leetcode')}
                placeholder="https://leetcode.com/u/username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.leetcode && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.leetcode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="link-kaggle" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Kaggle Profile URL
              </label>
              <input
                id="link-kaggle"
                type="text"
                {...register('kaggle')}
                placeholder="https://kaggle.com/username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.kaggle && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.kaggle.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="link-behance" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Behance / Dribbble Design Portfolio
              </label>
              <input
                id="link-behance"
                type="text"
                {...register('behance')}
                placeholder="https://behance.net/username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.behance && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">{errors.behance.message}</p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
export default LinksSection;
