// ============================================================
// Clyptus Landing Page - Section 3.10: Role Categories & Top Companies
// 10 role categories with icons and counts + 8 top fictional hiring companies.
// ============================================================

import React from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { RoleCategory, Company } from '../../types';
import {
  Code,
  BrainCircuit,
  Cloud,
  Compass,
  Palette,
  TrendingUp,
  Banknote,
  Users,
  Target,
  Sliders,
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react';

interface CompaniesSectionProps {
  categories: RoleCategory[];
  companies: Company[];
  onOpenSignInModal: (title?: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const CompaniesSection: React.FC<CompaniesSectionProps> = ({
  categories,
  companies,
  onOpenSignInModal,
  onSelectCategory,
}) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code':
        return Code;
      case 'BrainCircuit':
        return BrainCircuit;
      case 'Cloud':
        return Cloud;
      case 'Compass':
        return Compass;
      case 'Palette':
        return Palette;
      case 'TrendingUp':
        return TrendingUp;
      case 'Banknote':
        return Banknote;
      case 'Users':
        return Users;
      case 'Target':
        return Target;
      default:
        return Sliders;
    }
  };

  return (
    <section id="companies" className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Part 1: Role Categories Carousel */}
        <div className="space-y-10">
          <SectionHeading
            eyebrow="EXPLORE DISCIPLINES"
            heading="Browse opportunities by technical domain."
            subheading="From specialized AI infrastructure to high-growth product leadership roles."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.iconName);

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (onSelectCategory) onSelectCategory(cat.name);
                    const jobsElem = document.getElementById('jobs');
                    if (jobsElem) jobsElem.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] hover:border-[#E8630A] hover:bg-[#FCEFE6]/40 cursor-pointer transition-all duration-150 group space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-[#E8630A] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#171614] group-hover:text-[#E8630A] transition-colors leading-snug">
                      {cat.name}
                    </h4>
                    <div className="text-[11px] text-[#8C7E74] mt-1">
                      {cat.jobCount.toLocaleString()} open roles
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Part 2: Top Hiring Companies Grid (8 companies) */}
        <div className="space-y-10 pt-8 border-t border-[#E5D9CF]">
          <SectionHeading
            eyebrow="FEATURED EMPLOYERS"
            heading="Leading engineering teams hiring directly on Clyptus."
            subheading="Explore verified organizations with direct internal hiring pipelines and clear engineering values."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {companies.slice(0, 8).map((co) => (
              <div
                key={co.id}
                onClick={() => onOpenSignInModal(`Sign in to explore all open roles at ${co.name}`)}
                className="p-6 rounded-3xl bg-[#FAF7F2] border border-[#E5D9CF] hover:border-[#E8630A] hover:shadow-md cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  {/* Monogram + Hiring Dot */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
                      {co.monogram}
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF7EE] text-[#1d7d4d] border border-[#1d7d4d]/20 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d7d4d] animate-ping" />
                      <span>Hiring</span>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="space-y-1">
                    <h4 className="text-base font-editorial font-bold text-[#171614] group-hover:text-[#E8630A] transition-colors">
                      {co.name}
                    </h4>
                    <div className="text-xs text-[#62564E]">{co.industry}</div>
                    <div className="text-[11px] text-[#8C7E74] flex items-center gap-1 pt-0.5">
                      <MapPin className="w-3 h-3 text-[#E8630A]" />
                      <span>{co.city}</span>
                    </div>
                  </div>

                  {/* Culture Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {co.cultureTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FFFDF9] border border-[#E5D9CF] text-[#62564E]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Open Roles */}
                <div className="pt-3 border-t border-[#E5D9CF] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#E8630A]">
                    {co.openRolesCount} open positions
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8C7E74] group-hover:translate-x-1 group-hover:text-[#E8630A] transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
