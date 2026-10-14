// ============================================================
// Clyptus Landing Page - Section 3.6: ATS Resume Builder
// Interactive live preview: left form, right live A4 resume preview,
// 3 template switchers (Classic, Modern, Compact), live completeness score,
// and "Download PDF" modal prompt.
// ============================================================

import React, { useState, useMemo } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import {
  Download,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  Layout,
  Layers,
} from 'lucide-react';

interface ResumeBuilderSectionProps {
  onOpenSignInModal: (title?: string) => void;
}

export const ResumeBuilderSection: React.FC<ResumeBuilderSectionProps> = ({
  onOpenSignInModal,
}) => {
  const [template, setTemplate] = useState<'classic' | 'modern' | 'compact'>('modern');
  const [name, setName] = useState('Priya Sharma');
  const [title, setTitle] = useState('Senior Fullstack Engineer');
  const [summary, setSummary] = useState(
    'Specializing in high-performance React architectures, distributed Node.js microservices, and event-driven data streaming. Scaled enterprise portals to 500k active users.',
  );
  const [skills, setSkills] = useState(['React 18', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker']);

  // Calculate completeness score (60 - 98)
  const completenessScore = useMemo(() => {
    let score = 50;
    if (name.trim().length > 3) score += 12;
    if (title.trim().length > 4) score += 12;
    if (summary.trim().length > 30) score += 14;
    if (skills.length >= 3) score += 10;
    return Math.min(98, score);
  }, [name, title, summary, skills]);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.target as HTMLInputElement).value.trim();
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <section
      id="resume-builder"
      className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="RESUME BUILDER"
          heading="Build a resume that passes the filters."
          subheading="A lightweight, recruiter-friendly A4 layout engineered for parsing reliability across all major ATS platforms."
        />

        {/* 2-Column Grid: Left Controls Form, Right Live A4 Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Form (5 cols) */}
          <div className="lg:col-span-5 bg-[#FAF7F2] border border-[#E5D9CF] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5D9CF]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EAF7EE] text-[#1d7d4d] border border-[#1d7d4d]/20">
                  ATS-Friendly
                </span>
                <span className="text-xs text-[#62564E] font-medium">Live Builder</span>
              </div>

              {/* Mini Completeness Score Ring */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#171614]">{completenessScore}% Ready</span>
                <div className="relative w-7 h-7 flex items-center justify-center">
                  <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#E5D9CF]"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#E8630A]"
                      strokeDasharray={`${completenessScore}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Template Switcher */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#62564E]">
                Select Layout Template:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'classic', label: 'Classic' },
                  { id: 'modern', label: 'Modern' },
                  { id: 'compact', label: 'Compact' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      template === t.id
                        ? 'bg-[#E8630A] text-white border-[#E8630A] shadow-xs'
                        : 'bg-[#FFFDF9] text-[#171614] border-[#E5D9CF] hover:bg-[#F4EFEA]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#171614]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D9CF] bg-white text-xs text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#171614]">
                  Professional Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D9CF] bg-white text-xs text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#171614]">
                  Executive Summary
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D9CF] bg-white text-xs text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#171614]">
                  Core Competencies (Press Enter to add)
                </label>
                <input
                  type="text"
                  placeholder="Type a skill and hit Enter..."
                  onKeyDown={handleAddSkill}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5D9CF] bg-white text-xs text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FFFDF9] border border-[#E5D9CF] text-[#171614]"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-[#8C7E74] hover:text-[#b63a2d]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Download CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenSignInModal('Sign in to download ATS PDF')}
                className="w-full py-3 px-4 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download ATS-Optimized PDF</span>
              </button>
              <div className="text-[10px] text-center text-[#8C7E74] mt-2">
                100% compliant with standard enterprise ATS parsers
              </div>
            </div>
          </div>

          {/* Right Live A4 Resume Preview (7 cols) */}
          <div className="lg:col-span-7 flex justify-center">
            <div
              className={`w-full max-w-lg aspect-[1/1.3] bg-white border border-[#E5D9CF] rounded-2xl shadow-xl p-8 sm:p-10 space-y-6 text-left select-none relative transition-all duration-200 ${
                template === 'classic'
                  ? 'font-serif'
                  : template === 'compact'
                  ? 'text-xs'
                  : 'font-sans'
              }`}
            >
              {/* Watermark badge */}
              <div className="absolute top-4 right-4 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-[#FCEFE6] text-[#E8630A] border border-[#E8630A]/20">
                {template.toUpperCase()} TEMPLATE
              </div>

              {/* Resume Header */}
              <div className={`space-y-1 pb-4 border-b ${template === 'modern' ? 'border-[#E8630A]' : 'border-[#171614]'}`}>
                <h3 className="text-2xl font-bold text-[#171614] tracking-tight">
                  {name || 'Your Full Name'}
                </h3>
                <div className={`text-sm font-semibold ${template === 'modern' ? 'text-[#E8630A]' : 'text-[#62564E]'}`}>
                  {title || 'Your Professional Title'}
                </div>
                <div className="text-[11px] text-[#8C7E74] pt-0.5">
                  Bengaluru, India · priya.sharma@example.com · +91 98765 43210
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#171614]">
                  Professional Summary
                </h4>
                <p className="text-xs text-[#3D352E] leading-relaxed">
                  {summary || 'Brief executive overview highlighting engineering scope and key accomplishments.'}
                </p>
              </div>

              {/* Work Experience Preview Mock */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#171614]">
                  Key Experience
                </h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#171614]">
                      <span>Senior Software Engineer · Nexora Systems</span>
                      <span className="text-[11px] font-normal text-[#8C7E74]">2022 - Present</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-[#62564E] space-y-1 mt-1 leading-relaxed">
                      <li>Architected high-throughput microservices cutting response latency by 32%.</li>
                      <li>Spearheaded core React component design system utilized across 4 squads.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="space-y-1.5 pt-2 border-t border-[#E5D9CF]/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#171614]">
                  Technical Competencies
                </h4>
                <div className="text-xs text-[#3D352E] leading-relaxed">
                  <span className="font-semibold">Core: </span>
                  {skills.join(' · ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
