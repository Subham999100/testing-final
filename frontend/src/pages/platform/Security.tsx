import { ErrorBox } from '../../components/platform/OperationsUI';
// ============================================================
// Clyptus Job Portal - Platform Security & Incident Governance
// Unified View for Platform Roles.
// Utilizes shared SecurityEventsTable & ResolveIncidentModal.
// ============================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { SecurityEvent } from '../../types/platform.types';
import { SecurityEventsTable } from '../../features/platform/security/SecurityEventsTable';
import { ResolveIncidentModal } from '../../features/platform/security/ResolveIncidentModal';

export const Security: React.FC = () => {
  const [loadError, setLoadError] = useState<any>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEvents = () => {
    setLoading(true);
    setLoadError(null);
    PlatformService.getSecurityEvents()
      .then((res) => setEvents(res.data))
      .catch(setLoadError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleResolveSubmit = async (notes: string) => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      await PlatformService.resolveSecurityEvent(selectedEvent.id, notes);
      setSelectedEvent(null);
      loadEvents();
    } catch (err: any) {
      alert(`Failed to resolve incident: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <ErrorBox error={loadError} retry={loadEvents} />}
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Security & Incident Response
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time anomaly detection, threat mitigation, and session governance.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-soft border border-success text-success text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>MFA Enforced Globally</span>
        </div>
      </div>

      {/* SECURITY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-surface border border-line">
          <span className="text-xs text-muted">Total Security Incidents</span>
          <div className="mt-2 text-2xl font-extrabold text-ink font-mono">{events.length}</div>
        </div>
        <div className="p-5 rounded-xl bg-surface border border-line">
          <span className="text-xs text-muted">Open Incidents</span>
          <div className="mt-2 text-2xl font-extrabold text-warning font-mono">
            {events.filter((e) => !e.isResolved).length}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-surface border border-line">
          <span className="text-xs text-muted">Resolved Incidents</span>
          <div className="mt-2 text-2xl font-extrabold text-success font-mono">
            {events.filter((e) => e.isResolved).length}
          </div>
        </div>
      </div>

      {/* Shared Reusable SECURITY EVENTS TABLE */}
      <SecurityEventsTable
        events={events}
        loading={loading}
        onResolveClick={(ev) => setSelectedEvent(ev)}
      />

      {/* Shared Reusable RESOLUTION MODAL */}
      <ResolveIncidentModal
        event={selectedEvent}
        isSubmitting={isSubmitting}
        onClose={() => setSelectedEvent(null)}
        onSubmit={handleResolveSubmit}
      />
    </div>
  );
};
