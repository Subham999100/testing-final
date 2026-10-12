// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ProfilePage (Candidate Profile Viewer & Editor)
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCandidateAuth, useCandidateProfile, useCandidateResume } from '../../lib/session';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import {
  CandidateEducationItem,
  CandidateExperienceItem,
  UpdateCandidateProfileRequest,
  ApiError,
} from '../../lib/types';
import { Button, Input, Field, Textarea, PageSkeleton, Badge } from '@/portals/org/ui/ui';
import { toast } from '@/portals/org/ui/toast';
import {
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, refetchMe } = useCandidateAuth();
  const { data: profile, isLoading, isError, error, refetch } = useCandidateProfile();
  const { data: resumeData } = useCandidateResume();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    headline: '',
    location: '',
    bio: '',
    skills: [] as string[],
    education: [] as CandidateEducationItem[],
    experience: [] as CandidateExperienceItem[],
  });

  const [skillInput, setSkillInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || user?.firstName || '',
        lastName: profile.lastName || user?.lastName || '',
        phone: profile.phone || '',
        headline: profile.headline || '',
        location: profile.location || '',
        bio: profile.bio || '',
        skills: Array.isArray(profile.skills) ? [...profile.skills] : [],
        education: Array.isArray(profile.education) ? [...profile.education] : [],
        experience: Array.isArray(profile.experience) ? [...profile.experience] : [],
      });
    } else if (user) {
      setForm((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      }));
    }
  }, [profile, user]);

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Unable to load candidate profile</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {(error as any)?.message || 'A network error occurred while retrieving your profile details.'}
        </p>
        <Button onClick={() => refetch()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();

    const trimmed = skillInput.trim();
    if (!trimmed) return;

    if (form.skills.length >= 50) {
      toast.error('Maximum 50 skills allowed');
      return;
    }

    if (form.skills.includes(trimmed)) {
      setSkillInput('');
      return;
    }

    handleFieldChange('skills', [...form.skills, trimmed]);
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    handleFieldChange(
      'skills',
      form.skills.filter((s) => s !== skillToRemove),
    );
  };

  // Education Helpers
  const handleAddEducation = () => {
    if (form.education.length >= 20) {
      toast.error('Maximum 20 education records allowed');
      return;
    }
    const newEdu: CandidateEducationItem = {
      degree: '',
      institution: '',
      fieldOfStudy: '',
      startYear: undefined,
      endYear: undefined,
      grade: '',
      description: '',
    };
    handleFieldChange('education', [...form.education, newEdu]);
  };

  const handleUpdateEducation = (index: number, patch: Partial<CandidateEducationItem>) => {
    const updated = form.education.map((item, i) => (i === index ? { ...item, ...patch } : item));
    handleFieldChange('education', updated);
  };

  const handleRemoveEducation = (index: number) => {
    handleFieldChange(
      'education',
      form.education.filter((_, i) => i !== index),
    );
  };

  // Experience Helpers
  const handleAddExperience = () => {
    if (form.experience.length >= 20) {
      toast.error('Maximum 20 experience records allowed');
      return;
    }
    const newExp: CandidateExperienceItem = {
      company: '',
      jobTitle: '',
      employmentType: 'Full-time',
      location: '',
      startDate: '',
      endDate: '',
      currentJob: false,
      description: '',
    };
    handleFieldChange('experience', [...form.experience, newExp]);
  };

  const handleUpdateExperience = (index: number, patch: Partial<CandidateExperienceItem>) => {
    const updated = form.experience.map((item, i) => (i === index ? { ...item, ...patch } : item));
    handleFieldChange('experience', updated);
  };

  const handleRemoveExperience = (index: number) => {
    handleFieldChange(
      'experience',
      form.experience.filter((_, i) => i !== index),
    );
  };

  const parseBackendValidationErrors = (err: any) => {
    const errors: Record<string, string> = {};
    const messages: string[] = [];

    if (Array.isArray(err?.rawMessages)) {
      messages.push(...err.rawMessages);
    } else if (Array.isArray(err?.details)) {
      messages.push(...err.details);
    } else if (typeof err?.message === 'string') {
      // Split comma separated messages if any
      messages.push(...err.message.split(',').map((s: string) => s.trim()));
    }

    for (const msg of messages) {
      const lower = msg.toLowerCase();
      if (lower.includes('first name')) errors.firstName = msg;
      else if (lower.includes('last name')) errors.lastName = msg;
      else if (lower.includes('phone')) errors.phone = msg;
      else if (lower.includes('headline')) errors.headline = msg;
      else if (lower.includes('location')) errors.location = msg;
      else if (lower.includes('bio')) errors.bio = msg;
      else if (lower.includes('skill')) errors.skills = msg;
      else if (lower.includes('education')) errors.education = msg;
      else if (lower.includes('experience')) errors.experience = msg;
      else {
        errors.general = msg;
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setSaveSuccess(false);

    try {
      // Clean education payload
      const cleanedEducation = form.education.map((edu) => ({
        degree: edu.degree?.trim() || undefined,
        institution: edu.institution?.trim() || undefined,
        fieldOfStudy: edu.fieldOfStudy?.trim() || undefined,
        startYear: edu.startYear ? Number(edu.startYear) : undefined,
        endYear: edu.endYear ? Number(edu.endYear) : undefined,
        grade: edu.grade?.trim() || undefined,
        description: edu.description?.trim() || undefined,
      }));

      // Clean experience payload
      const cleanedExperience = form.experience.map((exp) => ({
        company: exp.company?.trim() || undefined,
        jobTitle: exp.jobTitle?.trim() || undefined,
        employmentType: exp.employmentType?.trim() || undefined,
        location: exp.location?.trim() || undefined,
        startDate: exp.startDate?.trim() || undefined,
        endDate: exp.currentJob ? undefined : exp.endDate?.trim() || undefined,
        currentJob: Boolean(exp.currentJob),
        description: exp.description?.trim() || undefined,
      }));

      const payload: UpdateCandidateProfileRequest = {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        headline: form.headline.trim() || undefined,
        location: form.location.trim() || undefined,
        bio: form.bio.trim() || undefined,
        skills: form.skills,
        education: cleanedEducation,
        experience: cleanedExperience,
      };

      await candidateApi.patch('/candidate/profile', payload);

      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.profile });
      await queryClient.invalidateQueries({ queryKey: candidateQueryKeys.me });
      await refetchMe();
      await refetch();

      setSaveSuccess(true);
      toast.success('Candidate profile updated successfully');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const parsedErrors = parseBackendValidationErrors(err);
      setFieldErrors(parsedErrors);
      toast.error(err?.message || 'Failed to update candidate profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain your professional identity, skills, and background visible to recruiters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/candidate/resume"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4 text-orange-600" />
            <span>Manage Resume</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">Profile changes saved and updated in your active candidate record.</span>
          </div>
          <button
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General validation error banner */}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Please resolve the validation errors below before saving:</p>
            <ul className="list-disc list-inside mt-1 text-xs text-red-700 space-y-0.5">
              {Object.entries(fieldErrors).map(([key, msg]) => (
                <li key={key}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Resume Vault Quick Status Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Resume Vault File</h3>
              <Badge tone={resumeData?.hasResume ? 'green' : 'amber'}>
                {resumeData?.hasResume ? 'Active' : 'Missing'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {resumeData?.hasResume
                ? `${resumeData.fileName || 'Attached resume'} is linked to your candidate profile.`
                : 'No resume uploaded. Upload a PDF or DOCX file to enable 1-click applications.'}
            </p>
          </div>
        </div>
        <Link
          to="/candidate/resume"
          className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          {resumeData?.hasResume ? 'View / Replace' : 'Upload Resume'}
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <User className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Field label="First Name (max 60 chars)">
                <Input
                  value={form.firstName}
                  maxLength={60}
                  onChange={(e: any) => handleFieldChange('firstName', e.target.value)}
                  placeholder="First Name"
                />
              </Field>
              {fieldErrors.firstName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <Field label="Last Name (max 60 chars)">
                <Input
                  value={form.lastName}
                  maxLength={60}
                  onChange={(e: any) => handleFieldChange('lastName', e.target.value)}
                  placeholder="Last Name"
                />
              </Field>
              {fieldErrors.lastName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Field label="Professional Headline (max 150 chars)">
              <Input
                value={form.headline}
                maxLength={150}
                onChange={(e: any) => handleFieldChange('headline', e.target.value)}
                placeholder="e.g. Senior Frontend Engineer | React, TypeScript & Node.js"
              />
            </Field>
            {fieldErrors.headline && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.headline}</p>
            )}
            <p className="text-xs text-slate-400 mt-1 text-right">{form.headline.length}/150</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Field label="Phone Number (max 30 chars)">
                <Input
                  value={form.phone}
                  maxLength={30}
                  onChange={(e: any) => handleFieldChange('phone', e.target.value)}
                  placeholder="+91 9876543210"
                />
              </Field>
              {fieldErrors.phone && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <Field label="Location (max 100 chars)">
                <Input
                  value={form.location}
                  maxLength={100}
                  onChange={(e: any) => handleFieldChange('location', e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka"
                />
              </Field>
              {fieldErrors.location && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.location}</p>
              )}
            </div>
          </div>

          <div>
            <Field label="Professional Bio / Summary (max 2000 chars)">
              <Textarea
                rows={4}
                value={form.bio}
                maxLength={2000}
                onChange={(e: any) => handleFieldChange('bio', e.target.value)}
                placeholder="Summarize your professional experience, key accomplishments, and career interests..."
              />
            </Field>
            {fieldErrors.bio && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.bio}</p>
            )}
            <p className="text-xs text-slate-400 mt-1 text-right">{form.bio.length}/2000</p>
          </div>
        </div>

        {/* Section 2: Skills */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Skills</h2>
                <p className="text-xs text-slate-500">Add up to 50 relevant technical and soft skills</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {form.skills.length}/50
            </span>
          </div>

          {fieldErrors.skills && (
            <p className="text-xs text-red-600 font-medium">{fieldErrors.skills}</p>
          )}

          {/* Skill chips */}
          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-50 border border-slate-200 rounded-lg">
            {form.skills.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No skills added yet. Type a skill below and press Enter.</p>
            ) : (
              form.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 text-slate-800 rounded-full text-xs font-medium shadow-2xs"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <Input
              value={skillInput}
              maxLength={80}
              placeholder="e.g. React, TypeScript, GraphQL, AWS"
              onChange={(e: any) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddSkill}
              disabled={!skillInput.trim() || form.skills.length >= 50}
            >
              Add Skill
            </Button>
          </div>
        </div>

        {/* Section 3: Work Experience */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Work Experience</h2>
                <p className="text-xs text-slate-500">Detail your employment history (max 20 entries)</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddExperience}
              disabled={form.experience.length >= 20}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Experience ({form.experience.length}/20)</span>
            </Button>
          </div>

          {fieldErrors.experience && (
            <p className="text-xs text-red-600 font-medium">{fieldErrors.experience}</p>
          )}

          {form.experience.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
              <p className="text-sm font-medium text-slate-600">No work experience entries added</p>
              <p className="text-xs text-slate-400">Click &ldquo;Add Experience&rdquo; above to include your career milestones.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {form.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative group"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Experience #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(idx)}
                      className="text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Job Title (max 150 chars)">
                      <Input
                        value={exp.jobTitle || ''}
                        maxLength={150}
                        placeholder="e.g. Senior Software Engineer"
                        onChange={(e: any) => handleUpdateExperience(idx, { jobTitle: e.target.value })}
                      />
                    </Field>

                    <Field label="Company (max 200 chars)">
                      <Input
                        value={exp.company || ''}
                        maxLength={200}
                        placeholder="e.g. Acme Corporation"
                        onChange={(e: any) => handleUpdateExperience(idx, { company: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Employment Type">
                      <Input
                        value={exp.employmentType || ''}
                        maxLength={50}
                        placeholder="e.g. Full-time, Contract"
                        onChange={(e: any) => handleUpdateExperience(idx, { employmentType: e.target.value })}
                      />
                    </Field>

                    <Field label="Location (max 100 chars)">
                      <Input
                        value={exp.location || ''}
                        maxLength={100}
                        placeholder="e.g. Bengaluru / Remote"
                        onChange={(e: any) => handleUpdateExperience(idx, { location: e.target.value })}
                      />
                    </Field>

                    <Field label="Start Date">
                      <Input
                        value={exp.startDate || ''}
                        maxLength={50}
                        placeholder="e.g. Jan 2022"
                        onChange={(e: any) => handleUpdateExperience(idx, { startDate: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <Field label="End Date">
                        <Input
                          value={exp.endDate || ''}
                          maxLength={50}
                          placeholder={exp.currentJob ? 'Present' : 'e.g. Dec 2024'}
                          disabled={Boolean(exp.currentJob)}
                          onChange={(e: any) => handleUpdateExperience(idx, { endDate: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="pt-5">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(exp.currentJob)}
                          onChange={(e) =>
                            handleUpdateExperience(idx, {
                              currentJob: e.target.checked,
                              endDate: e.target.checked ? '' : exp.endDate,
                            })
                          }
                          className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                        />
                        <span>I currently work here</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Field label="Role Description (max 2000 chars)">
                      <Textarea
                        rows={3}
                        value={exp.description || ''}
                        maxLength={2000}
                        placeholder="Describe key projects, accomplishments, and tech stacks used..."
                        onChange={(e: any) => handleUpdateExperience(idx, { description: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Education */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Education</h2>
                <p className="text-xs text-slate-500">Add degrees, certifications, and institutions (max 20)</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddEducation}
              disabled={form.education.length >= 20}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education ({form.education.length}/20)</span>
            </Button>
          </div>

          {fieldErrors.education && (
            <p className="text-xs text-red-600 font-medium">{fieldErrors.education}</p>
          )}

          {form.education.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
              <p className="text-sm font-medium text-slate-600">No education entries added</p>
              <p className="text-xs text-slate-400">Click &ldquo;Add Education&rdquo; above to include your academic history.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {form.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative group"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Education #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Degree (max 150 chars)">
                      <Input
                        value={edu.degree || ''}
                        maxLength={150}
                        placeholder="e.g. Bachelor of Technology (B.Tech)"
                        onChange={(e: any) => handleUpdateEducation(idx, { degree: e.target.value })}
                      />
                    </Field>

                    <Field label="Institution (max 200 chars)">
                      <Input
                        value={edu.institution || ''}
                        maxLength={200}
                        placeholder="e.g. Indian Institute of Technology"
                        onChange={(e: any) => handleUpdateEducation(idx, { institution: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Field of Study (max 150 chars)">
                      <Input
                        value={edu.fieldOfStudy || ''}
                        maxLength={150}
                        placeholder="e.g. Computer Science"
                        onChange={(e: any) => handleUpdateEducation(idx, { fieldOfStudy: e.target.value })}
                      />
                    </Field>

                    <Field label="Start Year (1950 - 2100)">
                      <Input
                        type="number"
                        min={1950}
                        max={2100}
                        value={edu.startYear ?? ''}
                        placeholder="2018"
                        onChange={(e: any) =>
                          handleUpdateEducation(idx, {
                            startYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                      />
                    </Field>

                    <Field label="End Year (1950 - 2100)">
                      <Input
                        type="number"
                        min={1950}
                        max={2100}
                        value={edu.endYear ?? ''}
                        placeholder="2022"
                        onChange={(e: any) =>
                          handleUpdateEducation(idx, {
                            endYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Grade / GPA (max 50 chars)">
                      <Input
                        value={edu.grade || ''}
                        maxLength={50}
                        placeholder="e.g. 8.8 / 10 CGPA or First Class"
                        onChange={(e: any) => handleUpdateEducation(idx, { grade: e.target.value })}
                      />
                    </Field>

                    <Field label="Education Notes (max 1000 chars)">
                      <Input
                        value={edu.description || ''}
                        maxLength={1000}
                        placeholder="Honors, key subjects, or extracurriculars"
                        onChange={(e: any) => handleUpdateEducation(idx, { description: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
