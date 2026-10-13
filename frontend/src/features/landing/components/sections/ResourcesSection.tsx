// ============================================================
// Clyptus Landing Page - Section 3.16: Career Resources
// 5 curated tactical guide cards with read times and Coming Soon modal triggers.
// ============================================================

import React from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { CareerResource } from '../../types';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';

interface ResourcesSectionProps {
  resources: CareerResource[];
  onOpenComingSoonModal: (featureName?: string) => void;
}

export const ResourcesSection: React.FC<ResourcesSectionProps> = ({
  resources,
  onOpenComingSoonModal,
}) => {
  return (
    <section className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="CAREER RESOURCES"
          heading="Tactical guides for modern engineering careers."
          subheading="Curated advice on systems design interviews, salary benchmarking, and resume optimization."
        />

        {/* 5 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div
              key={res.id}
              className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#E5D9CF] hover:border-[#E8630A] transition-all duration-150 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FCEFE6] text-[#E8630A] border border-[#E8630A]/20">
                    {res.category}
                  </span>
                  <span className="text-[11px] text-[#8C7E74] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {res.readTime}
                  </span>
                </div>

                <h4 className="text-lg font-editorial font-bold text-[#171614] leading-snug">
                  {res.title}
                </h4>

                <p className="text-xs text-[#62564E] leading-relaxed">
                  {res.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5D9CF]">
                <button
                  type="button"
                  onClick={() => onOpenComingSoonModal(res.title)}
                  className="text-xs font-bold text-[#E8630A] hover:text-[#D05300] flex items-center gap-1.5 transition-colors"
                >
                  <span>Read full guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
