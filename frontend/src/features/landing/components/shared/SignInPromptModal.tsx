// ============================================================
// Clyptus Landing Page - SignInPromptModal
// Accessible dialog prompting candidates to register or login.
// Handles focus traps, ESC closing, and body scroll lock.
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface SignInPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  nextUrl?: string;
}

export const SignInPromptModal: React.FC<SignInPromptModalProps> = ({
  isOpen,
  onClose,
  title = 'Create a free profile to continue',
  subtitle = 'Unlock verified direct applications, interactive AI tool suites, and regional hiring discovery across India.',
  nextUrl = '/candidate/dashboard',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close on ESC key & trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on mount
    setTimeout(() => closeBtnRef.current?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const registerHref = `/register?next=${encodeURIComponent(nextUrl)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171614]/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-prompt-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#FFFDF9] border border-[#E5D9CF] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#62564E] hover:text-[#171614] hover:bg-[#F4EFEA] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Heading */}
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FCEFE6] border border-[#E8630A]/20 flex items-center justify-center text-[#E8630A]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3
            id="modal-prompt-title"
            className="text-2xl font-editorial font-bold text-[#171614] leading-tight"
          >
            {title}
          </h3>
          <p className="text-sm text-[#62564E] leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="space-y-3 pt-2">
          <Link
            to={registerHref}
            className="w-full py-3 px-5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors text-decoration-none"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to={loginHref}
            className="w-full py-2.5 px-5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-[#171614] font-medium text-sm flex items-center justify-center transition-colors text-decoration-none"
          >
            Sign in to existing account
          </Link>
        </div>

        {/* Trust Note */}
        <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-[#E5D9CF]/60 text-xs text-[#8C7E74]">
          <ShieldCheck className="w-4 h-4 text-[#1d7d4d]" />
          <span>No credit card required · Instant candidate profile setup</span>
        </div>
      </div>
    </div>
  );
};
