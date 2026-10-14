# Clyptus Candidate Landing Page (`src/features/landing`)

A production-grade, highly polished candidate landing page for Clyptus built with React 18, TypeScript, TailwindCSS, and Framer Motion. Engineered with a warm editorial aesthetic (Burnt Orange `#E8630A`, Linen/Cream `#FAF7F2`, Ink text `#171614`, Fraunces serif headings, and DM Sans body typography).

---

## 1. Directory Structure

```
src/features/landing/
├── LandingPage.tsx                  # Root container mounting all 19 sections with lazy loading
├── index.ts                         # Barrel entry point
├── styles/
│   └── landing.css                  # Scoped CSS tokens and animations under `.landing-root`
├── types/
│   └── index.ts                     # TypeScript interfaces (City, Company, Job, AtsReport, etc.)
├── data/
│   └── mockData.ts                  # Fictional companies (~40), jobs (~120), 12 Indian cities, FAQs
├── services/
│   └── landingApi.ts                # Isolated mock API service layer with Promise delays
├── components/
│   ├── shared/
│   │   ├── Logo.tsx                 # Consistent Clyptus dynamic swirl mark & wordmark
│   │   ├── SectionHeading.tsx       # Eyebrow pill, Fraunces serif H2, and subheadings
│   │   ├── SignInPromptModal.tsx    # Accessible dialog prompting candidates to register/login
│   │   ├── ComingSoonModal.tsx      # Modal for features/recruiter links under rollout
│   │   └── SkeletonCard.tsx         # Accessible skeleton loaders for lazy-loaded sections
│   └── sections/
│       ├── Navbar.tsx               # 3.1: Sticky navbar with dropdown and mobile drawer
│       ├── Hero.tsx                 # 3.2: Hero with autocomplete search and SVG analytics visual
│       ├── MapSection.tsx           # 3.3: Interactive India map with 12 city pins and drawer
│       ├── SwipeSection.tsx         # 3.4: Swipe to Apply with Framer Motion drag gestures
│       ├── AtsSection.tsx           # 3.5: ATS Score Checker with client-side dropzone and gauge
│       ├── ResumeBuilderSection.tsx # 3.6: Live A4-style resume builder with template switchers
│       ├── VideoProfileSection.tsx  # 3.7: 3-minute video pitch recorder simulator
│       ├── VideoInterviewSection.tsx# 3.8: 15-minute AI technical interview simulator
│       ├── JobsSection.tsx          # 3.9: Horizontal scroll-snap carousel of 12 job cards
│       ├── CompaniesSection.tsx     # 3.10: 10 role categories and top 8 company cards
│       ├── StatsStrip.tsx           # 3.11: 4 journey metrics + illustrative platform stats
│       ├── MatchingEngineSection.tsx# 3.12: 3-stage matching flow with 96% match card
│       ├── ApplicationTrackerSection.tsx # 3.13: 5-stage real-time progress timeline
│       ├── HowItWorksSection.tsx    # 3.14: 4 numbered journey steps
│       ├── TestimonialsSection.tsx  # 3.15: 3 candidate reviews with mobile carousel
│       ├── ResourcesSection.tsx     # 3.16: 5 tactical career guide cards
│       ├── FaqSection.tsx           # 3.17: Accessible 8-question accordion
│       ├── CtaSection.tsx           # 3.18: High-impact gradient banner + recruiter banner
│       └── Footer.tsx               # 3.19: Dark warm editorial footer
```

---

## 2. How to Swap Mock Services for Real Backend APIs

All data consumption is decoupled through `src/features/landing/services/landingApi.ts`. Landing components never import raw data directly.

To connect to real backend endpoints in the future, edit only `src/features/landing/services/landingApi.ts`:

1. **Cities**:
   ```typescript
   // In getCities():
   // Replace mock return with:
   return await apiClient.get<City[]>('/candidate/discovery/cities');
   ```

2. **City Detail**:
   ```typescript
   // In getCityDetail(cityId):
   // Replace mock return with:
   return await apiClient.get(`/candidate/discovery/cities/${cityId}`);
   ```

3. **Jobs**:
   ```typescript
   // In getJobs(filters):
   // Replace mock return with:
   return await apiClient.get<Job[]>('/candidate/discovery/jobs', { params: filters });
   ```

4. **Companies**:
   ```typescript
   // In getCompanies():
   return await apiClient.get<Company[]>('/candidate/discovery/companies');
   ```

5. **Swipe Deck**:
   ```typescript
   // In getSwipeJobs():
   return await apiClient.get<Job[]>('/candidate/recommendations/swipe-deck');
   ```

6. **ATS Resume Analysis**:
   ```typescript
   // In getAtsReport(file):
   const formData = new FormData();
   formData.append('resume', file);
   return await apiClient.post<AtsReport>('/candidate/resume/ats-analyze', formData);
   ```

---

## 3. How to Restore the Legacy Landing Page

In `src/portals/candidate/CandidatePortal.tsx`:

1. Change:
   ```tsx
   <Route index element={<LandingPage />} />
   ```
   back to:
   ```tsx
   <Route element={<PublicLayout />}>
     <Route index element={<LegacyLanding />} />
     ...
   ```
2. The legacy `HomePage` component is preserved completely untouched at `src/portals/candidate/pages/public/HomePage.tsx`.
