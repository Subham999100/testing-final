// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: VideoRecordModal
// Camera & mic live recording flow with 3-2-1 countdown,
// 30s min / 3min max timer, progress bar, fallback MIME recording,
// review preview, tips box, and consent verification
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Upload,
  Video,
  VideoOff,
  Volume2,
  X,
} from 'lucide-react';
import {
  MAX_SECONDS,
  MIN_SECONDS,
} from '../../../../lib/video-profile.constants';

interface VideoRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File, durationSeconds: number) => Promise<void> | void;
  isUploading?: boolean;
  uploadProgress?: number;
}

type RecordState =
  | 'PERMISSION_PROMPT'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'UNSUPPORTED'
  | 'READY'
  | 'COUNTDOWN'
  | 'RECORDING'
  | 'STOPPED'
  | 'REVIEW';

export const VideoRecordModal: React.FC<VideoRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [recordState, setRecordState] = useState<RecordState>('PERMISSION_PROMPT');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(true);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);

  // Stop all active tracks and reset
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Request camera and microphone access
  const requestMedia = useCallback(async () => {
    cleanupStream();
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecordState('UNSUPPORTED');
      setErrorMessage(
        'Your browser does not support camera/microphone recording. Please try modern Chrome, Firefox, Safari, or Edge.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      setRecordState('READY');

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecordState('PERMISSION_DENIED');
        setErrorMessage(
          'Camera or microphone permission was blocked. Please click the camera/lock icon in your browser address bar to allow permissions, then retry.',
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setRecordState('DEVICE_NOT_FOUND');
        setErrorMessage(
          'No camera or microphone was detected on your system. Please connect a working webcam and microphone to continue.',
        );
      } else {
        setRecordState('PERMISSION_DENIED');
        setErrorMessage(
          err.message || 'Unable to access camera and microphone. Please check your system settings.',
        );
      }
    }
  }, [cleanupStream]);

  // Initialize or teardown when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRecordState('PERMISSION_PROMPT');
      setRecordedBlob(null);
      setRecordedUrl(null);
      setElapsedSeconds(0);
      setConsentChecked(false);
      void requestMedia();
    } else {
      cleanupStream();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    }

    return () => {
      cleanupStream();
    };
  }, [isOpen, requestMedia, cleanupStream]);

  // Keep live preview attached to video element
  useEffect(() => {
    if (
      (recordState === 'READY' || recordState === 'COUNTDOWN' || recordState === 'RECORDING') &&
      liveVideoRef.current &&
      streamRef.current
    ) {
      if (liveVideoRef.current.srcObject !== streamRef.current) {
        liveVideoRef.current.srcObject = streamRef.current;
        liveVideoRef.current.play().catch(() => {});
      }
    }
  }, [recordState]);

  // Start 3-2-1 Countdown
  const handleStartCountdown = () => {
    setRecordState('COUNTDOWN');
    setCountdown(3);

    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        clearInterval(interval);
        startActualRecording();
      }
    }, 1000);
  };

  // Pick supported MIME type with fallback chain
  const getSupportedMimeType = (): string => {
    const candidateTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
    ];

    for (const t of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Start actual MediaRecorder recording
  const startActualRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    const mimeType = getSupportedMimeType();

    try {
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(streamRef.current, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedUrl(url);
        setRecordState('REVIEW');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500); // 500ms chunk slices

      setRecordState('RECORDING');
      setElapsedSeconds(0);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Auto-stop at 3:00 (180s)
          if (next >= MAX_SECONDS) {
            handleStopRecording();
            return MAX_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(`Failed to start recording: ${err.message}`);
      setRecordState('READY');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Reset to re-record
  const handleReRecord = () => {
    setUploadError(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    setElapsedSeconds(0);
    void requestMedia();
  };

  // Confirm and upload
  const handleConfirmUseVideo = async () => {
    if (!recordedBlob || !consentChecked || isUploading) return;

    const videoFile = new File([recordedBlob], 'video-profile.webm', {
      type: recordedBlob.type || 'video/webm',
    });

    setUploadError(null);
    try {
      await onSave(videoFile, elapsedSeconds);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to upload video.';
      const resolved = Array.isArray(msg) ? msg.join(', ') : String(msg);
      setUploadError(resolved);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  const minReached = elapsedSeconds >= MIN_SECONDS;
  const progressPercent = Math.min(100, (elapsedSeconds / MAX_SECONDS) * 100);
  const minPercent = (MIN_SECONDS / MAX_SECONDS) * 100; // ~16.6%

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-[#E8DFD4] shadow-2xl overflow-hidden flex flex-col text-[#1B1A17]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD4] bg-[#FAF6F1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C]">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 id="record-modal-title" className="text-base sm:text-lg font-serif font-semibold text-[#1B1A17]">
                Record AI Video Profile
              </h3>
              <p className="text-xs text-[#5C564E]">
                30 seconds minimum &middot; 3 minutes maximum
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close record modal"
            className="p-1.5 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#E8DFD4]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tips Box (Expandable / Dismissible) */}
        {showTips && recordState === 'READY' && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-[#FFF8EE] border border-[#FDBA74]/50 text-xs text-[#7C2D12] flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-[#9A3412]">Tips for a Standout Video Profile:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[#5C564E]">
                <li><strong className="text-[#1B1A17]">Introduce yourself</strong> clearly: name, core background, and top skills.</li>
                <li><strong className="text-[#1B1A17]">Share your goal</strong>: what kind of roles and impact you are targeting next.</li>
                <li><strong className="text-[#1B1A17]">Lighting & quiet</strong>: face a light source; record in a quiet room with minimal echo.</li>
                <li><strong className="text-[#1B1A17]">Pace yourself</strong>: speak naturally at 120-150 words per minute.</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowTips(false)}
              className="text-[#9A3412] hover:text-[#7C2D12] text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Video Viewport */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-[#1B1A17] rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-[#E8DFD4]">
            {/* Live Camera Feed */}
            {(recordState === 'READY' ||
              recordState === 'COUNTDOWN' ||
              recordState === 'RECORDING') && (
              <video
                ref={liveVideoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}

            {/* Review Preview */}
            {recordState === 'REVIEW' && recordedUrl && (
              <video
                ref={reviewVideoRef}
                src={recordedUrl}
                playsInline
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}

            {/* Countdown Overlay */}
            {recordState === 'COUNTDOWN' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                <span className="text-7xl font-bold text-white font-serif animate-ping">
                  {countdown}
                </span>
              </div>
            )}

            {/* Recording Active Pill */}
            {recordState === 'RECORDING' && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-xs font-semibold border border-red-500/40">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span>REC {formatTime(elapsedSeconds)}</span>
              </div>
            )}

            {/* Error / Permission Prompt States */}
            {(recordState === 'PERMISSION_PROMPT' ||
              recordState === 'PERMISSION_DENIED' ||
              recordState === 'DEVICE_NOT_FOUND' ||
              recordState === 'UNSUPPORTED') && (
              <div className="p-6 text-center text-white max-w-md space-y-3 z-10">
                <div className="w-12 h-12 rounded-full bg-white/10 mx-auto flex items-center justify-center text-[#F97316]">
                  {recordState === 'PERMISSION_PROMPT' ? (
                    <Camera className="w-6 h-6 animate-pulse" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-red-400" />
                  )}
                </div>

                <div className="text-sm font-semibold text-white">
                  {recordState === 'PERMISSION_PROMPT'
                    ? 'Requesting Camera and Microphone...'
                    : 'Access Needed to Record'}
                </div>

                {errorMessage && (
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {errorMessage}
                  </p>
                )}

                {recordState !== 'PERMISSION_PROMPT' && (
                  <button
                    type="button"
                    onClick={() => void requestMedia()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar & Min/Max Indicators during recording */}
          {recordState === 'RECORDING' && (
            <div className="w-full mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#5C564E]">
                <span className="font-mono font-medium">{formatTime(elapsedSeconds)}</span>
                <span className="text-[11px]">
                  {minReached ? (
                    <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Minimum duration met
                    </span>
                  ) : (
                    <span className="text-[#C2410C] font-semibold">
                      Record at least {MIN_SECONDS - elapsedSeconds}s more
                    </span>
                  )}
                </span>
                <span className="font-mono text-[#5C564E]">3:00 max</span>
              </div>

              {/* Bar */}
              <div className="relative w-full h-2.5 bg-[#E8DFD4] rounded-full overflow-hidden">
                {/* 30s min indicator marker line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#9A3412] z-10"
                  style={{ left: `${minPercent}%` }}
                  title="30s minimum marker"
                />
                {/* Progress fill */}
                <div
                  className={`h-full transition-all duration-300 ${
                    minReached ? 'bg-[#16A34A]' : 'bg-[#C2410C]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Review Duration & Details */}
          {recordState === 'REVIEW' && (
            <div className="w-full mt-4 p-3 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4] flex items-center justify-between text-xs text-[#5C564E]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C2410C]" />
                <span>
                  Recorded duration: <strong className="text-[#1B1A17]">{formatTime(elapsedSeconds)}</strong>
                </span>
              </div>
              <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload
              </span>
            </div>
          )}

          {/* Mandatory Consent Checkbox before Upload */}
          {recordState === 'REVIEW' && (
            <div className="w-full mt-3.5 p-3 rounded-xl bg-white border border-[#E8DFD4] flex items-start gap-2.5 text-xs text-[#1B1A17]">
              <input
                id="consent-record-check"
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C] border-[#D7C9BA] cursor-pointer"
              />
              <label htmlFor="consent-record-check" className="cursor-pointer select-none leading-relaxed">
                I agree my video and its AI-generated analysis can be viewed by recruiters.
              </label>
            </div>
          )}

          {/* Upload Progress Bar */}
          {recordState === 'REVIEW' && isUploading && (
            <div className="w-full mt-3.5 space-y-1.5 p-3 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4]">
              <div className="flex items-center justify-between text-xs text-[#5C564E]">
                <span className="font-medium text-[#1B1A17]">Uploading video profile...</span>
                <span className="font-mono font-semibold text-[#C2410C]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#E8DFD4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C2410C] transition-all duration-200"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Alert on Upload Failure with Retry */}
          {recordState === 'REVIEW' && uploadError && (
            <div className="w-full mt-3.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="font-semibold text-red-800">Upload failed</div>
                  <div className="leading-relaxed">{uploadError}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmUseVideo}
                disabled={isUploading}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>


        {/* Modal Footer Actions */}
        <div className="px-5 py-4 border-t border-[#E8DFD4] bg-[#FAF6F1] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl border border-[#D7C9BA] text-[#5C564E] hover:text-[#1B1A17] hover:bg-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {recordState === 'READY' && (
              <button
                type="button"
                onClick={handleStartCountdown}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Recording</span>
              </button>
            )}

            {recordState === 'RECORDING' && (
              <button
                type="button"
                disabled={!minReached}
                onClick={handleStopRecording}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                  minReached
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-[#D7C9BA] text-white/80 cursor-not-allowed'
                }`}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{minReached ? 'Stop Recording' : `Stop (${MIN_SECONDS - elapsedSeconds}s left)`}</span>
              </button>
            )}

            {recordState === 'REVIEW' && (
              <>
                <button
                  type="button"
                  onClick={handleReRecord}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D7C9BA] text-[#5C564E] hover:text-[#1B1A17] hover:bg-white text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-record</span>
                </button>

                <button
                  type="button"
                  disabled={!consentChecked || isUploading}
                  onClick={handleConfirmUseVideo}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                    consentChecked && !isUploading
                      ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white cursor-pointer'
                      : 'bg-[#D7C9BA] text-white/80 cursor-not-allowed'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{uploadProgress > 0 ? `Uploading (${uploadProgress}%)` : 'Uploading...'}</span>
                    </>
                  ) : uploadError ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Upload</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Use This Video</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
