// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Certifications
// Card view + structured certification add/edit modal + delete confirmation
// Optional credential links with lenient URL parsing
// ============================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { CandidateCertificationItem, CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Award, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

const certItemSchema = z.object({
  name: z.string().min(2, 'Certification name is required (at least 2 characters)'),
  issuingOrg: z.string().min(2, 'Issuing organization is required'),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z
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
      { message: 'Please enter a valid credential URL (e.g. credly.com/... or https://...)' },
    ),
});

type CertFormValues = z.infer<typeof certItemSchema>;

export interface CertificationsSectionProps {
  profile: CandidateFullProfile;
}

export const CertificationsSection: React.FC<CertificationsSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Normalize and strictly filter out invalid/empty items from resume data or empty defaults
  const rawCerts = Array.isArray(profile?.certifications) ? profile.certifications : [];
  const certs: CandidateCertificationItem[] = rawCerts
    .filter((item): item is CandidateCertificationItem =>
      Boolean(
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as any).name === 'string' &&
        (item as any).name.trim().length > 0,
      ),
    )
    .map((item) => ({
      name: (item as any).name.trim(),
      issuingOrg: (item as any).issuingOrg?.trim() || (item as any).issuer?.trim() || 'Organization',
      issueDate: (item as any).issueDate?.trim() || (item as any).year?.toString().trim() || undefined,
      expiryDate: (item as any).expiryDate?.trim() || undefined,
      credentialId: (item as any).credentialId?.trim() || undefined,
      credentialUrl: (item as any).credentialUrl?.trim() || (item as any).url?.trim() || undefined,
    }));

  const isFromResume = Boolean(profile.fromResumeSections?.includes('certifications'));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CertFormValues>({
    resolver: zodResolver(certItemSchema),
    defaultValues: {
      name: '',
      issuingOrg: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      credentialUrl: '',
    },
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      name: '',
      issuingOrg: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      credentialUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = certs[index];
    if (!item) return;

    setEditingIndex(index);
    reset({
      name: item.name,
      issuingOrg: item.issuingOrg || item.issuer || '',
      issueDate: item.issueDate || (item as any).year || '',
      expiryDate: item.expiryDate || '',
      credentialId: item.credentialId || '',
      credentialUrl: item.credentialUrl || item.url || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: CertFormValues) => {
    console.log('[CertificationsSection] Save clicked with form values:', values);
    try {
      let cleanUrl = values.credentialUrl?.trim() || undefined;
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const newItem: CandidateCertificationItem = {
        name: values.name.trim(),
        issuingOrg: values.issuingOrg.trim(),
        issueDate: values.issueDate?.trim() || undefined,
        expiryDate: values.expiryDate?.trim() || undefined,
        credentialId: values.credentialId?.trim() || undefined,
        credentialUrl: cleanUrl,
      };

      const nextList = [...certs];
      if (editingIndex !== null) {
        nextList[editingIndex] = newItem;
      } else {
        nextList.push(newItem);
      }

      console.log('[CertificationsSection] Sending payload to API:', { certifications: nextList });
      await updateMutation.mutateAsync({ certifications: nextList });
      console.log('[CertificationsSection] Save succeeded, updated certs list applied!');
      setIsModalOpen(false);
    } catch (err) {
      console.error('[CertificationsSection] Error during certification save:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    try {
      const nextList = certs.filter((_, i) => i !== deleteIndex);
      console.log('[CertificationsSection] Deleting certification item, sending:', { certifications: nextList });
      await updateMutation.mutateAsync({ certifications: nextList });
      setDeleteIndex(null);
    } catch (err) {
      console.error('[CertificationsSection] Error during certification delete:', err);
    }
  };

  return (
    <>
      <SectionCard
        title="Certifications"
        count={certs.length}
        fromResume={isFromResume}
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label="Add certification"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C2410C] hover:bg-[#FFF1E6] border border-[#C2410C]/30 transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add</span>
          </button>
        }
      >
        {certs.length > 0 ? (
          <div className="space-y-4">
            {certs.map((cert, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 hover:bg-[#FAF6F1]/60 transition-colors flex items-start justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
                      {cert.name}
                    </h3>
                    {(cert.credentialUrl || cert.url) && (
                      <a
                        href={cert.credentialUrl || cert.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#C2410C] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View credential</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[#5C564E] font-medium mt-0.5">
                    {cert.issuingOrg || cert.issuer || 'Issuing Organization'}
                    {cert.issueDate && ` • Issued ${cert.issueDate}`}
                    {cert.expiryDate && ` • Expires ${cert.expiryDate}`}
                  </p>
                  {cert.credentialId && (
                    <p className="text-xs text-[#5C564E] mt-1 font-mono">
                      ID: {cert.credentialId}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(index)}
                    aria-label={`Edit certification ${cert.name}`}
                    className="p-1 rounded-lg text-[#5C564E] hover:text-[#C2410C] hover:bg-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    aria-label={`Delete certification ${cert.name}`}
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
            icon={<Award className="w-8 h-8 text-[#5C564E]" />}
            title="No certifications added"
            description="Add professional licenses, cloud credentials, or specializations you've earned."
            actionLabel="+ Add certification"
            onAction={handleOpenAdd}
          />
        )}
      </SectionCard>

      {/* Certifications Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? 'Edit Certification' : 'Add Certification'}
        subtitle="Verify your credentials and licenses with issuing authority details."
        isDirty={isDirty}
        isSubmitting={isSubmitting || updateMutation.isPending}
        onSubmit={handleSubmit(onSubmit, (valErrors) =>
          console.error('[CertificationsSection] Form validation rejected:', valErrors),
        )}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="cert-name" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Certification Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="cert-name"
              type="text"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              placeholder="e.g. AWS Certified Solutions Architect - Associate"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.name && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cert-org" className="block text-xs font-semibold text-[#1B1A17] mb-1">
              Issuing Organization <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="cert-org"
              type="text"
              {...register('issuingOrg')}
              aria-invalid={Boolean(errors.issuingOrg)}
              placeholder="e.g. Amazon Web Services, Google Cloud, Coursera"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
            />
            {errors.issuingOrg && (
              <p className="text-xs text-[#DC2626] mt-1" role="alert">
                {errors.issuingOrg.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cert-issue" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Issue Date
              </label>
              <input
                id="cert-issue"
                type="text"
                {...register('issueDate')}
                placeholder="e.g. Jun 2024"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
            </div>

            <div>
              <label htmlFor="cert-expiry" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Expiry Date (Optional)
              </label>
              <input
                id="cert-expiry"
                type="text"
                {...register('expiryDate')}
                placeholder="e.g. Jun 2027 or No Expiration"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cert-id" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Credential ID
              </label>
              <input
                id="cert-id"
                type="text"
                {...register('credentialId')}
                placeholder="e.g. AWS-ASA-12345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
            </div>

            <div>
              <label htmlFor="cert-url" className="block text-xs font-semibold text-[#1B1A17] mb-1">
                Credential Link <span className="text-[#5C564E] font-normal">(Optional)</span>
              </label>
              <input
                id="cert-url"
                type="text"
                {...register('credentialUrl')}
                placeholder="e.g. credly.com/... or https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              {errors.credentialUrl && (
                <p className="text-xs text-[#DC2626] mt-1" role="alert">
                  {errors.credentialUrl.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Certification Entry?"
        message="Are you sure you want to remove this certification from your profile? This cannot be undone."
        confirmLabel="Delete Certification"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={updateMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
};

export default CertificationsSection;
