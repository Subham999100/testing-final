// ============================================================
// Clyptus Landing Page - Section 3.9: Open Roles Carousel
// Horizontal scroll-snap carousel (arrows + keyboard), 12 rich job cards,
// bookmark saving (sign-in prompt), INR LPA salaries, and filtered empty state.
// ============================================================

import React, { useRef } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { Job } from '../../types';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ArrowRight,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface JobsSectionProps {
  jobs: Job[];
  onOpenSignInModal: (title?: string) => void;
  activeFilterSummary?: string;
  onClearFilter?: () => void;
}

export const JobsSection: React.FC<JobsSectionProps> = ({
  jobs,
  onOpenSignInModal,
  activeFilterSummary,
  onClearFilter,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section id="jobs" className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Heading + Nav Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="OPEN ROLES"
            heading="Roles with clear scope and real hiring teams."
            subheading="Verified opportunities with explicit salary ranges, modern tech stacks, and direct access to engineering leaders."
          />

          {/* Navigation Carousel Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-11 h-11 rounded-2xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-[#171614] flex items-center justify-center shadow-xs transition-colors"
              aria-label="Previous jobs"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-11 h-11 rounded-2xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-[#171614] flex items-center justify-center shadow-xs transition-colors"
              aria-label="Next jobs"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Indicator if active */}
        {activeFilterSummary && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-xs">
            <span className="text-[#62564E]">
              Filtering by: <strong className="text-[#171614]">{activeFilterSummary}</strong> ({jobs.length} results)
            </span>
            {onClearFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="text-[#E8630A] font-semibold hover:underline"
              >
                Clear search filter
              </button>
            )}
          </div>
        )}

        {/* Carousel or Empty State */}
        {jobs.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 custom-scrollbar"
            tabIndex={0}
            role="region"
            aria-label="Job openings carousel"
          >
            {jobs.map((job) => (
              <div
                key={job.id}
                className="w-[330px] sm:w-[360px] shrink-0 snap-start bg-[#FFFDF9] border border-[#E5D9CF] rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                {/* Header: Monogram, Company, Bookmark */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {job.companyMonogram}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#171614]">{job.companyName}</div>
                        <div className="text-[11px] text-[#62564E] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#E8630A]" />
                          <span>{job.city} · {job.workMode}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSignInModal('Sign in to save this job to your profile')}
                      className="p-2 rounded-xl text-[#8C7E74] hover:text-[#E8630A] hover:bg-[#FAF7F2] transition-colors"
                      aria-label="Save job bookmark"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FCEFE6] text-[#E8630A]">
                      {job.category}
                    </div>
                    <h4 className="text-lg font-editorial font-bold text-[#171614] leading-snug line-clamp-2">
                      {job.title}
                    </h4>
                  </div>

                  {/* Compensation & Experience */}
                  <div className="flex items-center justify-between text-xs font-semibold pt-1">
                    <span className="text-base font-bold text-[#E8630A]">
                      ₹{job.salaryMinLpa}-{job.salaryMaxLpa} LPA
                    </span>
                    <span className="text-[#62564E]">{job.experience}</span>
                  </div>

                  {/* Skills Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#FAF7F2] text-[#171614] border border-[#E5D9CF]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Posted Time + View Job CTA */}
                <div className="pt-4 border-t border-[#E5D9CF] flex items-center justify-between">
                  <span className="text-[11px] text-[#8C7E74] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {job.postedTime}
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenSignInModal(`Sign in to apply to ${job.title}`)}
                    className="px-4 py-2 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>View Job</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#FFFDF9] border border-[#E5D9CF] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8C7E74] flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-editorial font-bold text-[#171614]">
                No roles match the selected search criteria
              </h4>
              <p className="text-xs text-[#62564E]">
                Try adjusting your keyword filter or explore all verified openings across India.
              </p>
            </div>
            {onClearFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="px-4 py-2 rounded-xl bg-[#E8630A] text-white text-xs font-semibold"
              >
                Reset search filters
              </button>
            )}
          </div>
        )}

        {/* Link to see all openings */}
        <div className="text-center pt-2">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#E8630A] hover:text-[#D05300] transition-colors"
          >
            <span>See all 12,400+ verified openings across India</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
