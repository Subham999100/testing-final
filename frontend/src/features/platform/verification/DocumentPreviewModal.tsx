// ============================================================
// Clyptus Job Portal - Document Preview Modal
// Authenticated private document streaming and in-browser preview
// ============================================================

import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

interface Props {
  applicationId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<Props> = ({
  applicationId,
  documentId,
  fileName,
  mimeType,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        const { blob } = await OrganisationApplicationService.fetchDocumentBlob(
          applicationId,
          documentId,
        );
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to stream document. Access may be restricted.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [applicationId, documentId]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isPdf = mimeType.includes('pdf');
  const isImage = mimeType.includes('image');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${fileName}`}
      className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-surface border border-line-strong rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-3.5 px-4 border-b border-line flex items-center justify-between bg-canvas/60">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-brand shrink-0" />
            <span className="font-semibold text-sm text-ink truncate">{fileName}</span>
            <span className="text-xs text-muted font-mono">({mimeType})</span>
          </div>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="button button-secondary button-small flex items-center gap-1.5"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-muted hover:text-ink hover:bg-soft"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-canvas p-4 overflow-auto flex items-center justify-center">
          {loading ? (
            <div className="text-center text-muted text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
              <span>Securely retrieving private document from platform vault...</span>
            </div>
          ) : error ? (
            <div className="max-w-md p-4 rounded-lg bg-danger-soft border border-danger text-danger text-xs text-center space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <div className="font-semibold">{error}</div>
            </div>
          ) : isPdf && blobUrl ? (
            <iframe
              src={blobUrl}
              title={fileName}
              className="w-full h-full rounded border border-line bg-surface"
            />
          ) : isImage && blobUrl ? (
            <div className="max-h-full max-w-full flex items-center justify-center p-2">
              <img
                src={blobUrl}
                alt={fileName}
                className="max-h-[70vh] max-w-full object-contain rounded border border-line shadow-xs"
              />
            </div>
          ) : (
            <div className="text-center p-6 bg-surface border border-line rounded-xl max-w-sm space-y-3">
              <FileText className="w-8 h-8 text-muted mx-auto" />
              <div className="text-xs text-muted">
                In-browser preview is not supported for this document type ({mimeType}). You can download it directly.
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="button button-primary button-small w-full flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
