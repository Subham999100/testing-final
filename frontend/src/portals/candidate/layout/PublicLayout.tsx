// ============================================================
// Clyptus Job Portal - Candidate Portal
// Layout: PublicLayout
// Provides standard header, outlet container, and footer
// ============================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import '../candidate.css';

export const PublicLayout: React.FC = () => {
  return (
    <div className="candidate-portal flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
