import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  Check,
  Ear,
  ExternalLink,
  Hand,
  Keyboard,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  Navigation,
  Phone,
  PhoneOff,
  Send,
  Volume2,
  X,
} from 'lucide-react';
import type {
  AlarmItem,
  ConnectionState,
  LocationNavigationCard,
  PendingConfirmation,
  TimerItem,
  TypingPreviewState,
} from '../types/live.ts';
import { formatDuration } from '../utils/audio.ts';

const SWATI_PORTRAIT_URL =
  '/assets/aistudio/file_00000000f6d082119a370d9fd90fb710_7f288609.png';

const QUICK_STARTERS = [
  'कोई बहुत मज़ेदार joke सुनाओ ना यार!',
  'YouTube खोलो और Arijit Singh के गाने चलाओ',
  'India Gate का रास्ता दिखाओ Maps में',
  'amazon.in खोलकर check करो और काम करो',
  'WhatsApp पर खुद type करके Good morning भेजो',
];

interface VoiceStageProps {
  connectionState: ConnectionState;
  isMuted: boolean;
  isMicAvailable: boolean;
  isSwatiSpeaking: boolean;
  wakeWordSupported: boolean;
  wakeWordEnabled: boolean;
  wakeWordListening: boolean;
  flashlightOn: boolean;
  userPetName: string;
  errorMessage: string | null;
  micNotice: string | null;
  sessionSeconds: number;
  timers: TimerItem[];
  alarms: AlarmItem[];
  pendingConfirmations: PendingConfirmation[];
  typingPreview: TypingPreviewState | null;
  lastNavCard: LocationNavigationCard | null;
  inputAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  outputAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onToggleWakeWord: () => void;
  onInterrupt: () => void;
  onDismissRinging: () => void;
  onApproveConfirmation: (id: string) => void;
  onCancelConfirmation: (id: string) => void;
  onDismissTypingPreview: () => void;
  onReopenLink: (url: string) => void;
  onSendText: (text: string) => void;
}

