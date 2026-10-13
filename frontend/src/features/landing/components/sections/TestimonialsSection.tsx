// ============================================================
// Clyptus Landing Page - Section 3.15: Testimonials
// 3 candidate reviews with auto-advancing/pausable carousel on mobile.
// ============================================================

import React, { useState, useEffect } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { Testimonial } from '../../types';
import { Star, Quote, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  testimonials,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance every 5 seconds on mobile, pausable
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, testimonials.length]);

  return (
    <section className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="VERIFIED EXPERIENCES"
          heading="Loved by engineers across India."
          subheading="Discover how candidates landed high-impact software and AI roles with transparent compensation."
        />

        {/* Desktop 3-Card Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#E5D9CF] shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-[#E8630A]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-sm text-[#171614] italic leading-relaxed">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5D9CF] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {t.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="font-bold text-sm text-[#171614]">{t.name}</div>
                  <div className="text-xs text-[#62564E]">{t.role}</div>
                  <div className="text-[11px] text-[#8C7E74] flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3 h-3 text-[#E8630A]" />
                    <span>{t.city}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Pausable Auto-Advancing Carousel */}
        <div
          className="md:hidden relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {(() => {
            const t = testimonials[currentIndex];
            if (!t) return null;

            return (
              <div className="p-7 rounded-3xl bg-[#FFFDF9] border border-[#E5D9CF] shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#E8630A]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#8C7E74]">
                    {currentIndex + 1} / {testimonials.length}
                  </span>
                </div>

                <p className="text-sm text-[#171614] italic leading-relaxed">
                  "{t.quote}"
                </p>

                <div className="pt-4 border-t border-[#E5D9CF] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {t.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#171614]">{t.name}</div>
                      <div className="text-[11px] text-[#62564E]">{t.role}</div>
                      <div className="text-[10px] text-[#8C7E74]">{t.city}</div>
                    </div>
                  </div>

                  {/* Nav Arrows */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          prev > 0 ? prev - 1 : testimonials.length - 1,
                        )
                      }
                      className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5D9CF] text-[#171614]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
                      }
                      className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5D9CF] text-[#171614]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
};
