// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Privacy & Blocked Companies
// Recruiter visibility toggle and company blocking
// Fetches organisations list ONLY when the modal is opened (lazy fetch)
// ============================================================

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { Chip } from '../../../../components/Chip';
import { CandidateFullProfile } from '../../../../lib/types';
import { candidateApi } from '../../../../lib/api';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Shield, Eye, EyeOff, Building2, Plus, Loader2 } from 'lucide-react';

export interface PrivacySectionProps {
  profile: CandidateFullProfile;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(Boolean(profile.visibleToRecruiters));
  const [blocked, setBlocked] = useState<string[]>(profile.blockedOrganisations || []);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  // Lazy fetch organisations ONLY when modal is opened
  const { data: orgList = [], isLoading: isLoadingOrgs } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['candidate', 'organisations'],
    queryFn: async () => {
      const res = await candidateApi.get<{ id: string; name: string }[]>('/candidate/profile/organisations');
      return Array.isArray(res) ? res : [];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const handleOpen = () => {
    setVisible(Boolean(profile.visibleToRecruiters));
    setBlocked(profile.blockedOrganisations || []);
    setSelectedOrgId('');
    setIsOpen(true);
  };

  const handleAddBlockedOrg = () => {
    if (!selectedOrgId) return;
    if (!blocked.includes(selectedOrgId)) {
      setBlocked([...blocked, selectedOrgId]);
    }
    setSelectedOrgId('');
  };

  const handleRemoveBlockedOrg = (orgId: string) => {
    setBlocked(blocked.filter((id) => id !== orgId));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      visibleToRecruiters: visible,
      blockedOrganisations: blocked,
    });
    setIsOpen(false);
  };

  const orgMap = new Map<string, string>();
  for (const org of orgList) {
    orgMap.set(org.id, org.name);
  }

  const isDirty =
    visible !== Boolean(profile.visibleToRecruiters) ||
    JSON.stringify(blocked.sort()) !== JSON.stringify((profile.blockedOrganisations || []).sort());

  return (
    <>
      <SectionCard
        title="Privacy & Recruiter Visibility"
        onEdit={handleOpen}
        editAriaLabel="Edit privacy and recruiter visibility settings"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                profile.visibleToRecruiters
                  ? 'bg-[#F0FDF4] text-[#16A34A]'
                  : 'bg-[#FEF2F2] text-[#DC2626]'
              }`}
            >
              {profile.visibleToRecruiters ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1B1A17]">
                {profile.visibleToRecruiters
                  ? 'Profile is visible to verified recruiters'
                  : 'Profile is private from search (applied jobs only)'}
              </p>
              <p className="text-[11px] text-[#5C564E]">
                {profile.visibleToRecruiters
                  ? 'Recruiters can discover your profile when sourcing for matching roles.'
                  : 'Only recruiters of jobs you explicitly apply to can view your profile.'}
              </p>
            </div>
          </div>

          {profile.blockedOrganisations && profile.blockedOrganisations.length > 0 && (
            <div className="pt-2 border-t border-[#E8DFD4]/60">
              <span className="text-xs font-semibold text-[#1B1A17] block mb-1.5">
                Blocked Organizations ({profile.blockedOrganisations.length})
              </span>
              <p className="text-[11px] text-[#5C564E] mb-2">
                Recruiters belonging to these companies cannot search or view your profile.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.blockedOrganisations.map((orgId) => (
                  <Chip
                    key={orgId}
                    label={orgMap.get(orgId) || `Org ${orgId.slice(0, 8)}...`}
                    variant="muted"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Privacy Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Privacy Settings"
        subtitle="Control who can discover your candidate profile on the Clyptus network."
        isDirty={isDirty}
        isSubmitting={updateMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Visibility Toggle */}
          <label className="flex items-start justify-between p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/50 cursor-pointer hover:bg-[#FAF6F1] transition-colors">
            <div className="pr-4">
              <span className="text-xs font-semibold text-[#1B1A17] block">
                Allow verified recruiters to find my profile
              </span>
              <span className="text-[11px] text-[#5C564E] block mt-1 leading-relaxed">
                When enabled, companies hiring for your skills can reach out with interview invites.
                Your contact details remain protected until you accept.
              </span>
            </div>
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              aria-label="Allow verified recruiters to find my profile"
              className="w-5 h-5 mt-0.5 rounded border-[#E8DFD4] text-[#C2410C] focus:ring-[#C2410C] accent-[#C2410C] cursor-pointer shrink-0"
            />
          </label>

          {/* Blocked Companies Picker */}
          <div>
            <div className="mb-2">
              <span className="text-xs font-semibold text-[#1B1A17] block">
                Block Specific Employers
              </span>
              <span className="text-[11px] text-[#5C564E] block mt-0.5">
                Prevent your current employer or competitors from discovering your profile.
              </span>
            </div>

            {isLoadingOrgs ? (
              <div className="flex items-center gap-2 p-3 text-xs text-[#5C564E]">
                <Loader2 className="w-4 h-4 animate-spin text-[#C2410C]" />
                <span>Loading registered organisations...</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
                >
                  <option value="">Select an organisation to block...</option>
                  {orgList
                    .filter((org) => !blocked.includes(org.id))
                    .map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddBlockedOrg}
                  disabled={!selectedOrgId}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF6F1] hover:bg-[#F2E9E0] text-[#1B1A17] font-semibold text-xs border border-[#E8DFD4] shrink-0 disabled:opacity-50"
                >
                  Block
                </button>
              </div>
            )}

            {blocked.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30">
                {blocked.map((orgId) => (
                  <Chip
                    key={orgId}
                    label={orgMap.get(orgId) || `Org ${orgId.slice(0, 8)}...`}
                    onRemove={() => handleRemoveBlockedOrg(orgId)}
                    removeAriaLabel={`Unblock ${orgMap.get(orgId) || orgId}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
export default PrivacySection;
