// ============================================================
// Clyptus Landing Page - Section 3.2: Hero Section
// Search bar with Indian cities autocomplete, popular search chips,
// floating SVG analytics visual, and abstract trust wordmarks.
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface HeroProps {
  onSearch: (keyword: string, location: string) => void;
  availableCities: string[];
}

export const Hero: React.FC<HeroProps> = ({ onSearch, availableCities }) => {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const popularChips = [
    'AI Engineer',
    'Python Developer',
    'Java Developer',
    'Data Analyst',
    'Frontend Developer',
    'Cloud Engineer',
  ];

  const handleLocationChange = (val: string) => {
    setLocation(val);
    if (val.trim()) {
      const filtered = availableCities.filter((c) =>
        c.toLowerCase().includes(val.toLowerCase().trim()),
      );
      setLocationSuggestions(filtered);
      setShowLocationDropdown(true);
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  const handleSelectCity = (city: string) => {
    setLocation(city);
    setShowLocationDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword, location);
    const jobsElem = document.getElementById('jobs');
    if (jobsElem) {
      jobsElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChipClick = (chip: string) => {
    setKeyword(chip);
    onSearch(chip, location);
    const jobsElem = document.getElementById('jobs');
    if (jobsElem) {
      jobsElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Search */}
          <div className="lg:col-span-7 space-y-7 text-left">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FCEFE6] border border-[#E8630A]/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#E8630A] animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E8630A]">
                HIRING NOW
              </span>
              <span className="text-xs text-[#62564E] hidden sm:inline">
                · Direct corporate applications across India
              </span>
            </div>

            {/* H1 Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-editorial font-bold text-[#171614] leading-[1.12] tracking-tight">
              Find a role that matches the work you{' '}
              <span className="text-[#E8630A] italic font-normal">actually want.</span>
            </h1>

            {/* Sub-line */}
            <p className="text-lg sm:text-xl text-[#62564E] leading-relaxed max-w-2xl">
              Explore India on the map, check your ATS score, and let AI put your
              profile in front of verified recruiters without recruiter spam.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <a
                href="#jobs"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-decoration-none"
              >
                <span>Browse jobs</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                to="/register"
                className="px-6 py-3.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-[#171614] font-semibold text-sm transition-all shadow-xs text-decoration-none"
              >
                Create profile
              </Link>
            </div>

            {/* Search Bar Form */}
            <form
              onSubmit={handleSubmit}
              className="p-2 sm:p-2.5 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] shadow-lg flex flex-col sm:flex-row gap-2 relative z-20"
            >
              {/* Job Title / Keywords */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2 sm:py-1">
                <Search className="w-5 h-5 text-[#8C7E74] shrink-0" />
                <input
                  type="text"
                  placeholder="Job title, skills, or company..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#171614] placeholder:text-[#8C7E74] focus:outline-none"
                />
              </div>

              <div className="hidden sm:block w-px bg-[#E5D9CF] self-stretch" />

              {/* Location Input with Autocomplete */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2 sm:py-1 relative">
                <MapPin className="w-5 h-5 text-[#E8630A] shrink-0" />
                <input
                  type="text"
                  placeholder="City (e.g. Bengaluru, Pune)..."
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => setShowLocationDropdown(true)}
                  className="w-full bg-transparent text-sm text-[#171614] placeholder:text-[#8C7E74] focus:outline-none"
                />

                {/* Autocomplete Dropdown */}
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#FFFDF9] border border-[#E5D9CF] rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                    {(locationSuggestions.length > 0 ? locationSuggestions : availableCities).slice(0, 6).map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#171614] hover:bg-[#FAF7F2] flex items-center justify-between"
                      >
                        <span>{city}</span>
                        <span className="text-[10px] text-[#8C7E74]">Hiring now</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-sm transition-colors shrink-0 flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Search Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Popular Searches Chips */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8C7E74]">
                Popular searches:
              </span>
              <div className="flex flex-wrap gap-2">
                {popularChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-[#FAF7F2] hover:bg-[#FCEFE6] text-[#62564E] hover:text-[#E8630A] border border-[#E5D9CF] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Polished Hero Visual built with SVG/CSS */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Background Ambient Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#E8630A]/10 to-[#D97706]/10 rounded-3xl blur-2xl -z-10" />

            <div className="w-full max-w-md bg-[#FFFDF9] border border-[#E5D9CF] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative">
              {/* Header of Visual */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5D9CF]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center font-bold text-sm">
                    C
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#171614]">Candidate Intelligence</div>
                    <div className="text-[10px] text-[#8C7E74]">Live talent telemetry</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EAF7EE] text-[#1d7d4d] border border-[#1d7d4d]/20">
                  Live Market
                </span>
              </div>

              {/* Floating Card 1: Open roles 41 */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-xs text-[#62564E] font-medium">Matching Open Roles</div>
                  <div className="text-2xl font-editorial font-bold text-[#171614] mt-0.5">
                    41 positions
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              {/* Floating Card 2: Hiring Momentum Mini Bar Chart (SVG) */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171614] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#E8630A]" />
                    Hiring Momentum
                  </span>
                  <span className="text-xs font-bold text-[#1d7d4d]">+24% this week</span>
                </div>

                {/* SVG Mini Bar Chart */}
                <div className="h-16 w-full flex items-end justify-between gap-2 px-1 pt-2">
                  {[35, 52, 45, 68, 85, 95, 78].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          idx === 5 ? 'bg-[#E8630A]' : 'bg-[#E5D9CF] hover:bg-[#D7C7B8]'
                        }`}
                        style={{ height: `${val}%` }}
                      />
                      <span className="text-[9px] text-[#8C7E74]">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Card 3: Career Fit 92% Gauge */}
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] flex items-center gap-4 shadow-sm">
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#E5D9CF]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#E8630A]"
                      strokeDasharray="92, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold text-[#171614]">92%</span>
                </div>

                <div className="flex-1">
                  <div className="text-xs font-bold text-[#171614]">Career Fit Compatibility</div>
                  <div className="text-[11px] text-[#62564E] leading-tight mt-0.5">
                    Analyzed against verified skills & compensation expectations
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thin Trust Strip Below Hero */}
        <div className="mt-16 pt-8 border-t border-[#E5D9CF] text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8C7E74]">
            Trusted by growing teams across India
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75">
            {['NEXORA AI', 'ZENITHA LABS', 'KINETIX', 'CLOUDSPIRE', 'VERTEX DATA'].map((brand) => (
              <span
                key={brand}
                className="font-editorial font-bold text-base sm:text-lg tracking-wider text-[#62564E] hover:text-[#171614] transition-colors select-none"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
