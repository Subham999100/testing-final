// ============================================================
// Clyptus Landing Page - ComingSoonModal
// Informs users about features or resources under active rollout.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { X, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  description?: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  featureName = 'This feature',
  description = 'Our engineering team is actively rolling this capability out to candidate cohorts across India.',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubscribed(false);
      setEmail('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171614]/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#FFFDF9] border border-[#E5D9CF] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#62564E] hover:text-[#171614] hover:bg-[#F4EFEA] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] flex items-center justify-center text-[#E8630A]">
            <Clock className="w-6 h-6" />
          </div>
          <h3
            id="coming-soon-title"
            className="text-2xl font-editorial font-bold text-[#171614]"
          >
            {featureName} is Coming Soon
          </h3>
          <p className="text-sm text-[#62564E] leading-relaxed">
            {description}
          </p>
        </div>

        {subscribed ? (
          <div className="p-4 rounded-xl bg-[#EAF7EE] border border-[#1d7d4d]/30 text-[#1d7d4d] flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Thank you! We'll notify you as soon as early access opens.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#62564E]">
              Get early access notification
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E5D9CF] bg-white text-sm text-[#171614] focus:outline-none focus:ring-2 focus:ring-[#E8630A]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-medium text-sm transition-colors"
              >
                Notify Me
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-[#E5D9CF] flex justify-between items-center text-xs">
          <span className="text-[#8C7E74]">Want to apply to live roles now?</span>
          <Link
            to="/register"
            onClick={onClose}
            className="text-[#E8630A] font-semibold flex items-center gap-1 hover:underline"
          >
            <span>Register free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
