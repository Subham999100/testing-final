// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ProfilePage (Candidate Profile Viewer & Editor Skeleton)
// ============================================================

import React, { useState } from 'react';
import { useCandidateAuth } from '../../lib/session';
import { candidateApi } from '../../lib/api';
import { Button, Input, Field, Textarea } from '@/portals/org/ui/ui';
import { toast } from '@/portals/org/ui/toast';

export const ProfilePage: React.FC = () => {
  const { user, profile, refetchMe } = useCandidateAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: profile?.phone || '',
    headline: profile?.headline || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    skills: profile?.skills?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const skillsArray = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await candidateApi.patch('/candidate/profile', {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        headline: form.headline.trim() || undefined,
        location: form.location.trim() || undefined,
        bio: form.bio.trim() || undefined,
        skills: skillsArray,
      });

      await refetchMe();
      toast.success('Candidate profile updated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidate Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Keep your professional details accurate for recruiters.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <Input
                value={form.firstName}
                onChange={(e: any) => setForm({ ...form, firstName: e.target.value })}
              />
            </Field>
            <Field label="Last Name">
              <Input
                value={form.lastName}
                onChange={(e: any) => setForm({ ...form, lastName: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Professional Headline">
            <Input
              value={form.headline}
              onChange={(e: any) => setForm({ ...form, headline: e.target.value })}
              placeholder="e.g. Senior Frontend Engineer | React & TypeScript"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone Number">
              <Input
                value={form.phone}
                onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555-0100"
              />
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e: any) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Bangalore, India"
              />
            </Field>
          </div>

          <Field label="Key Skills (comma separated)">
            <Input
              value={form.skills}
              onChange={(e: any) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, TypeScript, Node.js, GraphQL"
            />
          </Field>

          <Field label="Professional Summary / Bio">
            <Textarea
              rows={4}
              value={form.bio}
              onChange={(e: any) => setForm({ ...form, bio: e.target.value })}
              placeholder="Summarize your career experience, strengths, and goals..."
            />
          </Field>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6"
              disabled={saving}
            >
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
