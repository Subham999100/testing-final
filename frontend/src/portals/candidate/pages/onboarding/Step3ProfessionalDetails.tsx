// ============================================================
// Clyptus Job Portal - Candidate Portal
// Step 3: Professional Details Form
// Headline auto-suggestions, skills chips min 3 max 30, Fresher vs Experienced conditional fields,
// Preferred locations, work modes, and Indian salary verbalizer
// ============================================================

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  SKILLS_TAXONOMY,
  INDIAN_CITIES,
  NOTICE_PERIODS,
  JOB_TYPES,
  WORK_MODES,
  inrToWords,
} from '../../lib/constants';
import { Button, Input, Field } from '@/portals/org/ui/ui';
import {
  Sparkles,
  X,
  Plus,
  IndianRupee,
  Briefcase,
  Building2,
  Clock,
  MapPin,
  Check,
  AlertCircle,
} from 'lucide-react';

export interface Step3FormData {
  headline: string;
  skills: string[];
  currentJobTitle?: string;
  currentCompany?: string;
  experienceYears?: number;
  experienceMonths?: number;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: string;
  projects?: Array<{ title: string; description?: string }>;
  preferredLocations: string[];
  preferredJobTypes: string[];
  preferredWorkModes: string[];
  gender?: string;
}

interface Step3ProfessionalDetailsProps {
  initialData: Partial<Step3FormData>;
  isFresher: boolean;
  userFullName?: string;
  userDegree?: string;
  onSave: (data: Step3FormData) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export const Step3ProfessionalDetails: React.FC<Step3ProfessionalDetailsProps> = ({
  initialData,
  isFresher,
  userFullName,
  userDegree,
  onSave,
  onBack,
  isLoading,
}) => {
  const [skillInput, setSkillInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step3FormData>({
    defaultValues: {
      headline: initialData.headline || '',
      skills: initialData.skills || [],
      currentJobTitle: initialData.currentJobTitle || '',
      currentCompany: initialData.currentCompany || '',
      experienceYears: initialData.experienceYears != null ? initialData.experienceYears : (isFresher ? 0 : 2),
      experienceMonths: initialData.experienceMonths || 0,
      currentSalary: initialData.currentSalary || undefined,
      expectedSalary: initialData.expectedSalary || (isFresher ? 600000 : 1200000),
      noticePeriod: initialData.noticePeriod || NOTICE_PERIODS[2],
      projects: initialData.projects || [{ title: '', description: '' }],
      preferredLocations: initialData.preferredLocations || ['Bengaluru', 'Hyderabad'],
      preferredJobTypes: initialData.preferredJobTypes || ['Full-time'],
      preferredWorkModes: initialData.preferredWorkModes || ['Hybrid', 'Remote'],
      gender: initialData.gender || '',
    },
  });

  const selectedSkills = watch('skills') || [];
  const selectedLocations = watch('preferredLocations') || [];
  const selectedJobTypes = watch('preferredJobTypes') || [];
  const selectedWorkModes = watch('preferredWorkModes') || [];
  const expectedSalaryValue = watch('expectedSalary');
  const currentSalaryValue = watch('currentSalary');
  const currentHeadline = watch('headline');

  // Auto-generate 3 dynamic headline suggestions based on skills & qualification
  const headlineSuggestions = useMemo(() => {
    const topSkills = selectedSkills.slice(0, 3).join(', ') || 'Software Engineering';
    const degreePart = userDegree ? userDegree.split('(')[0].trim() : 'Engineering';

    if (isFresher) {
      return [
        `Aspiring Software Engineer | ${degreePart} Graduate | ${topSkills}`,
        `Fresher Software Developer skilled in ${topSkills}`,
        `Motivated Entry-Level Engineer | Specialized in ${topSkills}`,
      ];
    } else {
      const title = watch('currentJobTitle') || 'Full Stack Engineer';
      const exp = watch('experienceYears') || 2;
      return [
        `${title} with ${exp}+ Years Experience in ${topSkills}`,
        `Senior ${title} | Microservices, Scalable Systems & ${topSkills}`,
        `Results-driven ${title} specializing in ${topSkills}`,
      ];
    }
  }, [isFresher, selectedSkills, userDegree, watch('currentJobTitle'), watch('experienceYears')]);

  // Skill chip handlers
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    const exists = selectedSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (!exists && selectedSkills.length < 30) {
      const updated = [...selectedSkills, trimmed];
      setValue('skills', updated, { shouldValidate: true });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updated = selectedSkills.filter((s) => s !== skillToRemove);
    setValue('skills', updated, { shouldValidate: true });
  };

  // Location chip handlers
  const handleAddLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    const exists = selectedLocations.some((l) => l.toLowerCase() === trimmed.toLowerCase());
    if (!exists && selectedLocations.length < 10) {
      const updated = [...selectedLocations, trimmed];
      setValue('preferredLocations', updated, { shouldValidate: true });
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (locToRemove: string) => {
    const updated = selectedLocations.filter((l) => l !== locToRemove);
    setValue('preferredLocations', updated, { shouldValidate: true });
  };

  const onSubmit = async (data: Step3FormData) => {
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold font-serif text-slate-900">Professional Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Highlight your expertise and career preferences to match top hiring managers.
        </p>
      </div>

      {/* Resume Headline */}
      <div className="space-y-2">
        <Field
          label="Resume Headline *"
          error={errors.headline?.message}
        >
          <Input
            {...register('headline', {
              required: 'Resume headline is required',
              minLength: { value: 10, message: 'Headline must be at least 10 characters' },
              maxLength: { value: 120, message: 'Headline must be under 120 characters' },
            })}
            placeholder="e.g. Senior Full Stack Engineer with 4+ Years Experience in React & Node.js"
          />
        </Field>

        {/* 2-3 Auto-generated suggestions as selectable cards */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>AI Suggested Headlines (Click to apply):</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {headlineSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setValue('headline', suggestion, { shouldValidate: true })}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                  currentHeadline === suggestion
                    ? 'border-orange-500 bg-orange-50/70 font-semibold text-orange-950 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <span>{suggestion}</span>
                {currentHeadline === suggestion && (
                  <Check className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Skills Chip Input (min 3, max 30) */}
      <div className="space-y-2">
        <Field
          label="Key Skills (Min 3, Max 30) *"
          error={errors.skills?.message}
        >
          <div className="relative">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e: any) => setSkillInput(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(skillInput);
                  }
                }}
                placeholder="Type skill (e.g. React, TypeScript, Docker) and press Enter"
                list="skills-taxonomy-datalist"
              />
              <datalist id="skills-taxonomy-datalist">
                {SKILLS_TAXONOMY.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <Button
                type="button"
                variant="secondary"
                onClick={() => handleAddSkill(skillInput)}
                className="px-4 py-2 border-slate-300 text-slate-700 font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Hidden field for form validation rule */}
            <input
              type="hidden"
              {...register('skills', {
                validate: (skills) =>
                  (skills && skills.length >= 3) || 'Please add at least 3 key skills',
              })}
            />
          </div>

          {/* Selected Skills Chips */}
          <div className="flex flex-wrap gap-2 mt-3 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-xl">
            {selectedSkills.length > 0 ? (
              selectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs group"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic self-center">
                No skills added yet. Add at least 3 skills to proceed.
              </span>
            )}
          </div>

          {/* Quick-add popular skills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Quick Add:</span>
            {['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Python', 'AWS']
              .filter((s) => !selectedSkills.includes(s))
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddSkill(s)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-600 transition-colors"
                >
                  + {s}
                </button>
              ))}
          </div>
        </Field>
      </div>

      {/* Conditional Fields: Experienced vs Fresher */}
      {!isFresher ? (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Briefcase className="w-4 h-4 text-orange-600" />
            Current / Last Employment
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Field
                label="Job Title *"
                error={errors.currentJobTitle?.message}
              >
                <Input
                  {...register('currentJobTitle', {
                    required: !isFresher ? 'Job title is required for experienced candidates' : false,
                  })}
                  placeholder="e.g. Full Stack Developer"
                />
              </Field>
            </div>

            <div>
              <Field
                label="Company Name *"
                error={errors.currentCompany?.message}
              >
                <div className="relative">
                  <Input
                    {...register('currentCompany', {
                      required: !isFresher ? 'Company name is required for experienced candidates' : false,
                    })}
                    placeholder="e.g. Infosys, Swiggy, TCS"
                    className="pl-9"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </Field>
            </div>

            {/* Total Experience (Years + Months) */}
            <div>
              <Field label="Total Experience *">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    {...register('experienceYears', { valueAsNumber: true })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-orange-500"
                  >
                    {[...Array(25)].map((_, i) => (
                      <option key={i} value={i}>
                        {i} {i === 1 ? 'Year' : 'Years'}
                      </option>
                    ))}
                  </select>

                  <select
                    {...register('experienceMonths', { valueAsNumber: true })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-orange-500"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i}>
                        {i} {i === 1 ? 'Month' : 'Months'}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            {/* Notice Period */}
            <div>
              <Field label="Notice Period *">
                <select
                  {...register('noticePeriod')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-orange-500"
                >
                  {NOTICE_PERIODS.map((np) => (
                    <option key={np} value={np}>
                      {np}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Current CTC */}
            <div>
              <Field label="Current CTC (Annual INR)">
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={25000}
                    {...register('currentSalary', { valueAsNumber: true })}
                    placeholder="e.g. 800000"
                    className="pl-9"
                  />
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                {currentSalaryValue && currentSalaryValue > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">
                    {inrToWords(currentSalaryValue)}
                  </span>
                )}
              </Field>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Briefcase className="w-4 h-4 text-orange-600" />
            Academic Internship / Major Project (Optional)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Project or Internship Title">
                <Input
                  {...register('projects.0.title')}
                  placeholder="e.g. Distributed Task Queue System / React E-Commerce App"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Key Responsibilities or Summary">
                <Input
                  {...register('projects.0.description')}
                  placeholder="Briefly describe what you designed, technologies used, and outcomes achieved"
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Salary & Job Preferences */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Preferences & Compensation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Expected Salary (Annual INR) with inrToWords Verbalizer */}
          <div className="sm:col-span-2">
            <Field
              label="Expected Salary (Annual INR) *"
              error={errors.expectedSalary?.message}
            >
              <div className="relative">
                <Input
                  type="number"
                  min={100000}
                  step={50000}
                  {...register('expectedSalary', {
                    required: 'Expected salary is required',
                    valueAsNumber: true,
                    min: { value: 50000, message: 'Please enter a valid annual salary' },
                  })}
                  placeholder="e.g. 1200000"
                  className="pl-9 font-semibold text-slate-900"
                />
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>

              {/* Words verbalizer under the input */}
              {expectedSalaryValue && expectedSalaryValue > 0 ? (
                <div className="mt-1.5 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                  <span>{inrToWords(expectedSalaryValue)}</span>
                </div>
              ) : null}
            </Field>
          </div>

          {/* Preferred Work Locations (Chips max 10) */}
          <div className="sm:col-span-2">
            <Field label="Preferred Work Locations (Max 10)">
              <div className="flex gap-2 mb-2">
                <Input
                  value={locationInput}
                  onChange={(e: any) => setLocationInput(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocation(locationInput);
                    }
                  }}
                  placeholder="Add location (e.g. Bengaluru, Hyderabad, Remote)"
                  list="locations-datalist"
                />
                <datalist id="locations-datalist">
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddLocation(locationInput)}
                  className="px-4 py-2 border-slate-300 text-slate-700 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[36px]">
                {selectedLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                  >
                    <MapPin className="w-3 h-3 text-orange-600" />
                    {loc}
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
                      className="text-slate-400 hover:text-red-600 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick-add cities */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Add:</span>
                {['Bengaluru', 'Pune', 'Hyderabad', 'Mumbai', 'Delhi NCR']
                  .filter((c) => !selectedLocations.includes(c))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleAddLocation(c)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-600 transition-colors"
                    >
                      + {c}
                    </button>
                  ))}
              </div>
            </Field>
          </div>

          {/* Preferred Job Type (Chips) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Preferred Job Type
            </label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((jt) => {
                const isSelected = selectedJobTypes.includes(jt);
                return (
                  <button
                    key={jt}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? selectedJobTypes.filter((t) => t !== jt)
                        : [...selectedJobTypes, jt];
                      setValue('preferredJobTypes', next);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {jt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work Mode (Remote / Hybrid / On-site) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Preferred Work Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {WORK_MODES.map((wm) => {
                const isSelected = selectedWorkModes.includes(wm);
                return (
                  <button
                    key={wm}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? selectedWorkModes.filter((m) => m !== wm)
                        : [...selectedWorkModes, wm];
                      setValue('preferredWorkModes', next);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {wm}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg border-slate-300 text-slate-700"
          disabled={isLoading}
        >
          Back
        </Button>

        <Button
          type="submit"
          variant="primary"
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </form>
  );
};
