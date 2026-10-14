// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: ResumeReplaceModal
// In-page accessible modal to upload / replace resume without navigating away
// ============================================================

import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/Modal';
import { candidateApi } from '../../../lib/api';
import { candidateQueryKeys } from '../../../lib/queryKeys';
import { toast } from '@/portals/org/ui/toast';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface ResumeReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeReplaceModal: React.FC<ResumeReplaceModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!allowedTypes.includes(selected.type) && !/\.(pdf|docx|doc)$/i.test(selected.name)) {
      setErrorMsg('Please upload a PDF or Word document (.pdf, .docx, .doc).');
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setErrorMsg('Resume file size must not exceed 5 MB.');
      return;
    }

    setErrorMsg('');
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      await candidateApi.upload('/candidate/profile/resume', formData);
      toast.success('Resume uploaded and parsed successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: candidateQueryKeys.resume }),
        queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile }),
        queryClient.invalidateQueries({ queryKey: candidateQueryKeys.me }),
      ]);
      onClose();

    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload / Replace Resume"
      subtitle="Upload your latest CV or resume (PDF, DOCX up to 5 MB)."
      isDirty={Boolean(file)}
      isSubmitting={isUploading}
      onSubmit={(e) => {
        e.preventDefault();
        void handleUpload();
      }}
      saveLabel="Upload & Parse"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[#E8DFD4] hover:border-[#C2410C] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#FAF6F1]/40 hover:bg-[#FAF6F1] transition-all"
        >
          <UploadCloud className="w-10 h-10 text-[#C2410C] mb-3" />
          <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
            {file ? file.name : 'Click to select or drag and drop your resume'}
          </h3>
          <p className="text-xs text-[#5C564E] mt-1">
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
              : 'Supported formats: PDF, DOCX, DOC (max 5 MB)'}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload resume file"
        />

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
export default ResumeReplaceModal;
