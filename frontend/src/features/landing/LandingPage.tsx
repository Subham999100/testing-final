// ============================================================
// Clyptus Landing Page - Main Container
// Scoped under .landing-root. Renders sticky navbar, hero, and lazy-loaded
// sections with accessible skeletons, modals, and client-side mock services.
// ============================================================

import React, { useState, useEffect, Suspense, lazy } from 'react';
import './styles/landing.css';
import { Navbar } from './components/sections/Navbar';
import { Hero } from './components/sections/Hero';
import { SignInPromptModal } from './components/shared/SignInPromptModal';
import { ComingSoonModal } from './components/shared/ComingSoonModal';
import { SkeletonCard } from './components/shared/SkeletonCard';

import {
  getCities,
  getJobs,
  getCompanies,
  getSwipeJobs,
  getRoleCategories,
  getTestimonials,
  getFaqs,
  getCareerResources,
} from './services/landingApi';
import {
  City,
  Company,
  Job,
  RoleCategory,
  Testimonial,
  FaqItem,
  CareerResource,
  JobFilters,
} from './types';

// Lazy-load below-the-fold sections to ensure high Lighthouse scores
const MapSection = lazy(() =>
  import('./components/sections/MapSection').then((m) => ({ default: m.MapSection })),
);
const SwipeSection = lazy(() =>
  import('./components/sections/SwipeSection').then((m) => ({ default: m.SwipeSection })),
);
const AtsSection = lazy(() =>
  import('./components/sections/AtsSection').then((m) => ({ default: m.AtsSection })),
);
const ResumeBuilderSection = lazy(() =>
  import('./components/sections/ResumeBuilderSection').then((m) => ({
    default: m.ResumeBuilderSection,
  })),
);
const VideoProfileSection = lazy(() =>
  import('./components/sections/VideoProfileSection').then((m) => ({
    default: m.VideoProfileSection,
  })),
);
const VideoInterviewSection = lazy(() =>
  import('./components/sections/VideoInterviewSection').then((m) => ({
    default: m.VideoInterviewSection,
  })),
);
const JobsSection = lazy(() =>
  import('./components/sections/JobsSection').then((m) => ({ default: m.JobsSection })),
);
const CompaniesSection = lazy(() =>
  import('./components/sections/CompaniesSection').then((m) => ({
    default: m.CompaniesSection,
  })),
);
const StatsStrip = lazy(() =>
  import('./components/sections/StatsStrip').then((m) => ({ default: m.StatsStrip })),
);
const MatchingEngineSection = lazy(() =>
  import('./components/sections/MatchingEngineSection').then((m) => ({
    default: m.MatchingEngineSection,
  })),
);
const ApplicationTrackerSection = lazy(() =>
  import('./components/sections/ApplicationTrackerSection').then((m) => ({
    default: m.ApplicationTrackerSection,
  })),
);
const HowItWorksSection = lazy(() =>
  import('./components/sections/HowItWorksSection').then((m) => ({
    default: m.HowItWorksSection,
  })),
);
const TestimonialsSection = lazy(() =>
  import('./components/sections/TestimonialsSection').then((m) => ({
    default: m.TestimonialsSection,
  })),
);
const ResourcesSection = lazy(() =>
  import('./components/sections/ResourcesSection').then((m) => ({
    default: m.ResourcesSection,
  })),
);
const FaqSection = lazy(() =>
  import('./components/sections/FaqSection').then((m) => ({ default: m.FaqSection })),
);
const CtaSection = lazy(() =>
  import('./components/sections/CtaSection').then((m) => ({ default: m.CtaSection })),
);
const Footer = lazy(() =>
  import('./components/sections/Footer').then((m) => ({ default: m.Footer })),
);

