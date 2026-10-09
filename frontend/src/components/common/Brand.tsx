import React from 'react';
import { Sparkles } from 'lucide-react';
export function Brand({ subtitle = 'Platform Portal' }: { subtitle?: string }) {
  return <span className="brand"><span className="brand-mark"><Sparkles aria-hidden="true" /></span><span><span className="brand-name">Clyptus</span><span className="brand-subtitle">{subtitle}</span></span></span>;
}
