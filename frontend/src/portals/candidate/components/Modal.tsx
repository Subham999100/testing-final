// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: Modal
// Accessible modal dialog (desktop) & bottom sheet (mobile)
// Focus trap, Esc to close, focus return, dirty-state confirmation guard
// ============================================================

import React, { useEffect, useRef, useState, useId } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isDirty?: boolean;
  isSubmitting?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  saveLabel?: string;
  cancelLabel?: string;
  showFooter?: boolean;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  isDirty = false,
  isSubmitting = false,
  onSubmit,
  saveLabel = 'Save changes',
  cancelLabel = 'Cancel',
  showFooter = true,
  maxWidth = 'lg',
  children,
}) => {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      // Focus first focusable inside dialog
      const timer = setTimeout(() => {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  // Intercept close requests if dirty
  const handleRequestClose = () => {
    if (isSubmitting) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Keyboard navigation: Escape key & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        handleRequestClose();
      } else if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, isSubmitting]);

  // Prevent background scroll when modal open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  }[maxWidth];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          ref={modalRef}
          className={`bg-white w-full ${maxWidthStyles} rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#E8DFD4] max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 overflow-hidden`}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#E8DFD4] flex items-center justify-between bg-white shrink-0">
            <div>
              <h2 id={titleId} className="text-lg sm:text-xl font-semibold text-[#1B1A17] font-serif">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-[#5C564E] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form wrapper */}
          <form
            onSubmit={(e) => {
              if (onSubmit) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm text-[#1B1A17]">
              {children}
            </div>

            {/* Footer */}
            {showFooter && (
              <div className="p-4 sm:p-5 border-t border-[#E8DFD4] bg-[#FAF6F1]/50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[#E8DFD4] text-[#1B1A17] hover:bg-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : saveLabel}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Discard changes guard */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this section. Closing will discard them."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        variant="warning"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};
export default Modal;
