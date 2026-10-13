// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Projects
// Card view + structured project add/edit modal + delete confirmation
// Optional project links with lenient URL parsing
// ============================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { Chip } from '../../../../components/Chip';
import { CandidateFullProfile, CandidateProjectItem } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { FolderGit2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

const projectItemSchema = z.object({
  title: z.string().min(2, 'Project title is required (at least 2 characters)'),
  role: z.string().optional(),
  technologies: z.string().optional(),
  url: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim().length === 0) return true; // empty -> skip validation
        try {
          const testUrl = /^https?:\/\//i.test(val) ? val : `https://${val}`;
          new URL(testUrl);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Please enter a valid web link (e.g. github.com/user/project or https://...)' },
    ),
  description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
});

type ProjectFormValues = z.infer<typeof projectItemSchema>;

export interface ProjectsSectionProps {
  profile: CandidateFullProfile;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Normalize and strictly filter out invalid/empty items from resume data or empty defaults
  const rawProjects = Array.isArray(profile?.projects) ? profile.projects : [];
  const projects: CandidateProjectItem[] = rawProjects
    .filter((item): item is CandidateProjectItem =>
      Boolean(
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as any).title === 'string' &&
        (item as any).title.trim().length > 0,
      ),
    )
    .map((item) => ({
      title: (item as any).title.trim(),
      role: (item as any).role?.trim() || undefined,
      technologies: Array.isArray((item as any).technologies)
        ? (item as any).technologies.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof (item as any).technologies === 'string'
          ? (item as any).technologies.split(',').map((t: string) => t.trim()).filter(Boolean)
          : undefined,
      url: (item as any).url?.trim() || (item as any).link?.trim() || undefined,
      description: (item as any).description?.trim() || undefined,
    }));

  const isFromResume = Boolean(profile.fromResumeSections?.includes('projects'));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectItemSchema),
    defaultValues: {
      title: '',
      role: '',
      technologies: '',
      url: '',
      description: '',
    },
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      title: '',
      role: '',
      technologies: '',
      url: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = projects[index];
    if (!item) return;

    setEditingIndex(index);
    reset({
      title: item.title,
      role: item.role || '',
      technologies: (item.technologies || []).join(', '),
      url: item.url || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    console.log('[ProjectsSection] Save clicked with form values:', values);
    try {
      const techArray = values.technologies
        ? values.technologies
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      let cleanUrl = values.url?.trim() || undefined;
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const newItem: CandidateProjectItem = {
        title: values.title.trim(),
        role: values.role?.trim() || undefined,
        technologies: techArray.length > 0 ? techArray : undefined,
        url: cleanUrl,
        description: values.description?.trim() || undefined,
      };

      const nextList = [...projects];
      if (editingIndex !== null) {
        nextList[editingIndex] = newItem;
      } else {
        nextList.push(newItem);
      }

      console.log('[ProjectsSection] Sending payload to API:', { projects: nextList });
      await updateMutation.mutateAsync({ projects: nextList });
      console.log('[ProjectsSection] Save succeeded, updated projects list applied!');
      setIsModalOpen(false);
    } catch (err) {
      console.error('[ProjectsSection] Error during project save:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    try {
      const nextList = projects.filter((_, i) => i !== deleteIndex);
      console.log('[ProjectsSection] Deleting project item, sending:', { projects: nextList });
      await updateMutation.mutateAsync({ projects: nextList });
      setDeleteIndex(null);
    } catch (err) {
      console.error('[ProjectsSection] Error during project delete:', err);
    }
  };

  return (
    <>
      <SectionCard
        title="Projects"
        count={projects.length}
        fromResume={isFromResume}
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label="Add project"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C2410C] hover:bg-[#FFF1E6] border border-[#C2410C]/30 transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add</span>
          </button>
        }
      >
        {projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((proj, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 hover:bg-[#FAF6F1]/60 transition-colors flex items-start justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
                      {proj.title}
                    </h3>
                    {proj.url && (
                      <a
                        href={proj.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#C2410C] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View project</span>
                      </a>
                    )}
                  </div>
                  {proj.role && (
                    <p className="text-xs text-[#5C564E] font-medium mt-0.5">Role: {proj.role}</p>
                  )}
                  {proj.description && (
                    <p className="text-xs text-[#1B1A17]/85 mt-2 whitespace-pre-line leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {proj.technologies.map((t) => (
                        <Chip key={t} label={t} variant="muted" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(index)}
                    aria-label={`Edit project ${proj.title}`}
                    className="p-1 rounded-lg text-[#5C564E] hover:text-[#C2410C] hover:bg-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    aria-label={`Delete project ${proj.title}`}
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
            icon={<FolderGit2 className="w-8 h-8 text-[#5C564E]" />}
            title="No projects added"
            description="Showcase applications, systems, open-source work, or research you've built."
            actionLabel="+ Add project"
            onAction={handleOpenAdd}
          />
        )}
      </SectionCard>

      {/* Projects Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? 'Edit Project' : 'Add Project'}
        subtitle="Highlight project architecture, tech stack, and your direct contributions."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit, (valErrors) =>
          console.error('[ProjectsSection] Form validation rejected:', valErrors),
        )}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="proj-title" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Project Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="proj-title"
              type="text"
              {...register('title')}
              aria-invalid={Boolean(errors.title)}
              placeholder="e.g. Distributed Task Scheduler"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.title && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="proj-role" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Your Role
              </label>
              <input
                id="proj-role"
                type="text"
                {...register('role')}
                placeholder="e.g. Lead Developer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
            </div>

            <div>
              <label htmlFor="proj-url" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Project / Demo Link <span className="text-[#5C564E] font-normal">(Optional)</span>
              </label>
              <input
                id="proj-url"
                type="text"
                {...register('url')}
                placeholder="e.g. github.com/user/project or https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.url && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">
                  {errors.url.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="proj-tech" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Technologies Used (Comma-separated)
            </label>
            <input
              id="proj-tech"
              type="text"
              {...register('technologies')}
              placeholder="e.g. React, Node.js, Redis, Docker"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
          </div>

          <div>
            <label htmlFor="proj-desc" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Description
            </label>
            <textarea
              id="proj-desc"
              rows={4}
              {...register('description')}
              placeholder="Explain the problem, tech stack choices, performance metrics, and outcome..."
              className="w-full p-3.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Project Entry?"
        message="Are you sure you want to remove this project from your profile? This cannot be undone."
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={updateMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
};

export default ProjectsSection;
