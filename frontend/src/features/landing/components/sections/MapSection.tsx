// ============================================================
// Clyptus Landing Page - Section 3.3: India Map Job Discovery
// Interactive stylised SVG map of India with 12 geographically placed
// city pins, dynamic pulse animation, filters recomputing pin sizes,
// side drawer (bottom sheet on mobile), and accessible keyboard list.
// ============================================================

import React, { useState, useMemo } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { City, Company, Job, WorkMode } from '../../types';
import {
  MapPin,
  Building2,
  Briefcase,
  ChevronRight,
  ChevronDown,
  X,
  SlidersHorizontal,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface MapSectionProps {
  cities: City[];
  onOpenSignInModal: (title?: string) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({
  cities,
  onOpenSignInModal,
}) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('bengaluru');
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  // Filters above map
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('all');
  const [selectedExperience, setSelectedExperience] = useState<string>('all');

  // Filter multiplier simulation to recompute pin sizes in real time
  const filterMultiplier = useMemo(() => {
    let mult = 1.0;
    if (selectedCategory !== 'all') mult *= 0.65;
    if (selectedWorkMode !== 'all') mult *= 0.55;
    if (selectedExperience !== 'all') mult *= 0.7;
    return mult;
  }, [selectedCategory, selectedWorkMode, selectedExperience]);

  // Selected city object
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) || cities[0],
    [cities, selectedCityId],
  );

  // Simulated companies for the selected city
  const cityCompanies: Company[] = useMemo(() => {
    return [
      {
        id: `${selectedCity.id}-co-1`,
        name: `${selectedCity.name} Tech Systems`,
        monogram: selectedCity.name.slice(0, 2).toUpperCase(),
        industry: selectedCity.topSectors[0] || 'Software Platforms',
        city: selectedCity.name,
        openRolesCount: Math.round(14 * filterMultiplier) || 4,
        cultureTags: ['Fast Growing', 'Modern Stack', 'Hybrid'],
        hiringNow: true,
        blurb: `Engineering core digital services and data pipelines headquartered in ${selectedCity.name}.`,
        jobs: [
          {
            id: `${selectedCity.id}-j1`,
            title: 'Senior Fullstack Engineer',
            companyId: `${selectedCity.id}-co-1`,
            companyName: `${selectedCity.name} Tech Systems`,
            companyMonogram: selectedCity.name.slice(0, 2).toUpperCase(),
            city: selectedCity.name,
            workMode: (selectedWorkMode !== 'all' ? selectedWorkMode : 'Hybrid') as WorkMode,
            experience: '3 - 6 yrs',
            salaryMinLpa: 22,
            salaryMaxLpa: 38,
            category: 'Software Development',
            postedTime: '1 day ago',
            skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
            blurb: 'Lead product engineering modules for regional enterprise clients.',
          },
          {
            id: `${selectedCity.id}-j2`,
            title: 'Data & Analytics Specialist',
            companyId: `${selectedCity.id}-co-1`,
            companyName: `${selectedCity.name} Tech Systems`,
            companyMonogram: selectedCity.name.slice(0, 2).toUpperCase(),
            city: selectedCity.name,
            workMode: (selectedWorkMode !== 'all' ? selectedWorkMode : 'Onsite') as WorkMode,
            experience: '4 - 7 yrs',
            salaryMinLpa: 24,
            salaryMaxLpa: 42,
            category: 'Data & AI',
            postedTime: '2 days ago',
            skills: ['Python', 'SQL', 'Snowflake', 'dbt'],
            blurb: 'Analyze high-volume behavioral metrics and predictive models.',
          },
        ],
      },
      {
        id: `${selectedCity.id}-co-2`,
        name: `Vertex ${selectedCity.name} Labs`,
        monogram: 'VX',
        industry: selectedCity.topSectors[1] || 'Cloud Infrastructure',
        city: selectedCity.name,
        openRolesCount: Math.round(11 * filterMultiplier) || 3,
        cultureTags: ['High Autonomy', 'Async First', 'Health Insurance'],
        hiringNow: true,
        blurb: 'Cloud orchestration and developer tooling for distributed development teams.',
        jobs: [
          {
            id: `${selectedCity.id}-j3`,
            title: 'Cloud DevOps Architect',
            companyId: `${selectedCity.id}-co-2`,
            companyName: `Vertex ${selectedCity.name} Labs`,
            companyMonogram: 'VX',
            city: selectedCity.name,
            workMode: 'Remote',
            experience: '5 - 9 yrs',
            salaryMinLpa: 28,
            salaryMaxLpa: 48,
            category: 'Cloud & DevOps',
            postedTime: '3 hours ago',
            skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD'],
            blurb: 'Automate production deployments and scale container clusters.',
          },
        ],
      },
      {
        id: `${selectedCity.id}-co-3`,
        name: `Nexora ${selectedCity.name}`,
        monogram: 'NX',
        industry: 'Artificial Intelligence',
        city: selectedCity.name,
        openRolesCount: Math.round(9 * filterMultiplier) || 2,
        cultureTags: ['Research Backed', 'Generous Equity', 'Flexible Hours'],
        hiringNow: true,
        blurb: 'Deploying domain-specific language models for enterprise workflows.',
        jobs: [
          {
            id: `${selectedCity.id}-j4`,
            title: 'AI Prompt & Inference Engineer',
            companyId: `${selectedCity.id}-co-3`,
            companyName: `Nexora ${selectedCity.name}`,
            companyMonogram: 'NX',
            city: selectedCity.name,
            workMode: 'Hybrid',
            experience: '2 - 5 yrs',
            salaryMinLpa: 25,
            salaryMaxLpa: 45,
            category: 'Data & AI',
            postedTime: '4 hours ago',
            skills: ['Python', 'PyTorch', 'LangChain', 'FastAPI'],
            blurb: 'Design high-throughput evaluation loops for customized LLMs.',
          },
        ],
      },
    ];
  }, [selectedCity, filterMultiplier, selectedWorkMode]);

  const handleCitySelect = (city: City) => {
    setSelectedCityId(city.id);
    setDrawerOpen(true);
  };

  return (
    <section id="map" className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="EXPLORE INDIA"
          heading="See where India is hiring."
          subheading="Filter active opportunities geographically across 12 prominent engineering hubs and inspect verified local companies."
        />

        {/* Filters Above Map */}
        <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#62564E]">
            <SlidersHorizontal className="w-4 h-4 text-[#E8630A]" />
            <span>Map Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Role Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5D9CF] bg-[#FAF7F2] text-xs font-medium text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
            >
              <option value="all">All Role Categories</option>
              <option value="software">Software Development</option>
              <option value="data">Data & AI</option>
              <option value="cloud">Cloud & DevOps</option>
              <option value="product">Product Management</option>
              <option value="design">Design & UI/UX</option>
            </select>

            {/* Work Mode Toggle */}
            <div className="flex items-center rounded-xl border border-[#E5D9CF] bg-[#FAF7F2] p-0.5 text-xs font-medium">
              {['all', 'Remote', 'Hybrid', 'Onsite'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedWorkMode(mode)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    selectedWorkMode === mode
                      ? 'bg-[#E8630A] text-white font-semibold shadow-xs'
                      : 'text-[#62564E] hover:text-[#171614]'
                  }`}
                >
                  {mode === 'all' ? 'All Modes' : mode}
                </button>
              ))}
            </div>

            {/* Experience Range */}
            <select
              value={selectedExperience}
              onChange={(e) => setSelectedExperience(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5D9CF] bg-[#FAF7F2] text-xs font-medium text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
            >
              <option value="all">Any Experience</option>
              <option value="junior">0 - 2 Years</option>
              <option value="mid">2 - 5 Years</option>
              <option value="senior">5 - 8 Years</option>
              <option value="lead">8+ Years</option>
            </select>
          </div>
        </div>

        {/* Main 2-Column Content: Left Cities List + Right Stylized Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          {/* Left Column: Top Hiring Cities List (Accessible fallback) */}
          <div className="lg:col-span-4 bg-[#FFFDF9] border border-[#E5D9CF] rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5D9CF]">
              <h3 className="font-editorial font-bold text-lg text-[#171614]">
                Top Hiring Hubs
              </h3>
              <span className="text-xs text-[#8C7E74]">Ranked by roles</span>
            </div>

            <div
              className="space-y-2 max-h-[540px] overflow-y-auto custom-scrollbar pr-1"
              role="listbox"
              aria-label="List of hiring cities"
            >
              {cities.map((city, idx) => {
                const adjustedCount = Math.round(city.jobCount * filterMultiplier);
                const isSelected = city.id === selectedCityId;

                return (
                  <button
                    key={city.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleCitySelect(city)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FCEFE6] border-[#E8630A] shadow-xs'
                        : 'bg-[#FAF7F2] border-[#E5D9CF]/80 hover:bg-[#F4EFEA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx < 3
                            ? 'bg-[#E8630A] text-white'
                            : 'bg-[#E5D9CF] text-[#62564E]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-[#171614] flex items-center gap-1.5">
                          <span>{city.name}</span>
                          <span className="text-[11px] font-normal text-[#8C7E74]">
                            ({city.state})
                          </span>
                        </div>
                        <div className="text-[11px] text-[#62564E]">
                          {city.topSectors[0]}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#E8630A]">
                        {adjustedCount.toLocaleString()} roles
                      </div>
                      <div className="text-[10px] text-[#8C7E74]">
                        {city.companyCount} orgs
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Stylized India SVG Map Canvas */}
          <div className="lg:col-span-8 bg-[#FFFDF9] border border-[#E5D9CF] rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col items-center justify-center min-h-[580px]">
            {/* Map Legend */}
            <div className="absolute top-6 left-6 z-10 bg-[#FAF7F2]/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-[#E5D9CF] text-[11px] text-[#62564E] space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E8630A]" />
                <span>Pin size reflects active job volume</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1d7d4d]" />
                <span>Click any pin to inspect hiring companies</span>
              </div>
            </div>

            {/* Hover Tooltip Overlay */}
            {hoveredCityId && (
              <div className="absolute top-6 right-6 z-20 bg-[#171614] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs space-y-0.5 pointer-events-none animate-in fade-in duration-100">
                {(() => {
                  const hCity = cities.find((c) => c.id === hoveredCityId);
                  if (!hCity) return null;
                  const count = Math.round(hCity.jobCount * filterMultiplier);
                  return (
                    <>
                      <div className="font-bold text-[#FAF7F2]">{hCity.name}</div>
                      <div className="text-[#D7C7B8] text-[11px]">
                        {count.toLocaleString()} open jobs · {hCity.companyCount} companies
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Stylized SVG Map of India */}
            <div className="w-full max-w-[560px] aspect-[1000/1100] relative">
              <svg
                viewBox="0 0 1000 1100"
                className="w-full h-full drop-shadow-sm select-none"
                aria-label="Map of India showing hiring cities"
              >
                {/* Clean Stylized Outline Path of India */}
                <path
                  d="M340,90 
                     C360,60 410,40 450,50 
                     C480,60 520,100 530,140 
                     C540,170 510,190 490,210 
                     C520,230 560,240 600,245 
                     C640,250 710,240 760,260 
                     C820,280 870,260 910,290 
                     C940,320 930,370 890,390 
                     C850,400 810,380 770,390 
                     C740,400 720,440 710,480 
                     C720,530 750,570 780,610 
                     C750,650 710,700 660,740 
                     C620,770 570,810 540,860 
                     C500,920 460,980 430,1040 
                     C410,1070 380,1050 370,1010 
                     C350,940 330,880 320,810 
                     C310,740 280,680 270,610 
                     C250,560 210,530 180,510 
                     C150,490 170,440 210,430 
                     C250,420 280,390 290,350 
                     C300,300 270,260 260,220 
                     C250,170 300,120 340,90 Z"
                  fill="#FDF8F3"
                  stroke="#E8630A"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  className="transition-colors duration-200"
                />

                {/* Subtle State-Level Division Guides */}
                <path
                  d="M320,350 Q450,370 600,340 M280,520 Q440,510 650,530 M300,690 Q440,680 580,700 M330,820 Q430,840 500,860"
                  fill="none"
                  stroke="#E5D9CF"
                  strokeWidth="1.5"
                  strokeDasharray="4,6"
                />

                {/* 12 Geographically Plausible City Pins */}
                {cities.map((city) => {
                  const isSelected = city.id === selectedCityId;
                  const isHovered = city.id === hoveredCityId;
                  const adjustedJobs = Math.round(city.jobCount * filterMultiplier);

                  // Dynamic radius scaling with job count (min 14, max 26)
                  const radius = Math.min(26, Math.max(14, 12 + (adjustedJobs / 1842) * 14));

                  return (
                    <g
                      key={city.id}
                      transform={`translate(${city.x}, ${city.y})`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredCityId(city.id)}
                      onMouseLeave={() => setHoveredCityId(null)}
                      onClick={() => handleCitySelect(city)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${city.name}: ${adjustedJobs} jobs`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCitySelect(city);
                        }
                      }}
                    >
                      {/* Pulse Circle Animation on Hover or Active */}
                      {(isSelected || isHovered) && (
                        <circle
                          r={radius * 1.8}
                          fill="#E8630A"
                          className="animate-pin-pulse"
                        />
                      )}

                      {/* Outer Ring */}
                      <circle
                        r={radius}
                        fill={isSelected ? '#E8630A' : '#FFFDF9'}
                        stroke="#E8630A"
                        strokeWidth={isSelected ? '4' : '3'}
                        className="transition-all duration-200 group-hover:scale-110 shadow-md"
                      />

                      {/* Inner Dot / Count */}
                      <circle
                        r={radius * 0.4}
                        fill={isSelected ? '#FFFDF9' : '#E8630A'}
                      />

                      {/* City Name Label Below Pin */}
                      <text
                        y={radius + 18}
                        textAnchor="middle"
                        className={`text-[15px] font-bold select-none transition-colors duration-150 ${
                          isSelected ? 'fill-[#E8630A]' : 'fill-[#171614] group-hover:fill-[#E8630A]'
                        }`}
                      >
                        {city.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Side Panel / Bottom Sheet Drawer on Mobile */}
        {drawerOpen && selectedCity && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-[#171614]/50 backdrop-blur-xs transition-opacity"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-city-title"
          >
            <div className="w-full max-w-lg bg-[#FFFDF9] border-l border-[#E5D9CF] h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in slide-in-from-right duration-200">
              {/* Close Drawer Button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full text-[#62564E] hover:text-[#171614] hover:bg-[#FAF7F2] transition-colors"
                aria-label="Close details drawer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* City Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCEFE6] text-[#E8630A]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedCity.state}</span>
                </div>
                <h3
                  id="drawer-city-title"
                  className="text-3xl font-editorial font-bold text-[#171614]"
                >
                  {selectedCity.name}
                </h3>
                <p className="text-sm text-[#62564E]">
                  {selectedCity.description}
                </p>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF]">
                <div>
                  <div className="text-xs text-[#8C7E74]">Total Open Roles</div>
                  <div className="text-2xl font-editorial font-bold text-[#E8630A]">
                    {Math.round(selectedCity.jobCount * filterMultiplier).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#8C7E74]">Verified Companies</div>
                  <div className="text-2xl font-editorial font-bold text-[#171614]">
                    {selectedCity.companyCount} orgs
                  </div>
                </div>
              </div>

              {/* Top Sectors Chips */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8C7E74]">
                  Top Hiring Sectors
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCity.topSectors.map((sector) => (
                    <span
                      key={sector}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-[#FFFDF9] border border-[#E5D9CF] text-[#171614]"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>

              {/* Companies List */}
              <div className="space-y-4 pt-2 border-t border-[#E5D9CF]">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#171614] uppercase tracking-wider">
                    Hiring Companies in {selectedCity.name}
                  </h4>
                  <span className="text-xs text-[#8C7E74]">Click to view open jobs</span>
                </div>

                <div className="space-y-3">
                  {cityCompanies.map((co) => {
                    const isExpanded = expandedCompanyId === co.id;

                    return (
                      <div
                        key={co.id}
                        className="rounded-2xl border border-[#E5D9CF] bg-[#FAF7F2] p-4 transition-all duration-150 space-y-3"
                      >
                        <div
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => setExpandedCompanyId(isExpanded ? null : co.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                              {co.monogram}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#171614] flex items-center gap-2">
                                <span>{co.name}</span>
                                {co.hiringNow && (
                                  <span className="w-2 h-2 rounded-full bg-[#1d7d4d]" title="Hiring now" />
                                )}
                              </div>
                              <div className="text-xs text-[#62564E]">{co.industry}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#E8630A]">
                              {co.openRolesCount} open roles
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-[#8C7E74] transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-[#E8630A]' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Culture Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {co.cultureTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FFFDF9] border border-[#E5D9CF] text-[#62564E]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Expandable Open Jobs in Company */}
                        {isExpanded && co.jobs && co.jobs.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-[#E5D9CF]/70 animate-in fade-in duration-150">
                            {co.jobs.map((job) => (
                              <div
                                key={job.id}
                                className="p-3 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="font-semibold text-xs text-[#171614]">
                                    {job.title}
                                  </div>
                                  <span className="text-[11px] font-bold text-[#E8630A]">
                                    ₹{job.salaryMinLpa}-{job.salaryMaxLpa} LPA
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-[10px] text-[#62564E]">
                                  <span>{job.experience}</span>
                                  <span>·</span>
                                  <span>{job.workMode}</span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {job.postedTime}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onOpenSignInModal(`Sign in to apply to ${job.title}`)}
                                  className="w-full mt-1 py-1.5 rounded-lg bg-[#E8630A] hover:bg-[#D05300] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <span>View Job</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
