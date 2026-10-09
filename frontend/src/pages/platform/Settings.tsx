// ============================================================
// Clyptus Job Portal - Platform Global Settings & Integrations
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  Server,
  CreditCard,
  Search,
  Mail,
  Cpu,
  Lock,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { PlatformSetting } from '../../types/platform.types';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    PlatformService.getSettings()
      .then((data) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (setting: PlatformSetting) => {
    if (typeof setting.value !== 'boolean') return;
    setSavingKey(setting.key);
    try {
      const updated = await PlatformService.updateSetting(setting.key, !setting.value);
      setSettings(settings.map((s) => (s.key === setting.key ? updated : s)));
    } catch (err: any) {
      alert(`Failed to update setting: ${err.message}`);
    } finally {
      setSavingKey(null);
    }
  };

  const integrations = [
    { name: 'Razorpay Payment Gateway', key: 'INTEGRATION_RAZORPAY_ACTIVE', icon: CreditCard },
    { name: 'Stripe Global Gateway', key: 'INTEGRATION_STRIPE_ACTIVE', icon: CreditCard },
    { name: 'OpenSearch Synchronizer', key: 'INTEGRATION_OPEN_SEARCH_ACTIVE', icon: Search },
    { name: 'Google Gemini AI Services', key: 'INTEGRATION_GEMINI_AI', icon: Cpu },
    { name: 'SMTP Platform Emailer', key: 'INTEGRATION_SMTP_ACTIVE', icon: Mail },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Platform Configuration</h1>
        <p className="text-xs text-muted mt-1">
          Root platform settings, gateway switches, and infrastructure connectivity controls.
        </p>
      </div>

      {/* INTEGRATIONS GRID */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-action" />
          <h3 className="text-sm font-bold text-ink">External Service Adapters & Integrations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((item) => {
            const Icon = item.icon;
            const setting = settings.find((s) => s.key === item.key);
            const isActive = setting ? Boolean(setting.value) : true;

            return (
              <div
                key={item.name}
                className="p-4 rounded-xl bg-soft border border-line flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-soft text-action">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-ink block">{item.name}</span>
                    <span className="text-[10px] text-muted font-mono">
                      {setting?.key || 'INTEGRATION_READY'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingKey === item.key}
                  onClick={() => setting && handleToggle(setting)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-success-soft text-success border border-success'
                      : 'bg-soft text-muted border border-line-strong'
                  }`}
                >
                  {savingKey === item.key ? 'Saving...' : isActive ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* GENERAL CONFIGURATION SETTINGS */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <h3 className="text-sm font-bold text-ink">Core Platform Parameters</h3>
        <div className="divide-y divide-line">
          {settings
            .filter((s) => s.category !== 'INTEGRATION')
            .map((s) => (
              <div key={s.key} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-ink block font-mono">{s.key}</span>
                  <span className="text-muted text-[11px] block">{s.description}</span>
                </div>
                <div>
                  {typeof s.value === 'boolean' ? (
                    <button
                      onClick={() => handleToggle(s)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        s.value
                          ? 'bg-success-soft text-success border border-success'
                          : 'bg-soft text-muted border border-line-strong'
                      }`}
                    >
                      {s.value ? 'Active' : 'Inactive'}
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded bg-soft text-ink font-mono text-xs">
                      {String(s.value)}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
