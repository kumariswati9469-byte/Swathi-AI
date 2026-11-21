import { Mic, MicOff, Phone, PhoneOff, X } from 'lucide-react';
import type { ConnectionState } from '../types/live.ts';

const SWATI_PORTRAIT_URL =
  '/assets/aistudio/file_00000000f6d082119a370d9fd90fb710_7f288609.png';

interface AssistantBubbleProps {
  visible: boolean;
  connectionState: ConnectionState;
  isSwatiSpeaking: boolean;
  isMuted: boolean;
  wakeWordListening: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onHide: () => void;
}

export function AssistantBubble({
  visible,
  connectionState,
  isSwatiSpeaking,
  isMuted,
  wakeWordListening,
  onConnect,
  onDisconnect,
  onToggleMute,
  onHide,
}: AssistantBubbleProps) {
  if (!visible) return null;

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const statusText = isConnecting
    ? 'Connecting…'
    : isConnected
      ? isSwatiSpeaking
        ? 'Swati speaking'
        : isMuted
          ? 'Mic muted'
          : 'Listening'
      : wakeWordListening
        ? 'Say “Backup Swati”'
        : 'Backup Swati';

  return (
    <div
      role="region"
      aria-label="Swati floating assistant bubble"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl bg-[#16161B]/95 backdrop-blur-md border border-white/[0.14] shadow-lg max-w-[calc(100vw-2rem)]"
    >
      <button
        type="button"
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E14B32] rounded-lg pr-1"
      >
        <img
          src={SWATI_PORTRAIT_URL}
          alt="Swati assistant"
          referrerPolicy="no-referrer"
          className={`w-8 h-8 rounded-full object-cover object-top border shrink-0 ${
            isSwatiSpeaking
              ? 'border-[#E14B32]'
              : isConnected || wakeWordListening
                ? 'border-white/40'
                : 'border-white/15'
          }`}
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#F5F3EE] whitespace-nowrap">
            {statusText}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-1 pl-1 border-l border-white/[0.08]">
        {isConnected ? (
          <>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D7D4CC] hover:bg-white/[0.08] cursor-pointer"
            >
              {isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-[#E14B32]" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              aria-label="End voice session"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E14B32] hover:bg-[#EC5E47] text-[#F5F3EE] cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            aria-label="Start voice session"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E14B32] hover:bg-[#EC5E47] text-[#F5F3EE] cursor-pointer disabled:opacity-50"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onHide}
          aria-label="Hide assistant bubble"
          className="w-7 h-8 rounded-lg flex items-center justify-center text-[#78756E] hover:text-[#F5F3EE] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
