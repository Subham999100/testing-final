// ============================================================
// Clyptus Landing Page - Section 3.17: FAQ Accordion
// Accessible single-item accordion with ARIA expanded states and all 8 questions.
// ============================================================

import React, { useState } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { FaqItem } from '../../types';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqSectionProps {
  faqs: FaqItem[];
}

export const FaqSection: React.FC<FaqSectionProps> = ({ faqs }) => {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="FREQUENTLY ASKED QUESTIONS"
          heading="Everything you need to know about Clyptus."
          subheading="Direct answers on candidate privacy, ATS evaluation, map discovery, and hiring workflows."
        />

        {/* Accordion Container */}
        <div className="space-y-3.5" role="region" aria-label="Frequently Asked Questions">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-[#E5D9CF] bg-[#FFFDF9] overflow-hidden shadow-2xs transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-editorial font-bold text-base sm:text-lg text-[#171614] leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isOpen
                        ? 'bg-[#E8630A] text-white rotate-180'
                        : 'bg-[#FAF7F2] text-[#62564E]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${faq.id}`}
                    role="region"
                    className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#62564E] leading-relaxed border-t border-[#E5D9CF]/60 animate-in fade-in duration-150"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