export const LandingPage: React.FC = () => {
  // Data state
  const [cities, setCities] = useState<City[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [swipeJobs, setSwipeJobs] = useState<Job[]>([]);
  const [roleCategories, setRoleCategories] = useState<RoleCategory[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [resources, setResources] = useState<CareerResource[]>([]);

  // Search filter state
  const [activeFilterSummary, setActiveFilterSummary] = useState<string>('');

  // Modals state
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [signInModalTitle, setSignInModalTitle] = useState('Create a free profile to continue');
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false);
  const [comingSoonFeatureName, setComingSoonFeatureName] = useState('This feature');

  // Load mock data on mount
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      const [c, j, comp, sJobs, cats, t, f, r] = await Promise.all([
        getCities(),
        getJobs(),
        getCompanies(),
        getSwipeJobs(),
        getRoleCategories(),
        getTestimonials(),
        getFaqs(),
        getCareerResources(),
      ]);

      if (mounted) {
        setCities(c);
        setJobs(j);
        setFilteredJobs(j);
        setCompanies(comp);
        setSwipeJobs(sJobs);
        setRoleCategories(cats);
        setTestimonials(t);
        setFaqs(f);
        setResources(r);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleHeroSearch = async (keyword: string, location: string) => {
    const filters: JobFilters = {};
    if (keyword.trim()) filters.keyword = keyword.trim();
    if (location.trim()) filters.city = location.trim();

    const results = await getJobs(filters);
    setFilteredJobs(results);

    const parts = [];
    if (keyword.trim()) parts.push(`"${keyword.trim()}"`);
    if (location.trim()) parts.push(`in ${location.trim()}`);
    setActiveFilterSummary(parts.join(' '));
  };

  const handleClearFilter = () => {
    setFilteredJobs(jobs);
    setActiveFilterSummary('');
  };

  const handleOpenSignInModal = (title?: string) => {
    if (title) setSignInModalTitle(title);
    setSignInModalOpen(true);
  };

  const handleOpenComingSoonModal = (featureName?: string) => {
    if (featureName) setComingSoonFeatureName(featureName);
    setComingSoonModalOpen(true);
  };

  const availableCityNames = cities.map((c) => c.name);

  return (
    <div className="landing-root min-h-screen flex flex-col">
      {/* 3.1 Sticky Navbar */}
      <Navbar
        onOpenSignInModal={handleOpenSignInModal}
        onOpenComingSoonModal={handleOpenComingSoonModal}
      />

      {/* 3.2 Hero Section */}
      <main className="flex-1 flex flex-col">
        <Hero
          onSearch={handleHeroSearch}
          availableCities={availableCityNames}
        />

        {/* 3.3 India Map Section */}
        <Suspense fallback={<SkeletonCard height="h-[600px]" className="max-w-7xl mx-auto my-12" />}>
          {cities.length > 0 && (
            <MapSection
              cities={cities}
              onOpenSignInModal={handleOpenSignInModal}
            />
          )}
        </Suspense>

        {/* 3.4 Swipe to Apply */}
        <Suspense fallback={<SkeletonCard height="h-[480px]" className="max-w-7xl mx-auto my-12" />}>
          {swipeJobs.length > 0 && (
            <SwipeSection
              initialJobs={swipeJobs}
              onOpenSignInModal={handleOpenSignInModal}
            />
          )}
        </Suspense>

        {/* 3.5 ATS Score Checker */}
        <Suspense fallback={<SkeletonCard height="h-[450px]" className="max-w-7xl mx-auto my-12" />}>
          <AtsSection onOpenSignInModal={handleOpenSignInModal} />
        </Suspense>

        {/* 3.6 ATS Resume Builder */}
        <Suspense fallback={<SkeletonCard height="h-[520px]" className="max-w-7xl mx-auto my-12" />}>
          <ResumeBuilderSection onOpenSignInModal={handleOpenSignInModal} />
        </Suspense>

        {/* 3.7 AI Video Profile */}
        <Suspense fallback={<SkeletonCard height="h-[480px]" className="max-w-7xl mx-auto my-12" />}>
          <VideoProfileSection />
        </Suspense>

        {/* 3.8 AI Video Interview */}
        <Suspense fallback={<SkeletonCard height="h-[480px]" className="max-w-7xl mx-auto my-12" />}>
          <VideoInterviewSection />
        </Suspense>

        {/* 3.9 Open Roles Carousel */}
        <Suspense fallback={<SkeletonCard height="h-[420px]" className="max-w-7xl mx-auto my-12" />}>
          <JobsSection
            jobs={filteredJobs}
            onOpenSignInModal={handleOpenSignInModal}
            activeFilterSummary={activeFilterSummary}
            onClearFilter={handleClearFilter}
          />
        </Suspense>

        {/* 3.10 Browse by Role Type & Top Companies */}
        <Suspense fallback={<SkeletonCard height="h-[500px]" className="max-w-7xl mx-auto my-12" />}>
          {roleCategories.length > 0 && (
            <CompaniesSection
              categories={roleCategories}
              companies={companies}
              onOpenSignInModal={handleOpenSignInModal}
              onSelectCategory={(catName) => {
                handleHeroSearch(catName, '');
              }}
            />
          )}
        </Suspense>

        {/* 3.11 Stats Strip */}
        <Suspense fallback={<SkeletonCard height="h-64" className="max-w-7xl mx-auto my-12" />}>
          <StatsStrip />
        </Suspense>

        {/* 3.12 Matching Engine */}
        <Suspense fallback={<SkeletonCard height="h-[450px]" className="max-w-7xl mx-auto my-12" />}>
          <MatchingEngineSection onOpenSignInModal={handleOpenSignInModal} />
        </Suspense>

        {/* 3.13 Application Tracker */}
        <Suspense fallback={<SkeletonCard height="h-[400px]" className="max-w-7xl mx-auto my-12" />}>
          <ApplicationTrackerSection />
        </Suspense>

        {/* 3.14 How It Works */}
        <Suspense fallback={<SkeletonCard height="h-[360px]" className="max-w-7xl mx-auto my-12" />}>
          <HowItWorksSection />
        </Suspense>

        {/* 3.15 Testimonials */}
        <Suspense fallback={<SkeletonCard height="h-[380px]" className="max-w-7xl mx-auto my-12" />}>
          {testimonials.length > 0 && (
            <TestimonialsSection testimonials={testimonials} />
          )}
        </Suspense>

        {/* 3.16 Career Resources */}
        <Suspense fallback={<SkeletonCard height="h-[380px]" className="max-w-7xl mx-auto my-12" />}>
          {resources.length > 0 && (
            <ResourcesSection
              resources={resources}
              onOpenComingSoonModal={handleOpenComingSoonModal}
            />
          )}
        </Suspense>

        {/* 3.17 FAQ Accordion */}
        <Suspense fallback={<SkeletonCard height="h-[450px]" className="max-w-7xl mx-auto my-12" />}>
          {faqs.length > 0 && <FaqSection faqs={faqs} />}
        </Suspense>

        {/* 3.18 Final CTA Banner & Recruiter Banner */}
        <Suspense fallback={<SkeletonCard height="h-72" className="max-w-7xl mx-auto my-12" />}>
          <CtaSection onOpenComingSoonModal={handleOpenComingSoonModal} />
        </Suspense>
      </main>

      {/* 3.19 Footer */}
      <Suspense fallback={<div className="h-64 bg-[#171614]" />}>
        <Footer onOpenComingSoonModal={handleOpenComingSoonModal} />
      </Suspense>

      {/* Shared Interactive Modals */}
      <SignInPromptModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
        title={signInModalTitle}
      />

      <ComingSoonModal
        isOpen={comingSoonModalOpen}
        onClose={() => setComingSoonModalOpen(false)}
        featureName={comingSoonFeatureName}
      />
    </div>
  );
};

export default LandingPage;