export function VoiceStage({
  connectionState,
  isMuted,
  isMicAvailable,
  isSwatiSpeaking,
  wakeWordSupported,
  wakeWordEnabled,
  wakeWordListening,
  flashlightOn,
  userPetName,
  errorMessage,
  micNotice,
  sessionSeconds,
  timers,
  alarms,
  pendingConfirmations,
  typingPreview,
  lastNavCard,
  inputAnalyserRef,
  outputAnalyserRef,
  onConnect,
  onDisconnect,
  onToggleMute,
  onToggleWakeWord,
  onInterrupt,
  onDismissRinging,
  onApproveConfirmation,
  onCancelConfirmation,
  onDismissTypingPreview,
  onReopenLink,
  onSendText,
}: VoiceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouthOpenRef = useRef<number>(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [draftText, setDraftText] = useState('');

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const ringingTimer = timers.find((t) => t.ringing);
  const ringingAlarm = alarms.find((a) => a.ringing);
  const hasRinging = Boolean(ringingTimer || ringingAlarm);
  const activeConfirmation = pendingConfirmations.find(
    (c) => c.status === 'pending'
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let rafId = 0;
    const bins = new Uint8Array(64);
    const voiceBins = new Uint8Array(64);

    const drawFrame = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = 312;
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = 114;

      const activeAnalyser = isSwatiSpeaking
        ? outputAnalyserRef.current
        : isConnected && !isMuted
          ? inputAnalyserRef.current
          : null;

      let energy = 0;
      if (activeAnalyser && !prefersReducedMotion) {
        activeAnalyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 0; i < 48; i++) {
          sum += bins[i];
        }
        energy = sum / (48 * 255);
      }

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + 24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 243, 238, 0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const barCount = 56;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const binIndex = i % 36;
        const magnitude =
          isConnected && activeAnalyser && !prefersReducedMotion
            ? bins[binIndex] / 255
            : 0;
        const barLength = isConnected ? 4 + magnitude * 26 + energy * 6 : 3;

        const x1 = cx + Math.cos(angle) * (baseRadius + 6);
        const y1 = cy + Math.sin(angle) * (baseRadius + 6);
        const x2 = cx + Math.cos(angle) * (baseRadius + 6 + barLength);
        const y2 = cy + Math.sin(angle) * (baseRadius + 6 + barLength);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        if (isSwatiSpeaking) {
          ctx.strokeStyle = `rgba(225, 75, 50, ${0.42 + magnitude * 0.58})`;
        } else if (isConnected && !isMuted && magnitude > 0.04) {
          ctx.strokeStyle = `rgba(245, 243, 238, ${0.32 + magnitude * 0.55})`;
        } else {
          ctx.strokeStyle = 'rgba(245, 243, 238, 0.12)';
        }
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();

      // Audio-reactive lip-sync mouth canvas aligned over Swati's lips (65.9% X, 38.3% Y, -15.3deg tilt)
      const mouthCanvas = mouthCanvasRef.current;
      if (mouthCanvas) {
        const mCtx = mouthCanvas.getContext('2d');
        if (mCtx) {
          const mw = 238;
          const mh = 260;
          if (
            mouthCanvas.width !== mw * dpr ||
            mouthCanvas.height !== mh * dpr
          ) {
            mouthCanvas.width = mw * dpr;
            mouthCanvas.height = mh * dpr;
          }

          let targetOpen = 0;
          if (
            isConnected &&
            isSwatiSpeaking &&
            outputAnalyserRef.current &&
            !prefersReducedMotion
          ) {
            outputAnalyserRef.current.getByteFrequencyData(voiceBins);
            let speechSum = 0;
            for (let k = 2; k < 24; k++) {
              speechSum += voiceBins[k];
            }
            const rawSpeech = speechSum / (22 * 255);
            // Boost speech formants slightly & add subtle syllable cadence
            targetOpen = Math.min(1, rawSpeech * 2.15);
          }

          // Fast attack, smooth close
          const smoothing = targetOpen > mouthOpenRef.current ? 0.55 : 0.28;
          mouthOpenRef.current =
            mouthOpenRef.current + (targetOpen - mouthOpenRef.current) * smoothing;

          mCtx.save();
          mCtx.scale(dpr, dpr);
          mCtx.clearRect(0, 0, mw, mh);

          const open = mouthOpenRef.current;
          if (open > 0.04) {
            const mx = mw * 0.659;
            const my = mh * 0.384;
            const halfW = mw * 0.036;
            const openH = mw * (0.004 + open * 0.025);

            mCtx.translate(mx, my);
            mCtx.rotate(-0.268); // -15.3 deg matching portrait head tilt

            // Soft skin blend around mouth opening
            mCtx.beginPath();
            mCtx.ellipse(0, openH * 0.25, halfW * 1.18, openH * 1.35 + 2.2, 0, 0, Math.PI * 2);
            mCtx.fillStyle = 'rgba(244, 174, 158, 0.38)';
            mCtx.fill();

            // Inner mouth cavity
            const cavityGrad = mCtx.createLinearGradient(0, -openH * 0.6, 0, openH * 1.1);
            cavityGrad.addColorStop(0, '#4A121E');
            cavityGrad.addColorStop(1, '#26060D');

            mCtx.save();
            mCtx.beginPath();
            mCtx.moveTo(-halfW, 0);
            mCtx.quadraticCurveTo(0, -openH * 0.55, halfW, 0);
            mCtx.quadraticCurveTo(0, openH * 1.35, -halfW, 0);
            mCtx.closePath();
            mCtx.fillStyle = cavityGrad;
            mCtx.fill();
            mCtx.clip();

            // Subtle pearl-white upper teeth hint when mouth opens
            if (open > 0.22) {
              mCtx.fillStyle = `rgba(255, 245, 242, ${Math.min(0.88, open * 0.95)})`;
              mCtx.beginPath();
              mCtx.ellipse(0, -openH * 0.35, halfW * 0.72, openH * 0.48, 0, 0, Math.PI * 2);
              mCtx.fill();
            }

            // Soft warm tongue curve on wider vowels
            if (open > 0.4) {
              mCtx.fillStyle = '#C64D58';
              mCtx.beginPath();
              mCtx.ellipse(0, openH * 0.85, halfW * 0.62, openH * 0.45, 0, 0, Math.PI * 2);
              mCtx.fill();
            }
            mCtx.restore();

            // Animated coral-pink lower lip tracking jaw drop
            mCtx.beginPath();
            mCtx.moveTo(-halfW * 0.92, openH * 0.15);
            mCtx.quadraticCurveTo(0, openH * 1.45, halfW * 0.92, openH * 0.15);
            mCtx.quadraticCurveTo(0, openH * 1.85 + 2.4, -halfW * 0.92, openH * 0.15);
            mCtx.closePath();
            mCtx.fillStyle = 'rgba(232, 112, 118, 0.9)';
            mCtx.fill();
          }

          mCtx.restore();
        }
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    inputAnalyserRef,
    isConnected,
    isMuted,
    isSwatiSpeaking,
    outputAnalyserRef,
  ]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftText.trim();
    if (!cleaned) return;
    setDraftText('');
    onSendText(cleaned);
  };

  const stateLabel =
    connectionState === 'connecting'
      ? 'Connecting to live voice…'
      : connectionState === 'error'
        ? 'Connection interrupted'
        : isConnected
          ? isSwatiSpeaking
            ? 'Swati is speaking'
            : isMuted || !isMicAvailable
              ? 'Listening via keyboard'
              : 'Listening to your mic'
          : wakeWordListening
            ? 'Wake word active — say “Backup Swati”'
            : 'Ready when you are';

  return (
    <section
      id="stage"
      className={`flex flex-col justify-between bg-[#131317] border rounded-xl p-6 sm:p-8 lg:p-10 transition-colors ${
        flashlightOn
          ? 'border-[#F5E7B8]/70 shadow-[0_0_50px_rgba(245,231,184,0.12)]'
          : 'border-white/[0.08]'
      }`}
    >
      {/* Top State Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Volume2
              className={`w-4 h-4 shrink-0 ${
                isSwatiSpeaking ? 'text-[#E14B32]' : 'text-[#F5F3EE]'
              }`}
              aria-hidden="true"
            />
          ) : wakeWordListening ? (
            <Ear className="w-4 h-4 shrink-0 text-[#E6B86E]" aria-hidden="true" />
          ) : (
            <Mic className="w-4 h-4 shrink-0 text-[#A19E95]" aria-hidden="true" />
          )}
          <span className="text-sm font-medium text-[#F5F3EE] tracking-wide">
            {stateLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-[#A19E95] font-mono tabular-nums">
          <span>Hindi / English</span>
          <span aria-hidden="true">·</span>
          <span>24 kHz PCM</span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(sessionSeconds)}</span>
        </div>
      </div>

      {/* Ringing Timer / Alarm Alert */}
      {hasRinging && (
        <div
          role="alert"
          className="mt-5 flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-[#E14B32]/15 border border-[#E14B32]/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BellRing className="w-4 h-4 shrink-0 text-[#E14B32]" />
            <span className="text-sm font-medium text-[#F5F3EE] truncate">
              {ringingTimer
                ? `Timer finished: ${ringingTimer.label}`
                : `Alarm ringing: ${ringingAlarm?.label} (${ringingAlarm?.time24h})`}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismissRinging}
            className="px-3 py-1.5 rounded-md bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Call / Send Confirmation Banner */}
      {activeConfirmation && (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#E6B86E]/10 border border-[#E6B86E]/45"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {activeConfirmation.kind === 'make_call' ? (
              <Phone className="w-4 h-4 shrink-0 text-[#E6B86E]" />
            ) : (
              <MessageSquare className="w-4 h-4 shrink-0 text-[#E6B86E]" />
            )}
            <div className="text-xs sm:text-sm text-[#F5F3EE] min-w-0">
              <span className="font-semibold">
                {activeConfirmation.kind === 'make_call'
                  ? `Confirm call to ${activeConfirmation.recipient}?`
                  : `Confirm ${activeConfirmation.target} message to ${activeConfirmation.recipient}?`}
              </span>
              {activeConfirmation.messageText && (
                <p className="text-xs text-[#A19E95] truncate">
                  “{activeConfirmation.messageText}”
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onApproveConfirmation(activeConfirmation.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                {activeConfirmation.kind === 'make_call'
                  ? 'Confirm Call'
                  : 'Approve & Send'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onCancelConfirmation(activeConfirmation.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-[#D7D4CC] cursor-pointer"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Auto-Typing Message Card */}
      {typingPreview && (
        <div
          role="status"
          className="mt-5 p-3.5 rounded-lg bg-[#0B0B0D] border border-[#E14B32]/45 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Keyboard className="w-4 h-4 shrink-0 text-[#E14B32]" />
              <span className="font-semibold text-[#F5F3EE] truncate">
                {typingPreview.isTyping
                  ? `Swati auto-typing for ${typingPreview.recipient} (${typingPreview.platform})…`
                  : typingPreview.dispatched
                    ? `Dispatched ${typingPreview.platform} message to ${typingPreview.recipient}`
                    : `Typed & copied for ${typingPreview.recipient} (${typingPreview.platform})`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onReopenLink(typingPreview.actionUrl)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E14B32] hover:bg-[#EC5E47] text-[11px] font-semibold text-[#F5F3EE] cursor-pointer"
              >
                <span>Open {typingPreview.platform}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
              <button
                type="button"
                onClick={onDismissTypingPreview}
                aria-label="Dismiss auto-typing preview"
                className="p-1 text-[#78756E] hover:text-[#F5F3EE] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-mono text-[#F5F3EE] bg-white/[0.03] border border-white/[0.06] rounded px-3 py-2 leading-relaxed">
            {typingPreview.typedText}
            {typingPreview.isTyping && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-[#E14B32]" />
            )}
          </p>
        </div>
      )}

      {/* Active Navigation / Location Card */}
      {lastNavCard && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.10] text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {lastNavCard.mode === 'navigate' ? (
              <Navigation className="w-4 h-4 shrink-0 text-[#E6B86E]" />
            ) : (
              <MapPin className="w-4 h-4 shrink-0 text-[#E6B86E]" />
            )}
            <span className="text-[#F5F3EE] font-medium truncate">
              {lastNavCard.mode === 'share_my_location'
                ? `GPS Location: ${lastNavCard.destination}`
                : `${lastNavCard.mode === 'view' ? 'Pin' : 'Route'}: ${lastNavCard.destination}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onReopenLink(lastNavCard.directionsUrl)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.08] hover:bg-[#E14B32] text-[#F5F3EE] font-medium shrink-0 cursor-pointer"
          >
            <span>Open Maps</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </button>
        </div>
      )}

      {/* Central Portrait + Reactive Voice Canvas + Live Lip-Sync Mouth */}
      <div className="py-7 flex flex-col items-center text-center">
        <div className="relative w-[312px] h-[312px] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          />

          <div
            className={`relative w-[212px] h-[212px] rounded-full overflow-hidden border bg-[#1B1B21] transition-all duration-300 ${
              flashlightOn
                ? 'border-[#F5E7B8]/80'
                : isSwatiSpeaking
                  ? 'border-[#E14B32]/85'
                  : 'border-white/[0.14]'
            }`}
          >
            {!imageFailed ? (
              <div
                className={`relative w-[112%] aspect-[1199/1312] -translate-x-[6%] -translate-y-[1%] transition-transform duration-300 ease-out ${
                  isSwatiSpeaking
                    ? 'scale-[1.03] -rotate-[0.8deg]'
                    : 'scale-100 rotate-0'
                }`}
              >
                <img
                  src={SWATI_PORTRAIT_URL}
                  alt="Avatar of Swati, your caring AI girlfriend and live voice companion"
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover block"
                />
                <canvas
                  ref={mouthCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#231919] via-[#17171C] to-[#0E0E12] px-4">
                <span className="font-serif italic text-3xl text-[#F5F3EE]">
                  Swati
                </span>
                <span className="mt-1 text-xs text-[#A19E95]">
                  Live Voice Studio
                </span>
              </div>
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        <h1 className="mt-4 font-serif text-[clamp(2rem,3.3vw,2.75rem)] leading-[1.12] tracking-tight text-[#F5F3EE] max-w-xl text-balance">
          Loving care, live <span className="italic text-[#E14B32]">JARVIS</span> &amp; voice.
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#A19E95] max-w-md leading-relaxed">
          Talk in Hindi or English{userPetName ? `, ${userPetName}` : ''}. Say “Backup Swati” to wake her—she talks like your caring girlfriend, cracks funny jokes, gets emotional over your big moments, opens &amp; runs phone apps, and looks after your health.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-5 w-full max-w-lg flex items-start gap-2.5 px-4 py-3 rounded-lg bg-[#E14B32]/10 border border-[#E14B32]/30 text-left text-xs sm:text-sm text-[#F8C4BC]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E14B32]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {micNotice && !errorMessage && (
          <div className="mt-4 w-full max-w-lg px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-[#A19E95]">
            {micNotice}
          </div>
        )}

        {/* Primary Voice Controls */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {!isConnected ? (
            <>
              <button
                type="button"
                onClick={onConnect}
                disabled={isConnecting}
                className="inline-flex items-center justify-center gap-2.5 min-h-[44px] px-6 py-2.5 rounded-lg bg-[#E14B32] hover:bg-[#EC5E47] active:scale-[0.99] disabled:opacity-60 text-[#F5F3EE] text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E14B32] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131317]"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>
                  {isConnecting ? 'Connecting…' : 'Start Voice Session'}
                </span>
              </button>

              {wakeWordSupported && (
                <button
                  type="button"
                  onClick={onToggleWakeWord}
                  className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    wakeWordEnabled
                      ? 'bg-[#E6B86E]/15 border-[#E6B86E]/60 text-[#F5F3EE]'
                      : 'bg-transparent border-white/[0.12] text-[#D7D4CC] hover:bg-white/[0.05]'
                  }`}
                >
                  <Ear className="w-4 h-4 shrink-0" />
                  <span>
                    {wakeWordEnabled
                      ? 'Backup Swati: On'
                      : 'Wake Word: Off'}
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E14B32] hover:bg-[#EC5E47] text-[#F5F3EE] text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E14B32] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131317]"
              >
                <PhoneOff className="w-4 h-4 shrink-0" />
                <span>End Call</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                disabled={!isMicAvailable}
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isMuted
                    ? 'bg-white/10 border-white/20 text-[#F5F3EE]'
                    : 'bg-transparent border-white/[0.12] text-[#D7D4CC] hover:bg-white/[0.05]'
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 shrink-0 text-[#E14B32]" />
                ) : (
                  <Mic className="w-4 h-4 shrink-0" />
                )}
                <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>

              <button
                type="button"
                onClick={onInterrupt}
                disabled={!isSwatiSpeaking}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg border border-white/[0.12] text-sm font-medium text-[#D7D4CC] hover:bg-white/[0.05] disabled:opacity-35 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Hand className="w-4 h-4 shrink-0" />
                <span>Interrupt</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom Whisper Input & Quick Action Starters */}
      <div className="pt-6 border-t border-white/[0.06] space-y-4">
        <form onSubmit={handleSubmitText} className="flex items-center gap-2.5">
          <label htmlFor="swati-whisper-input" className="sr-only">
            Send a message to Swati in Hindi or English
          </label>
          <input
            id="swati-whisper-input"
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={
              isConnected
                ? 'Type in Hindi or English: funny joke, open YouTube & play song, health care…'
                : 'Type a prompt in Hindi or English to start talking…'
            }
            className="flex-1 min-w-0 h-11 px-4 rounded-lg bg-[#0B0B0D] border border-white/[0.10] text-sm text-[#F5F3EE] placeholder:text-[#78756E] focus:outline-none focus:border-[#E14B32]/70 transition-colors"
          />
          <button
            type="submit"
            disabled={!draftText.trim() || isConnecting}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 disabled:cursor-not-allowed text-[#F5F3EE] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Send</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#7F7C74] mr-1">Try asking:</span>
          {QUICK_STARTERS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isConnecting}
              onClick={() => onSendText(prompt)}
              className="px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-xs font-medium text-[#D7D4CC] hover:text-[#F5F3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
