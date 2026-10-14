// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: ShareProfileModal
// Tokenized public profile link (OFF by default), copy & revoke,
// and preview of what is visible to employers
// ============================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { CandidateFullProfile } from '../../../lib/types';
import { candidateApi } from '../../../lib/api';
import { toast } from '@/portals/org/ui/toast';
import {
  Share2,
  Copy,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateFullProfile;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchConfig = async () => {
      try {
        const config = await candidateApi.getShareProfileConfig();
        setIsEnabled(config.enabled);
        setToken(config.token);
      } catch {
        // Fallback
        setToken('preview-' + Math.random().toString(36).substring(2, 8));
      }
    };
    void fetchConfig();
  }, [isOpen]);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/candidate/p/${token}`
    : `https://clyptus.com/candidate/p/${token}`;

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const res = await candidateApi.toggleShareProfile(checked);
      setIsEnabled(res.enabled);
      setToken(res.token);
      toast.success(checked ? 'Public profile link is now active.' : 'Public profile link is now disabled.');
    } catch {
      toast.error('Failed to update public share settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    setIsLoading(true);
    try {
      const res = await candidateApi.regenerateShareProfileToken();
      setToken(res.token);
      setIsEnabled(res.enabled);
      toast.success('Generated a new link. Previous links are now invalid.');
    } catch {
      toast.error('Failed to regenerate public profile link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Public profile link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link automatically.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Public Profile"
      subtitle="Generate a shareable, privacy-safe public link to send to recruiters and hiring teams."
      maxWidth="lg"
      onSubmit={(e) => {
        e.preventDefault();
        onClose();
      }}
      saveLabel="Done"
    >
      <div className="space-y-5">
        {/* Enable / Disable Switch Card */}
        <div className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                isEnabled ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FAF6F1] text-[#5C564E]'
              }`}
            >
              {isEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1B1A17]">
                {isEnabled ? 'Public link is Active' : 'Public link is Disabled'}
              </p>
              <p className="text-[11px] text-[#5C564E] mt-0.5">
                {isEnabled
                  ? 'Anyone with the link can view your candidate profile.'
                  : 'Turn ON to allow anyone with the link to preview your profile.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={isLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#E8DFD4] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D7C9BA] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C2410C]" />
          </label>
        </div>

        {/* Link Input & Actions (Shown when enabled) */}
        {isEnabled ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#1B1A17]">
              Your Personal Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 text-xs font-mono text-[#1B1A17] select-all focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isLoading}
                className="text-[#5C564E] hover:text-[#DC2626] font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Revoke & generate new link</span>
              </button>

              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#C2410C] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Open public preview</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-[#E8DFD4] text-center text-xs text-[#5C564E]">
            <Lock className="w-5 h-5 text-[#5C564E] mx-auto mb-1.5" />
            <p>Your profile is currently private. Enable the toggle above to create an active public link.</p>
          </div>
        )}

        {/* Privacy Matrix Preview */}
        <div className="rounded-xl border border-[#E8DFD4] p-4 bg-white space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1B1A17] font-serif">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Privacy Protection on Public View</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#F0FDF4]/60 border border-[#16A34A]/20">
              <span className="font-semibold text-[#16A34A] block mb-1">Visible to Public:</span>
              <ul className="text-[#5C564E] space-y-0.5 text-[11px] list-disc list-inside">
                <li>Full Name & Headline</li>
                <li>City / Location</li>
                <li>Work Experience & Education</li>
                <li>Skills, Projects & Certifications</li>
                <li>Languages & Social Links</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FEF2F2]/60 border border-[#DC2626]/20">
              <span className="font-semibold text-[#DC2626] block mb-1">Always Kept Hidden:</span>
              <ul className="text-[#5C564E] space-y-0.5 text-[11px] list-disc list-inside">
                <li>Personal Phone & Email Address</li>
                <li>Current & Expected Salary figures</li>
                <li>Blocked Organisations list</li>
                <li>Direct raw resume file downloads</li>
                <li>Recruiter application statuses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
