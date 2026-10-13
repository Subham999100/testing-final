// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Skills
// Chips with taxonomy autocomplete, min 3, max 30, case-insensitive dedupe
// Accessible remove buttons (aria-label="Remove <name>")
// ============================================================

import React, { useState } from 'react';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { Chip } from '../../../../components/Chip';
import { EmptyState } from '../../../../components/EmptyState';
import { SKILLS_TAXONOMY } from '../../../../lib/constants';
import { CandidateFullProfile } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Sparkles, Plus, AlertCircle } from 'lucide-react';

export interface SkillsSectionProps {
  profile: CandidateFullProfile;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isOpen, setIsOpen] = useState(false);
  const [skillsList, setSkillsList] = useState<string[]>(profile.skills || []);
  const [inputVal, setInputVal] = useState('');
  const [focused, setFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentSkills = profile.skills || [];
  const isFromResume = Boolean(profile.fromResumeSections?.includes('skills'));

  const handleOpen = () => {
    setSkillsList([...currentSkills]);
    setInputVal('');
    setErrorMessage('');
    setIsOpen(true);
  };

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;

    if (skillsList.length >= 30) {
      setErrorMessage('You can add a maximum of 30 skills.');
      return;
    }

    // Case-insensitive dedupe
    const exists = skillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setErrorMessage(`"${trimmed}" is already in your skills list.`);
      return;
    }

    setSkillsList([...skillsList, trimmed]);
    setInputVal('');
    setErrorMessage('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (skillsList.length < 3) {
      setErrorMessage('Please add at least 3 skills to showcase your expertise.');
      return;
    }
    await updateMutation.mutateAsync({ skills: skillsList });
    setIsOpen(false);
  };

  const filteredTaxonomy = SKILLS_TAXONOMY.filter(
    (taxSkill) =>
      taxSkill.toLowerCase().includes(inputVal.toLowerCase()) &&
      !skillsList.some((s) => s.toLowerCase() === taxSkill.toLowerCase()),
  ).slice(0, 8);

  const isDirty =
    JSON.stringify(skillsList.map((s) => s.toLowerCase()).sort()) !==
    JSON.stringify(currentSkills.map((s) => s.toLowerCase()).sort());

  return (
    <>
      <SectionCard
        title="Skills"
        count={currentSkills.length}
        fromResume={isFromResume}
        onEdit={handleOpen}
        editAriaLabel="Edit skills"
      >
        {currentSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentSkills.map((skill) => (
              <Chip key={skill} label={skill} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-[#5C564E]" />}
            title="No skills added"
            description="Add at least 3 relevant skills to match with recruiter searches and job criteria."
            actionLabel="+ Add skills"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      {/* Skills Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Skills"
        subtitle="Add 3 to 30 core skills, tools, and technical proficiencies."
        isDirty={isDirty}
        isSubmitting={updateMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="skill-input" className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
              Add a Skill (Autocomplete or custom)
            </label>
            <div className="flex gap-2">
              <input
                id="skill-input"
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setErrorMessage('');
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(inputVal);
                  }
                }}
                placeholder="e.g. React, Python, PostgreSQL, AWS..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(inputVal)}
                className="px-4 py-2.5 rounded-xl bg-[#FAF6F1] hover:bg-[#F2E9E0] text-[#1B1A17] font-semibold text-xs border border-[#E8DFD4] shrink-0"
              >
                Add
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {focused && inputVal.trim() && filteredTaxonomy.length > 0 && (
              <ul
                className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-[#E8DFD4] rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto text-xs"
                role="listbox"
              >
                {filteredTaxonomy.map((item) => (
                  <li
                    key={item}
                    role="option"
                    aria-selected="false"
                    onMouseDown={() => handleAddSkill(item)}
                    className="px-3.5 py-2 hover:bg-[#FAF6F1] hover:text-[#C2410C] cursor-pointer transition-colors"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current chips in modal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1B1A17]">
                Selected Skills ({skillsList.length}/30)
              </span>
              <span className="text-[11px] text-[#5C564E]">Minimum 3 required</span>
            </div>

            {skillsList.length > 0 ? (
              <div className="p-3.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {skillsList.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onRemove={() => handleRemoveSkill(skill)}
                    removeAriaLabel={`Remove ${skill}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#5C564E] italic">No skills selected yet.</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
export default SkillsSection;
