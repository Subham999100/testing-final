// ============================================================
// Clyptus Landing Page - Section 3.5: ATS Score Checker
// Client-side resume dropzone (PDF/DOC/DOCX <= 8MB), simulated 2s scan,
// circular score gauge, sub-scores, top fixes, and blurred full report overlay.
// ============================================================

import React, { useState } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { getAtsReport } from '../../services/landingApi';
import { AtsReport } from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AtsSectionProps {
  onOpenSignInModal: (title?: string) => void;
}

export const AtsSection: React.FC<AtsSectionProps> = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startAnalysis = async (name: string, sizeKb: number) => {
    setFileName(name);
    setFileSizeKb(sizeKb);
    setErrorMessage(null);
    setIsScanning(true);
    setScanProgress(10);

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 20;
      });
    }, 350);

    try {
      const res = await getAtsReport(name, sizeKb);
      clearInterval(progressInterval);
      setScanProgress(100);
      setTimeout(() => {
        setIsScanning(false);
        setReport(res);
      }, 300);
    } catch {
      clearInterval(progressInterval);
      setIsScanning(false);
      setErrorMessage('Simulation failed. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('File exceeds maximum size of 8 MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setErrorMessage('Accepted formats: PDF, DOC, DOCX.');
      return;
    }

    startAnalysis(file.name, Math.round(file.size / 1024));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('File exceeds maximum size of 8 MB.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setErrorMessage('Accepted formats: PDF, DOC, DOCX.');
      return;
    }

    startAnalysis(file.name, Math.round(file.size / 1024));
  };

  const handleTrySample = () => {
    startAnalysis('rahul_verma_senior_engineer_resume.pdf', 285);
  };

  const handleReset = () => {
    setReport(null);
    setFileName(null);
    setErrorMessage(null);
    setScanProgress(0);
  };

  return (
    <section id="ats" className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="ATS SCORE"
          heading="Know how recruiters' systems read your resume."
          subheading="Uncover formatting traps, missing tech stack taxonomy, and metric coverage before applying."
        />

        {/* Card Container */}
        <div className="max-w-4xl mx-auto bg-[#FFFDF9] border border-[#E5D9CF] rounded-3xl p-6 sm:p-10 shadow-lg">
          {!report && !isScanning && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                  dragActive
                    ? 'border-[#E8630A] bg-[#FCEFE6]/50 scale-[1.01]'
                    : 'border-[#E5D9CF] hover:border-[#E8630A] bg-[#FAF7F2]/60'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-lg font-bold text-[#171614]">
                    Drag & drop your resume file here
                  </h4>
                  <p className="text-xs text-[#62564E]">
                    Supported formats: PDF, DOC, DOCX (Max 8 MB) · Files processed purely client-side
                  </p>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-xs shadow-xs transition-colors">
                    <span>Choose Resume File</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleTrySample}
                    className="px-5 py-2.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-xs font-semibold text-[#171614] transition-colors"
                  >
                    Try with sample resume
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#f9e9e5] border border-[#b63a2d]/30 text-xs text-[#b63a2d] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Scanning Animation */}
          {isScanning && (
            <div className="py-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-editorial font-bold text-[#171614]">
                  Analyzing {fileName}...
                </h4>
                <p className="text-xs text-[#62564E]">
                  Simulating multi-stage ATS keyword indexing, formatting validation, and metric extraction.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full h-3 rounded-full bg-[#E5D9CF] overflow-hidden">
                  <div
                    className="h-full bg-[#E8630A] transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8C7E74] font-semibold">{scanProgress}% completed</div>
              </div>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header with filename and Reset */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5D9CF]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5D9CF] text-[#E8630A]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#171614]">{report.fileName}</div>
                    <div className="text-xs text-[#8C7E74]">
                      {report.fileSizeKb} KB · Simulated ATS Audit
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E5D9CF] hover:bg-[#FAF7F2] text-xs font-medium text-[#62564E] flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Test another resume</span>
                </button>
              </div>

              {/* Top Section: Score Gauge & 4 Sub-Scores */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Circular Gauge (4 cols) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF]">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#E5D9CF]"
                        strokeWidth="3.2"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#E8630A]"
                        strokeDasharray={`${report.overallScore}, 100`}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-editorial font-bold text-[#171614]">
                        {report.overallScore}
                      </span>
                      <span className="text-xs font-semibold text-[#8C7E74] block">/ 100</span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-xs font-bold text-[#1d7d4d] flex items-center gap-1 justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Strong Candidate Profile</span>
                    </div>
                    <div className="text-[11px] text-[#8C7E74] mt-0.5">
                      Better than 82% of peer applicants
                    </div>
                  </div>
                </div>

                {/* 4 Progress Sub-scores (7 cols) */}
                <div className="md:col-span-7 space-y-3.5">
                  {[
                    { label: 'Keywords & Competencies', val: report.breakdown.keywords },
                    { label: 'Formatting & Layout Hierarchy', val: report.breakdown.formatting },
                    { label: 'Impact & Quantified Metrics', val: report.breakdown.impact },
                    { label: 'Typography & Readability', val: report.breakdown.readability },
                  ].map((sub) => (
                    <div key={sub.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-[#171614]">
                        <span>{sub.label}</span>
                        <span className="text-[#E8630A]">{sub.val}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#FAF7F2] border border-[#E5D9CF] overflow-hidden">
                        <div
                          className="h-full bg-[#E8630A] rounded-full"
                          style={{ width: `${sub.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Fixes */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-[#171614] uppercase tracking-wider">
                  Top Recommended Fixes
                </h4>

                <div className="space-y-2.5">
                  {report.topFixes.map((fix) => (
                    <div
                      key={fix.id}
                      className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5D9CF] flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[#171614] flex items-center gap-2">
                          <span>{fix.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              fix.severity === 'high'
                                ? 'bg-[#f9e9e5] text-[#b63a2d]'
                                : fix.severity === 'medium'
                                ? 'bg-[#f9eed8] text-[#855517]'
                                : 'bg-[#EAF7EE] text-[#1d7d4d]'
                            }`}
                          >
                            {fix.severity} priority
                          </span>
                        </div>
                        <p className="text-xs text-[#62564E] leading-relaxed">
                          {fix.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blurred Second Half with Registration Overlay */}
              <div className="relative rounded-2xl border border-[#E5D9CF] overflow-hidden p-6 bg-[#FAF7F2]/40">
                {/* Blurred Content Placeholder */}
                <div className="filter blur-sm select-none opacity-40 space-y-4 pointer-events-none">
                  <div className="h-4 bg-[#62564E] rounded w-1/3" />
                  <div className="h-10 bg-[#E5D9CF] rounded w-full" />
                  <div className="h-4 bg-[#62564E] rounded w-1/2" />
                  <div className="h-10 bg-[#E5D9CF] rounded w-full" />
                </div>

                {/* Overlay Card */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FFFDF9]/85 backdrop-blur-xs">
                  <div className="w-10 h-10 rounded-full bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-editorial font-bold text-lg text-[#171614]">
                      Create a free account to see the full report
                    </h5>
                    <p className="text-xs text-[#62564E] max-w-md">
                      Get detailed keyword suggestions, benchmark against peer applicants, and auto-sync with verified recruiters.
                    </p>
                  </div>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors text-decoration-none"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
