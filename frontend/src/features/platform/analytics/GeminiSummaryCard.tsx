// ============================================================
// Clyptus Job Portal - Shared Gemini AI Summary Card
// Reusable across platform dashboards & analytics views.
// ============================================================

import React from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  summary: string;
}

export const GeminiSummaryCard: React.FC<Props> = ({ summary }) => {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-800/40 shadow-xl relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Gemini AI Platform Synthesis</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold font-mono">
              GENERATIVE INSIGHTS
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
};
