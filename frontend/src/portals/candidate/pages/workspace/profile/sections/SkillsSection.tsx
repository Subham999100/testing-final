// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Section: Skills
// Structured skills with proficiency level (Beginner/Intermediate/Advanced/Expert),
// years of experience, deduplication on render (case-insensitive + trim),
// taxonomy autocomplete, min 3, max 30.
// ============================================================

import React, { useState, useMemo } from 'react';
import { SectionCard } from '../../../../components/SectionCard';
import { Modal } from '../../../../components/Modal';
import { EmptyState } from '../../../../components/EmptyState';
import { SKILLS_TAXONOMY, SKILL_PROFICIENCY_LEVELS } from '../../../../lib/constants';
import { CandidateFullProfile, StructuredSkillItem, SkillProficiency } from '../../../../lib/types';
import { useProfileSectionUpdate } from '../hooks/useProfileSectionUpdate';
import { Sparkles, Plus, AlertCircle, X, Award, Clock } from 'lucide-react';

export interface SkillsSectionProps {
  profile: CandidateFullProfile;
}

function normalizeSkill(raw: string | StructuredSkillItem): StructuredSkillItem {
  if (typeof raw === 'string') {
    return { name: raw.trim(), level: 'Intermediate', years: undefined };
  }
  return {
    name: raw?.name ? raw.name.trim() : '',
    level: raw?.level || 'Intermediate',
    years: raw?.years,
  };
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ profile }) => {
  const updateMutation = useProfileSectionUpdate();
  const [isOpen, setIsOpen] = useState(false);

  // Normalization and deduplication on render (trim + case-insensitive)
  const deduplicatedSkills = useMemo(() => {
    const map = new Map<string, StructuredSkillItem>();
    const rawList = Array.isArray(profile.skills) ? profile.skills : [];
    for (const raw of rawList) {
      const item = normalizeSkill(raw);
      if (item.name) {
        const key = item.name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, item);
        }
      }
    }
    return Array.from(map.values());
  }, [profile.skills]);

  // Modal editing state
  const [skillsList, setSkillsList] = useState<StructuredSkillItem[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<SkillProficiency>('Intermediate');
  const [selectedYears, setSelectedYears] = useState<string>('3');
  const [focused, setFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFromResume = Boolean(profile.fromResumeSections?.includes('skills'));

  const handleOpen = () => {
    setSkillsList([...deduplicatedSkills]);
    setInputVal('');
    setSelectedLevel('Intermediate');
    setSelectedYears('3');
    setErrorMessage('');
    setIsOpen(true);
  };

  const handleAddSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;

    if (skillsList.length >= 30) {
      setErrorMessage('You can add a maximum of 30 skills.');
      return;
    }

    // Case-insensitive dedupe
    const exists = skillsList.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setErrorMessage(`"${trimmed}" is already in your skills list.`);
      return;
    }

    const yearsNum = selectedYears ? parseInt(selectedYears, 10) : undefined;
    const newSkill: StructuredSkillItem = {
      name: trimmed,
      level: selectedLevel,
      years: !isNaN(yearsNum as number) && (yearsNum as number) > 0 ? yearsNum : undefined,
    };

    setSkillsList([...skillsList, newSkill]);
    setInputVal('');
    setErrorMessage('');
  };

  const handleRemoveSkill = (skillNameToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s.name.toLowerCase() !== skillNameToRemove.toLowerCase()));
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
      !skillsList.some((s) => s.name.toLowerCase() === taxSkill.toLowerCase()),
  ).slice(0, 8);

  const isDirty =
    JSON.stringify(skillsList.map((s) => s.name.toLowerCase()).sort()) !==
    JSON.stringify(deduplicatedSkills.map((s) => s.name.toLowerCase()).sort());

  return (
    <>
      <SectionCard
        title="Skills"
        count={deduplicatedSkills.length}
        fromResume={isFromResume}
        onEdit={handleOpen}
        editAriaLabel="Edit skills"
      >
        {deduplicatedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {deduplicatedSkills.map((skill) => (
              <div
                key={skill.name.toLowerCase()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/50 hover:bg-[#FAF6F1] text-xs transition-colors"
              >
                <span className="font-semibold text-[#1B1A17]">{skill.name}</span>
                {skill.level && (
                  <span className="text-[10px] font-medium text-[#C2410C] bg-[#FFF1E6] px-1.5 py-0.5 rounded-md border border-[#C2410C]/20">
                    {skill.level}
                  </span>
                )}
                {skill.years && (
                  <span className="text-[10px] text-[#5C564E] font-medium flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-[#5C564E]" />
                    <span>{skill.years}y</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-[#5C564E]" />}
            title="No skills added"
            description="Add at least 3 relevant skills with your proficiency level and years of experience."
            actionLabel="+ Add skills"
            onAction={handleOpen}
          />
        )}
      </SectionCard>

      {/* Skills Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Skills & Proficiencies"
        subtitle="Add 3 to 30 core skills, tools, and tech stacks with your proficiency level."
        isDirty={isDirty}
        isSubmitting={updateMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Skill Entry Form Row */}
          <div className="p-3.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/40 space-y-3">
            <div className="relative">
              <label htmlFor="skill-input" className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
                Skill Name (Autocomplete or custom)
              </label>
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
                placeholder="e.g. React, TypeScript, Python, PostgreSQL, AWS..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD4] bg-white text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
              />

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

            {/* Proficiency Level + Years + Add Button */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              <div>
                <label className="block text-xs font-medium text-[#5C564E] mb-1">
                  Proficiency Level
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as SkillProficiency)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD4] bg-white text-xs font-semibold text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
                >
                  {SKILL_PROFICIENCY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C564E] mb-1">
                  Years of Experience
                </label>
                <select
                  value={selectedYears}
                  onChange={(e) => setSelectedYears(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD4] bg-white text-xs font-semibold text-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20"
                >
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5+ years</option>
                  <option value="8">8+ years</option>
                  <option value="10">10+ years</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleAddSkill(inputVal)}
                className="w-full px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Skill</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current selected skills list in modal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1B1A17]">
                Selected Skills ({skillsList.length}/30)
              </span>
              <span className="text-[11px] text-[#5C564E]">Minimum 3 required</span>
            </div>

            {skillsList.length > 0 ? (
              <div className="p-3.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                {skillsList.map((skill) => (
                  <span
                    key={skill.name.toLowerCase()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD4] bg-white text-xs text-[#1B1A17] shadow-xs group"
                  >
                    <span className="font-semibold">{skill.name}</span>
                    <span className="text-[10px] font-semibold text-[#C2410C] bg-[#FFF1E6] px-1.5 py-0.5 rounded-md">
                      {skill.level}
                    </span>
                    {skill.years && (
                      <span className="text-[10px] text-[#5C564E] font-medium">
                        {skill.years}y
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.name)}
                      aria-label={`Remove ${skill.name}`}
                      className="ml-1 text-[#5C564E] hover:text-[#DC2626] p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
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
