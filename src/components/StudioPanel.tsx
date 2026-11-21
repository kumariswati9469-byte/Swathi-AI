import { useEffect, useRef, useState } from 'react';
import {
  AlarmClock,
  AlertCircle,
  Battery,
  BatteryCharging,
  Bell,
  Bluetooth,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CloudSun,
  Compass,
  Copy,
  Cpu,
  Download,
  Droplets,
  ExternalLink,
  Flashlight,
  Globe,
  Heart,
  Link2,
  ListTodo,
  Lock,
  MapPin,
  MessageSquare,
  Moon,
  Navigation,
  Newspaper,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  Smartphone,
  Sun,
  Timer,
  Trash2,
  User,
  Utensils,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import type {
  AlarmItem,
  ConnectionState,
  CustomPhoneApp,
  DeviceStatus,
  EmergencyContact,
  GroundedAnswer,
  HealthState,
  LanguageMode,
  LiveModelId,
  LocationNavigationCard,
  MemoryItem,
  MessageDraft,
  NewsHeadline,
  NotificationItem,
  OpenedLinkItem,
  PendingConfirmation,
  PermissionSnapshot,
  SassLevel,
  SavedLocation,
  ScreenshotItem,
  SessionSettings,
  TimerItem,
  TimetableSlot,
  TodoItem,
  TranscriptEntry,
  UserMood,
  VoicePreset,
  WeatherReport,
  WebsiteInspectionResult,
} from '../types/live.ts';
import { formatDuration } from '../utils/audio.ts';
import { APP_DIRECTORY } from '../utils/deviceControl.ts';

export type StudioTab = 'transcript' | 'planner' | 'care' | 'internet' | 'system';

const MODEL_OPTIONS: Array<{
  id: LiveModelId;
  label: string;
  note: string;
}> = [
  {
    id: 'gemini-3.8-live',
    label: 'Gemini 3.8 Live',
    note: 'Instant low-latency live voice',
  },
  {
    id: 'gemini-3.8-live-extended-thinking',
    label: '3.8 Extended Thinking',
    note: 'Deep reasoning + non-blocking tools',
  },
];

const VOICE_OPTIONS: Array<{
  id: VoicePreset;
  label: string;
  note: string;
}> = [
  { id: 'Aoede', label: 'Aoede', note: 'Natural, sweet & expressive' },
  { id: 'Kore', label: 'Kore', note: 'Crisp, poised & sharp' },
  { id: 'Zephyr', label: 'Zephyr', note: 'Bright, breezy & quick' },
  { id: 'Puck', label: 'Puck', note: 'Playful & energetic' },
];

const SASS_OPTIONS: Array<{
  id: SassLevel;
  label: string;
  description: string;
}> = [
  {
    id: 'girlfriend',
    label: 'Girlfriend Care',
    description:
      'Loving, emotionally attentive, playfully teasing & health-conscious.',
  },
  {
    id: 'sweet',
    label: 'Natural Sweet',
    description: 'Warm, gentle female voice with bright encouragement.',
  },
  {
    id: 'sassy',
    label: 'Classic Sassy',
    description: 'Confident, flirty wit with crisp one-liners and attitude.',
  },
  {
    id: 'jarvis',
    label: 'JARVIS Sharp',
    description: 'Precision intellect, fast wit, and commanding presence.',
  },
];

const LANGUAGE_OPTIONS: Array<{
  id: LanguageMode;
  label: string;
  note: string;
}> = [
  { id: 'bilingual', label: 'Hindi + English', note: 'Auto-mirrors you' },
  { id: 'hindi', label: 'Hindi / Hinglish', note: 'Hindi-first replies' },
  { id: 'english', label: 'English', note: 'English-first replies' },
];

const MOOD_OPTIONS: UserMood[] = [
  'Happy',
  'Calm',
  'Energized',
  'Tired',
  'Stressed',
  'Low',
];

const STUDY_PROMPTS = [
  {
    label: 'Explain Topic in Hindi',
    prompt:
      'Swati, mujhe ek mushkil study topic aasaan Hindi aur real-life example se samjhao. Pehle poocho kaunsa topic padhna hai.',
  },
  {
    label: '5-Question Quiz',
    prompt:
      'Swati, meri taiyari check karne ke liye mujhse ek-ek karke 5 quick quiz questions poocho.',
  },
  {
    label: 'Make Study Notes',
    prompt:
      'Swati, mere aaj ke chapter ke crisp bullet study notes aur revision summary banao.',
  },
];

function SegmentedMeter({
  level,
  activeColorClass,
}: {
  level: number;
  activeColorClass: string;
}) {
  const activeCount = Math.round(level * 12);
  return (
    <div className="grid grid-cols-12 gap-1" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, idx) => (
        <span
          key={idx}
          className={`h-1.5 rounded-sm transition-colors duration-75 ${
            idx < activeCount ? activeColorClass : 'bg-[#0B0B0D]'
          }`}
        />
      ))}
    </div>
  );
}

function ConfirmationCard({
  item,
  onApprove,
  onCancel,
}: {
  item: PendingConfirmation;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isCall = item.kind === 'make_call';
  return (
    <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-[#E6B86E]/45 space-y-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#E6B86E]">
          {isCall ? (
            <Phone className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {isCall ? 'Confirm Phone Call' : `Confirm Send (${item.target})`}
          </span>
        </span>
        <span className="font-mono tabular-nums text-[#78756E]">
          {item.status.toUpperCase()} · {item.createdAt}
        </span>
      </div>

      <div className="text-xs text-[#F5F3EE]">
        <span className="text-[#A19E95]">To: </span>
        <span className="font-semibold">{item.recipient}</span>
        {item.target && (
          <span className="text-[#A19E95]"> ({item.target})</span>
        )}
      </div>

      {item.messageText && (
        <p className="text-xs text-[#D7D4CC] bg-white/[0.03] border border-white/[0.06] rounded px-2.5 py-2 leading-relaxed">
          {item.messageText}
        </p>
      )}

      {item.status === 'pending' && (
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onApprove(item.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE] cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{isCall ? 'Confirm Call' : 'Approve & Send'}</span>
          </button>
          <button
            type="button"
            onClick={() => onCancel(item.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#D7D4CC] cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>Cancel</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface StudioPanelProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  connectionState: ConnectionState;
  wakeWordSupported: boolean;
  internetError: string | null;
  transcript: TranscriptEntry[];
  openedLinks: OpenedLinkItem[];
  memories: MemoryItem[];
  timers: TimerItem[];
  alarms: AlarmItem[];
  screenshots: ScreenshotItem[];
  deviceStatus: DeviceStatus;
  healthState: HealthState;
  weatherReport: WeatherReport | null;
  weatherLoading: boolean;
  newsHeadlines: NewsHeadline[];
  newsLoading: boolean;
  groundedAnswers: GroundedAnswer[];
  searchLoading: boolean;
  messageDrafts: MessageDraft[];
  pendingConfirmations: PendingConfirmation[];
  todos: TodoItem[];
  timetable: TimetableSlot[];
  notifications: NotificationItem[];
  emergencyContact: EmergencyContact;
  permissions: PermissionSnapshot;
  customApps: CustomPhoneApp[];
  savedLocations: SavedLocation[];
  lastNavCard: LocationNavigationCard | null;
  lastWebsiteWork: WebsiteInspectionResult | null;
  websiteLoading: boolean;
  activeControlFocus: string | null;
  settings: SessionSettings;
  pendingSettingsApply: boolean;
  sessionSeconds: number;
  inputLevel: number;
  outputLevel: number;
  onUpdateSettings: (partial: Partial<SessionSettings>) => void;
  onApplyAndReconnect: () => void;
  onClearTranscript: () => void;
  onReopenLink: (url: string) => void;
  onSendText: (text: string) => void;
  onSetVolume: (level: number) => void;
  onSetBrightness: (level: number) => void;
  onToggleFlashlight: () => void;
  onCaptureScreenshot: () => void;
  onAddTimer: (seconds: number, label: string) => void;
  onRemoveTimer: (id: string) => void;
  onAddAlarm: (time24h: string, label: string) => void;
  onToggleAlarm: (id: string) => void;
  onRemoveAlarm: (id: string) => void;
  onAddMemory: (fact: string) => void;
  onRemoveMemory: (id: string) => void;
  onClearMemories: () => void;
  onLaunchApp: (appName: string) => void;
  onAddCustomApp: (
    name: string,
    url: string,
    category?: string,
    androidIntent?: string
  ) => CustomPhoneApp | null;
  onRemoveCustomApp: (id: string) => void;
  onAddSavedLocation: (
    label: string,
    addressOrCoords: string
  ) => SavedLocation | null;
  onRemoveSavedLocation: (id: string) => void;
  onNavigateLocation: (params: {
    destination?: string;
    personName?: string;
    mode?: 'navigate' | 'view' | 'share_my_location';
    openInMaps?: boolean;
  }) => Promise<LocationNavigationCard>;
  onInspectWebsite: (
    rawUrl: string,
    siteTaskQuery?: string,
    openInTab?: boolean
  ) => Promise<WebsiteInspectionResult | null>;
  onUpdateHealth: (partial: Partial<HealthState>) => void;
  onIncrementWater: (delta?: number) => void;
  onFetchWeather: (city: string) => void;
  onFetchNews: (topic: string, lang: 'hi' | 'en') => void;
  onAskWeb: (question: string) => void;
  onSearchGoogle: (query: string) => void;
  onSearchYouTube: (query: string) => void;
  onApproveConfirmation: (id: string) => void;
  onCancelConfirmation: (id: string) => void;
  onAddTodo: (title: string, priority?: 'normal' | 'high') => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  onAddTimetableSlot: (time: string, activity: string) => void;
  onToggleTimetableSlot: (id: string) => void;
  onRemoveTimetableSlot: (id: string) => void;
  onRunRoutine: (name: 'morning' | 'study' | 'night') => Promise<string>;
  onAddNotification: (app: string, sender: string, body: string) => void;
  onMarkNotificationsRead: () => void;
  onRemoveNotification: (id: string) => void;
  onUpdateEmergencyContact: (contact: EmergencyContact) => void;
  onRequestPermission: (
    kind: 'microphone' | 'camera' | 'notifications' | 'location'
  ) => void;
  onWipeAllLocalData: () => void;
}

export function StudioPanel({
  activeTab,
  onTabChange,
  connectionState,
  wakeWordSupported,
  internetError,
  transcript,
  openedLinks,
  memories,
  timers,
  alarms,
  screenshots,
  deviceStatus,
  healthState,
  weatherReport,
  weatherLoading,
  newsHeadlines,
  newsLoading,
  groundedAnswers,
  searchLoading,
  messageDrafts,
  pendingConfirmations,
  todos,
  timetable,
  notifications,
  emergencyContact,
  permissions,
  customApps,
  savedLocations,
  lastNavCard,
  lastWebsiteWork,
  websiteLoading,
  activeControlFocus,
  settings,
  pendingSettingsApply,
  sessionSeconds,
  inputLevel,
  outputLevel,
  onUpdateSettings,
  onApplyAndReconnect,
  onClearTranscript,
  onReopenLink,
  onSendText,
  onSetVolume,
  onSetBrightness,
  onToggleFlashlight,
  onCaptureScreenshot,
  onAddTimer,
  onRemoveTimer,
  onAddAlarm,
  onToggleAlarm,
  onRemoveAlarm,
  onAddMemory,
  onRemoveMemory,
  onClearMemories,
  onLaunchApp,
  onAddCustomApp,
  onRemoveCustomApp,
  onAddSavedLocation,
  onRemoveSavedLocation,
  onNavigateLocation,
  onInspectWebsite,
  onUpdateHealth,
  onIncrementWater,
  onFetchWeather,
  onFetchNews,
  onAskWeb,
  onSearchGoogle,
  onSearchYouTube,
  onApproveConfirmation,
  onCancelConfirmation,
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
  onAddTimetableSlot,
  onToggleTimetableSlot,
  onRemoveTimetableSlot,
  onRunRoutine,
  onAddNotification,
  onMarkNotificationsRead,
  onRemoveNotification,
  onUpdateEmergencyContact,
  onRequestPermission,
  onWipeAllLocalData,
}: StudioPanelProps) {
  const [newMemoryText, setNewMemoryText] = useState('');
  const [mealInput, setMealInput] = useState('');
  const [newAlarmTime, setNewAlarmTime] = useState('07:30');
  const [newAlarmLabel, setNewAlarmLabel] = useState('Morning Alarm');
  const [bluetoothNotice, setBluetoothNotice] = useState<string | null>(null);

  // Smart Internet, Location & Website inputs
  const [webQuery, setWebQuery] = useState('');
  const [weatherCity, setWeatherCity] = useState('New Delhi');
  const [newsLang, setNewsLang] = useState<'hi' | 'en'>('hi');
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [navDestInput, setNavDestInput] = useState('');
  const [savedLocLabel, setSavedLocLabel] = useState('');
  const [savedLocAddr, setSavedLocAddr] = useState('');
  const [siteUrlInput, setSiteUrlInput] = useState('');
  const [siteTaskInput, setSiteTaskInput] = useState('');

  // Connected Phone Apps & Custom App state
  const [appCategoryFilter, setAppCategoryFilter] = useState<string>('All');
  const [customAppName, setCustomAppName] = useState('');
  const [customAppUrl, setCustomAppUrl] = useState('');
  const [customAppIntent, setCustomAppIntent] = useState('');
  const [customAppError, setCustomAppError] = useState<string | null>(null);

  // Planner tab inputs
  const [todoInput, setTodoInput] = useState('');
  const [todoPriority, setTodoPriority] = useState<'normal' | 'high'>('normal');
  const [slotTime, setSlotTime] = useState('04:00 PM');
  const [slotActivity, setSlotActivity] = useState('');
  const [routineBanner, setRoutineBanner] = useState<string | null>(null);

  // Notification reader composer
  const [notifApp, setNotifApp] = useState('WhatsApp');
  const [notifSender, setNotifSender] = useState('');
  const [notifBody, setNotifBody] = useState('');

  // System wipe confirmation
  const [confirmWipe, setConfirmWipe] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === 'transcript') {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, transcript.length]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activePending = pendingConfirmations.filter(
    (c) => c.status === 'pending'
  );

  const handleBluetoothScan = async () => {
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice?: (opts: { acceptAllDevices: boolean }) => Promise<unknown>;
      };
    };
    if (nav.bluetooth?.requestDevice) {
      try {
        await nav.bluetooth.requestDevice({ acceptAllDevices: true });
        setBluetoothNotice('Bluetooth pairing prompt opened.');
      } catch {
        setBluetoothNotice('Bluetooth scan cancelled.');
      }
    } else {
      setBluetoothNotice(
        'Web Bluetooth is unavailable here; open Android Bluetooth Settings below on mobile.'
      );
    }
  };

  const handleCopyDraft = async (draft: MessageDraft) => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopiedDraftId(draft.id);
      window.setTimeout(() => setCopiedDraftId(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleTriggerRoutine = async (name: 'morning' | 'study' | 'night') => {
    const summary = await onRunRoutine(name);
    setRoutineBanner(summary);
  };

  const emergencyPhoneDigits = emergencyContact.phone.replace(/[^\d+*#]/g, '');

  return (
    <aside className="flex flex-col bg-[#131317] border border-white/[0.08] rounded-xl overflow-hidden min-h-[580px] lg:h-full">
      {/* Segmented Panel Navigation */}
      <div className="flex items-center justify-between gap-2 p-4 border-b border-white/[0.06]">
        <div
          role="tablist"
          aria-label="Companion panels"
          className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0B0D] border border-white/[0.06] overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'transcript'}
            onClick={() => onTabChange('transcript')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-[#1D1D23] text-[#F5F3EE]'
                : 'text-[#A19E95] hover:text-[#F5F3EE]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Transcript</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'planner'}
            onClick={() => onTabChange('planner')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-[#1D1D23] text-[#F5F3EE]'
                : 'text-[#A19E95] hover:text-[#F5F3EE]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 shrink-0" />
            <span>Planner</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'care'}
            onClick={() => onTabChange('care')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'care'
                ? 'bg-[#1D1D23] text-[#F5F3EE]'
                : 'text-[#A19E95] hover:text-[#F5F3EE]'
            }`}
          >
            <Heart className="w-3.5 h-3.5 shrink-0" />
            <span>Care</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'internet'}
            onClick={() => onTabChange('internet')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'internet'
                ? 'bg-[#1D1D23] text-[#F5F3EE]'
                : 'text-[#A19E95] hover:text-[#F5F3EE]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Internet</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'system'}
            onClick={() => onTabChange('system')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[#1D1D23] text-[#F5F3EE]'
                : 'text-[#A19E95] hover:text-[#F5F3EE]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>System</span>
          </button>
        </div>

        {activeTab === 'transcript' && transcript.length > 0 && (
          <button
            type="button"
            onClick={onClearTranscript}
            title="Clear transcript"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A19E95] hover:text-[#F5F3EE] hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {/* 1. TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div id="transcript" className="h-full flex flex-col space-y-4">
            {internetError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#E14B32]/10 border border-[#E14B32]/35 text-xs text-[#F8C4BC]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E14B32]" />
                <span>{internetError}</span>
              </div>
            )}

            {activePending.length > 0 && (
              <div className="space-y-2.5">
                {activePending.map((conf) => (
                  <ConfirmationCard
                    key={conf.id}
                    item={conf}
                    onApprove={onApproveConfirmation}
                    onCancel={onCancelConfirmation}
                  />
                ))}
              </div>
            )}

            {transcript.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                <p className="font-serif italic text-xl text-[#F5F3EE]">
                  “सुनो {settings.userPetName || 'जान'}, आज का दिन कैसा रहा? पानी पिया या नहीं?”
                </p>
                <p className="mt-2.5 text-sm text-[#A19E95] max-w-xs leading-relaxed">
                  Talk in Hindi or English. Your conversation, call/message confirmations, timetable updates, weather, drafts, and links appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {transcript.map((entry) => {
                  const linkedConfirmation = entry.confirmationId
                    ? pendingConfirmations.find(
                        (c) => c.id === entry.confirmationId
                      )
                    : undefined;
                  return (
                    <div key={entry.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span
                          className={`font-semibold ${
                            entry.speaker === 'swati'
                              ? 'text-[#E14B32]'
                              : entry.speaker === 'action'
                                ? 'text-[#E6B86E]'
                                : 'text-[#D7D4CC]'
                          }`}
                        >
                          {entry.speaker === 'swati'
                            ? 'Swati'
                            : entry.speaker === 'action'
                              ? 'Assistant Action'
                              : 'You'}
                        </span>
                        <span className="font-mono tabular-nums text-[#78756E]">
                          {entry.timestamp}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm text-[#F5F3EE] leading-relaxed">
                        {entry.text}
                      </p>

                      {linkedConfirmation &&
                        linkedConfirmation.status !== 'pending' && (
                          <div className="mt-2 text-xs font-mono text-[#A19E95]">
                            Confirmation status:{' '}
                            <span className="text-[#F5F3EE] uppercase">
                              {linkedConfirmation.status}
                            </span>
                          </div>
                        )}

                      {entry.link && (
                        <div className="mt-3 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#F5F3EE] truncate">
                              {entry.link.title}
                            </p>
                            <p className="text-xs text-[#78756E] truncate font-mono">
                              {entry.link.url}
                            </p>
                          </div>
                          <a
                            href={entry.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.07] hover:bg-[#E14B32] text-xs font-medium text-[#F5F3EE] transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {entry.weather && (
                        <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-[#F5F3EE]">
                              {entry.weather.city} · {entry.weather.condition}
                            </div>
                            <div className="text-[#A19E95] mt-0.5 tabular-nums">
                              Feels {entry.weather.feelsLikeC}°C · Humidity{' '}
                              {entry.weather.humidity}% · Wind{' '}
                              {entry.weather.windKmh} km/h
                            </div>
                          </div>
                          <span className="text-lg font-semibold font-mono tabular-nums text-[#E14B32]">
                            {entry.weather.temperatureC}°C
                          </span>
                        </div>
                      )}

                      {entry.draft && (
                        <div className="mt-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-2">
                          <div className="flex items-center justify-between text-xs text-[#A19E95]">
                            <span>
                              {entry.draft.platform} draft for{' '}
                              <strong className="text-[#F5F3EE]">
                                {entry.draft.recipient}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyDraft(entry.draft!)}
                              className="inline-flex items-center gap-1 text-[#E14B32] hover:underline cursor-pointer"
                            >
                              {copiedDraftId === entry.draft.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-[#F5F3EE] leading-relaxed">
                            {entry.draft.text}
                          </p>
                        </div>
                      )}

                      {entry.navigation && (
                        <div className="mt-3 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#F5F3EE] truncate">
                              {entry.navigation.destination}
                            </p>
                            {entry.navigation.originCoords && (
                              <p className="text-[11px] font-mono text-[#78756E] truncate">
                                GPS: {entry.navigation.originCoords.lat},{' '}
                                {entry.navigation.originCoords.lng}
                              </p>
                            )}
                          </div>
                          <a
                            href={entry.navigation.directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.07] hover:bg-[#E14B32] text-xs font-medium text-[#F5F3EE] transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Directions</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {entry.screenshotUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-white/[0.08] bg-[#0B0B0D]">
                          <img
                            src={entry.screenshotUrl}
                            alt={entry.text}
                            referrerPolicy="no-referrer"
                            className="w-full h-36 object-cover"
                          />
                          <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06]">
                            <span className="text-xs text-[#A19E95]">
                              PNG Snapshot
                            </span>
                            <a
                              href={entry.screenshotUrl}
                              download={`swati-snapshot-${entry.timestamp.replace(/:/g, '-')}.png`}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E14B32] hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PNG</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        )}

        {/* 2. PERSONAL ASSISTANT PLANNER (Confirmations, To-Do, Timetable, Study, Automation, Emergency) */}
        {activeTab === 'planner' && (
          <div id="planner" className="space-y-6">
            {/* Pending Call & Message Confirmations */}
            {pendingConfirmations.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-sm font-semibold text-[#F5F3EE]">
                  Call &amp; Message Confirmations ({activePending.length} pending)
                </h2>
                <div className="space-y-2">
                  {pendingConfirmations.slice(0, 4).map((conf) => (
                    <ConfirmationCard
                      key={conf.id}
                      item={conf}
                      onApprove={onApproveConfirmation}
                      onCancel={onCancelConfirmation}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* To-Do Task List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <ListTodo className="w-4 h-4 text-[#E14B32]" />
                  <span>To-Do Task List ({todos.filter((t) => !t.done).length} open)</span>
                </h2>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleaned = todoInput.trim();
                  if (!cleaned) return;
                  onAddTodo(cleaned, todoPriority);
                  setTodoInput('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  placeholder="Add task (e.g. Revise Maths Ch 4)…"
                  aria-label="New to-do task"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setTodoPriority((p) => (p === 'normal' ? 'high' : 'normal'))
                  }
                  className={`h-9 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    todoPriority === 'high'
                      ? 'bg-[#E14B32]/15 border-[#E14B32]/60 text-[#F5F3EE]'
                      : 'bg-[#0B0B0D] border-white/[0.08] text-[#A19E95]'
                  }`}
                >
                  {todoPriority === 'high' ? 'High' : 'Normal'}
                </button>
                <button
                  type="submit"
                  disabled={!todoInput.trim()}
                  className="h-9 px-3 rounded-lg bg-[#E14B32] hover:bg-[#EC5E47] disabled:opacity-40 text-xs font-semibold text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Add
                </button>
              </form>

              {todos.length === 0 ? (
                <p className="text-xs text-[#78756E]">
                  No tasks yet. Add one above or tell Swati “मेरे कामों की लिस्ट में डाल दो…”.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                  {todos.map((item) => (
                    <li
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTodo(item.id)}
                        className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            item.done
                              ? 'bg-[#E14B32] border-[#E14B32] text-[#F5F3EE]'
                              : 'border-white/25'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3" />}
                        </span>
                        <span
                          className={`truncate ${
                            item.done
                              ? 'line-through text-[#78756E]'
                              : 'text-[#F5F3EE]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.priority === 'high' && !item.done && (
                          <span className="text-[11px] font-mono text-[#E6B86E] shrink-0">
                            · HIGH
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveTodo(item.id)}
                        aria-label={`Delete task ${item.title}`}
                        className="text-[#78756E] hover:text-[#F5F3EE] shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Daily Timetable */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <Calendar className="w-4 h-4 text-[#E14B32]" />
                  <span>Daily Timetable</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onSendText(
                      'Swati, mere liye aaj ka smart daily timetable banao jisme study, meals, rest aur paani ka time ho.'
                    )
                  }
                  className="text-xs text-[#E14B32] hover:underline cursor-pointer"
                >
                  Auto-plan via Swati
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleaned = slotActivity.trim();
                  if (!cleaned) return;
                  onAddTimetableSlot(slotTime, cleaned);
                  setSlotActivity('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  placeholder="04:00 PM"
                  aria-label="Timetable slot time"
                  className="w-24 h-9 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs font-mono text-[#F5F3EE]"
                />
                <input
                  type="text"
                  value={slotActivity}
                  onChange={(e) => setSlotActivity(e.target.value)}
                  placeholder="Activity (e.g. Physics revision)…"
                  aria-label="Timetable activity"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                />
                <button
                  type="submit"
                  disabled={!slotActivity.trim()}
                  className="h-9 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Add Slot
                </button>
              </form>

              <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                {timetable.map((slot) => (
                  <li
                    key={slot.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTimetableSlot(slot.id)}
                      className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                    >
                      <span className="font-mono tabular-nums text-[#E6B86E] shrink-0">
                        {slot.time}
                      </span>
                      <span
                        className={`truncate ${
                          slot.done
                            ? 'line-through text-[#78756E]'
                            : 'text-[#F5F3EE]'
                        }`}
                      >
                        {slot.activity}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTimetableSlot(slot.id)}
                      aria-label={`Remove slot ${slot.activity}`}
                      className="text-[#78756E] hover:text-[#F5F3EE] shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Study Helper */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                <BookOpen className="w-4 h-4 text-[#E14B32]" />
                <span>Study Helper</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {STUDY_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onSendText(item.prompt)}
                    className="px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-[#F5F3EE] cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Task Automation Routines */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                <Zap className="w-4 h-4 text-[#E6B86E]" />
                <span>Smart Task Automation</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerRoutine('morning')}
                  className="p-2.5 rounded-lg bg-[#0B0B0D] hover:bg-white/[0.05] border border-white/[0.08] text-left cursor-pointer"
                >
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Morning Briefing
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#A19E95]">
                    Weather + News + Water
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerRoutine('study')}
                  className="p-2.5 rounded-lg bg-[#0B0B0D] hover:bg-white/[0.05] border border-white/[0.08] text-left cursor-pointer"
                >
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Study Focus
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#A19E95]">
                    25m Pomodoro Timer
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerRoutine('night')}
                  className="p-2.5 rounded-lg bg-[#0B0B0D] hover:bg-white/[0.05] border border-white/[0.08] text-left cursor-pointer"
                >
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Night Wind-Down
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#A19E95]">
                    Dim 60% + Sleep Prep
                  </div>
                </button>
              </div>
              {routineBanner && (
                <p className="text-xs text-[#E6B86E] bg-[#0B0B0D] border border-[#E6B86E]/30 rounded-lg px-3 py-2">
                  {routineBanner}
                </p>
              )}
            </div>

            {/* Emergency Contact Shortcut */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <ShieldAlert className="w-4 h-4 text-[#E14B32]" />
                  <span>Emergency Contact Shortcut</span>
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={emergencyContact.name}
                  onChange={(e) =>
                    onUpdateEmergencyContact({
                      ...emergencyContact,
                      name: e.target.value,
                    })
                  }
                  placeholder="Name"
                  aria-label="Emergency contact name"
                  className="h-9 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <input
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) =>
                    onUpdateEmergencyContact({
                      ...emergencyContact,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Phone"
                  aria-label="Emergency contact phone"
                  className="h-9 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs font-mono text-[#F5F3EE]"
                />
                <input
                  type="text"
                  value={emergencyContact.relation}
                  onChange={(e) =>
                    onUpdateEmergencyContact({
                      ...emergencyContact,
                      relation: e.target.value,
                    })
                  }
                  placeholder="Relation"
                  aria-label="Emergency contact relation"
                  className="h-9 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${emergencyPhoneDigits || '112'}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE]"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>Call {emergencyContact.name || 'Emergency'}</span>
                </a>
                <a
                  href={`https://wa.me/${emergencyPhoneDigits.replace(/^\+/, '')}?text=${encodeURIComponent(
                    `Emergency: Please reach out to me right away.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium text-[#F5F3EE]"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>WhatsApp SOS ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 3. CARE, HEALTH, NOTIFICATIONS & MEMORY */}
        {activeTab === 'care' && (
          <div id="care" className="space-y-6">
            {/* Emotion & Mood Check-in */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-semibold text-[#F5F3EE]">
                  Emotion &amp; Mood Check-In
                </h2>
                <span className="text-xs font-mono tabular-nums text-[#78756E]">
                  Updated {healthState.lastCheckinAt}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const active = healthState.mood === mood;
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => onUpdateHealth({ mood })}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#E14B32]/15 border-[#E14B32]/70 text-[#F5F3EE]'
                          : 'bg-[#0B0B0D] border-white/[0.08] text-[#A19E95] hover:text-[#F5F3EE]'
                      }`}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Hydration & Sleep & Meal */}
            <div className="pt-4 border-t border-white/[0.06] space-y-4">
              <div className="p-4 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#F5F3EE]">
                    <Droplets className="w-4 h-4 text-[#E14B32]" />
                    <span>Daily Hydration</span>
                  </span>
                  <span className="text-sm font-mono tabular-nums text-[#F5F3EE]">
                    {healthState.waterGlasses} / {healthState.waterGoal} glasses
                  </span>
                </div>

                <div className="grid grid-cols-8 gap-1.5" aria-hidden="true">
                  {Array.from({ length: healthState.waterGoal }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 rounded-sm ${
                        i < healthState.waterGlasses
                          ? 'bg-[#E14B32]'
                          : 'bg-white/[0.08]'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onIncrementWater(-1)}
                    className="px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-xs text-[#D7D4CC] cursor-pointer"
                  >
                    -1 Glass
                  </button>
                  <button
                    type="button"
                    onClick={() => onIncrementWater(1)}
                    className="px-3 py-1.5 rounded-md bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE] cursor-pointer"
                  >
                    +1 Glass Water
                  </button>
                </div>
              </div>

              {/* Sleep & Meal Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#A19E95]">
                    <span className="inline-flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5" />
                      <span>Sleep</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#F5F3EE]">
                      {healthState.sleepHours} hrs
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateHealth({
                          sleepHours: Math.max(2, healthState.sleepHours - 0.5),
                        })
                      }
                      className="flex-1 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs text-[#D7D4CC] cursor-pointer"
                    >
                      -0.5h
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateHealth({
                          sleepHours: Math.min(12, healthState.sleepHours + 0.5),
                        })
                      }
                      className="flex-1 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs text-[#D7D4CC] cursor-pointer"
                    >
                      +0.5h
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                  <div className="flex items-center gap-1.5 text-xs text-[#A19E95]">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Last Meal</span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[#F5F3EE] truncate">
                    {healthState.lastMeal}
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mealInput.trim()) return;
                  onUpdateHealth({ lastMeal: mealInput.trim() });
                  setMealInput('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={mealInput}
                  onChange={(e) => setMealInput(e.target.value)}
                  placeholder="Log meal (e.g. Dal chawal & salad)…"
                  aria-label="Log meal"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                />
                <button
                  type="submit"
                  disabled={!mealInput.trim()}
                  className="h-9 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  Log Meal
                </button>
              </form>

              {/* Quick Care Reminders */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAddTimer(1800, 'Paani pi lo (Water Care)')}
                  className="px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-[#F5F3EE] cursor-pointer"
                >
                  30m Water Reminder
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAddTimer(2700, 'Eyes & Posture Break (Swati Care)')
                  }
                  className="px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-[#F5F3EE] cursor-pointer"
                >
                  45m Break Reminder
                </button>
              </div>
            </div>

            {/* Smart Notification Reader */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <Bell className="w-4 h-4 text-[#E6B86E]" />
                  <span>Smart Notification Reader ({unreadCount} unread)</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSendText('Read my unread notifications aloud')
                    }
                    className="px-2.5 py-1 rounded bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE] cursor-pointer"
                  >
                    Read Aloud
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkNotificationsRead}
                      className="text-xs text-[#A19E95] hover:text-[#F5F3EE] cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!notifBody.trim()) return;
                  onAddNotification(
                    notifApp,
                    notifSender.trim() || 'Contact',
                    notifBody.trim()
                  );
                  setNotifSender('');
                  setNotifBody('');
                }}
                className="grid grid-cols-12 gap-1.5"
              >
                <input
                  type="text"
                  value={notifApp}
                  onChange={(e) => setNotifApp(e.target.value)}
                  placeholder="App"
                  aria-label="Notification app"
                  className="col-span-3 h-8 px-2 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <input
                  type="text"
                  value={notifSender}
                  onChange={(e) => setNotifSender(e.target.value)}
                  placeholder="Sender"
                  aria-label="Notification sender"
                  className="col-span-3 h-8 px-2 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <input
                  type="text"
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Add incoming alert…"
                  aria-label="Notification body"
                  className="col-span-4 h-8 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <button
                  type="submit"
                  disabled={!notifBody.trim()}
                  className="col-span-2 h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  Add
                </button>
              </form>

              {notifications.length > 0 && (
                <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className="py-2.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[#A19E95]">
                          <span className="font-semibold text-[#F5F3EE]">
                            {n.app} · {n.sender}
                          </span>
                          <span className="font-mono tabular-nums text-[#78756E]">
                            {n.time}
                          </span>
                          {!n.read && (
                            <span className="text-[#E14B32] font-semibold">
                              · NEW
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[#D7D4CC] leading-snug">
                          {n.body}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveNotification(n.id)}
                        aria-label="Dismiss notification"
                        className="text-[#78756E] hover:text-[#F5F3EE] shrink-0 cursor-pointer mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Persistent Conversation Memory */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#F5F3EE]">
                  Swati AI Memory ({memories.length})
                </h3>
                {memories.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearMemories}
                    className="text-xs text-[#A19E95] hover:text-[#F5F3EE] cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = newMemoryText.trim();
                  if (!trimmed) return;
                  onAddMemory(trimmed);
                  setNewMemoryText('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Add something for Swati to remember…"
                  aria-label="Add fact to Swati memory"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                />
                <button
                  type="submit"
                  disabled={!newMemoryText.trim()}
                  className="h-9 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  Save
                </button>
              </form>

              {memories.length > 0 && (
                <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                  {memories.map((mem) => (
                    <li
                      key={mem.id}
                      className="py-2.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#F5F3EE] leading-snug">
                          {mem.fact}
                        </p>
                        <p className="mt-0.5 text-[#78756E] font-mono tabular-nums">
                          {mem.category} · {mem.createdAt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveMemory(mem.id)}
                        aria-label="Remove memory"
                        className="text-[#78756E] hover:text-[#F5F3EE] shrink-0 cursor-pointer mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 4. SMART INTERNET FEATURES */}
        {activeTab === 'internet' && (
          <div id="internet" className="space-y-6">
            {internetError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#E14B32]/10 border border-[#E14B32]/35 text-xs text-[#F8C4BC]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E14B32]" />
                <span>{internetError}</span>
              </div>
            )}

            {/* Google, YouTube & Grounded Q&A */}
            <div className="space-y-2.5">
              <h2 className="text-sm font-semibold text-[#F5F3EE]">
                Search Google, YouTube &amp; Live Answers
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-[#78756E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="Ask anything, search Google or YouTube…"
                    aria-label="Web search query"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-sm text-[#F5F3EE] placeholder:text-[#78756E]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!webQuery.trim() || searchLoading}
                  onClick={() => onAskWeb(webQuery)}
                  className="px-3 py-1.5 rounded-md bg-[#E14B32] hover:bg-[#EC5E47] disabled:opacity-40 text-xs font-semibold text-[#F5F3EE] cursor-pointer"
                >
                  {searchLoading ? 'Searching…' : 'Ask Live Web'}
                </button>
                <button
                  type="button"
                  disabled={!webQuery.trim()}
                  onClick={() => onSearchGoogle(webQuery)}
                  className="px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  Open Google Search
                </button>
                <button
                  type="button"
                  disabled={!webQuery.trim()}
                  onClick={() => onSearchYouTube(webQuery)}
                  className="px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  Search YouTube Videos
                </button>
              </div>

              {groundedAnswers.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {groundedAnswers.slice(0, 2).map((ans) => (
                    <div
                      key={ans.id}
                      className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-[#A19E95]">
                        <span className="font-medium text-[#F5F3EE] truncate">
                          {ans.question}
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          {ans.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#D7D4CC] leading-relaxed">
                        {ans.answer}
                      </p>
                      {ans.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {ans.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#E14B32] hover:underline"
                            >
                              <span className="truncate max-w-[160px]">
                                {src.title}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Location, Saved Places & Turn-by-Turn Navigation */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <Compass className="w-4 h-4 text-[#E6B86E]" />
                  <span>Live Location &amp; Navigation</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onNavigateLocation({ mode: 'share_my_location' })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.07] hover:bg-white/[0.14] text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  <MapPin className="w-3 h-3 text-[#E14B32]" />
                  <span>My GPS Location</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={navDestInput}
                  onChange={(e) => setNavDestInput(e.target.value)}
                  placeholder="Place, person name, or address (e.g. India Gate, Mom)…"
                  aria-label="Destination or saved person location"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                />
                <button
                  type="button"
                  disabled={!navDestInput.trim()}
                  onClick={() =>
                    onNavigateLocation({
                      destination: navDestInput,
                      mode: 'navigate',
                    })
                  }
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#E14B32] hover:bg-[#EC5E47] disabled:opacity-40 text-xs font-semibold text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>Navigate</span>
                </button>
                <button
                  type="button"
                  disabled={!navDestInput.trim()}
                  onClick={() =>
                    onNavigateLocation({
                      destination: navDestInput,
                      mode: 'view',
                    })
                  }
                  className="h-9 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View Pin
                </button>
              </div>

              {lastNavCard && (
                <div className="p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-[#F5F3EE] truncate">
                      {lastNavCard.destination}
                    </div>
                    <div className="text-[11px] font-mono text-[#78756E] mt-0.5 truncate">
                      {lastNavCard.originCoords
                        ? `Your GPS: ${lastNavCard.originCoords.lat}, ${lastNavCard.originCoords.lng}`
                        : 'Grant Location permission for start GPS'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={lastNavCard.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-[#E14B32] hover:bg-[#EC5E47] text-[11px] font-semibold text-[#F5F3EE]"
                    >
                      Maps ↗
                    </a>
                    <a
                      href={lastNavCard.androidNavUrl}
                      className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[11px] font-medium text-[#F5F3EE]"
                    >
                      GPS App
                    </a>
                  </div>
                </div>
              )}

              {/* Saved People & Place Locations */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const added = onAddSavedLocation(savedLocLabel, savedLocAddr);
                  if (added) {
                    setSavedLocLabel('');
                    setSavedLocAddr('');
                  }
                }}
                className="grid grid-cols-12 gap-1.5"
              >
                <input
                  type="text"
                  value={savedLocLabel}
                  onChange={(e) => setSavedLocLabel(e.target.value)}
                  placeholder="Label (e.g. Mom)"
                  aria-label="Saved location label"
                  className="col-span-4 h-8 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <input
                  type="text"
                  value={savedLocAddr}
                  onChange={(e) => setSavedLocAddr(e.target.value)}
                  placeholder="Address or lat,lng…"
                  aria-label="Saved location address"
                  className="col-span-6 h-8 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <button
                  type="submit"
                  disabled={!savedLocLabel.trim() || !savedLocAddr.trim()}
                  className="col-span-2 h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-medium text-[#F5F3EE] cursor-pointer"
                >
                  Save
                </button>
              </form>

              {savedLocations.length > 0 && (
                <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3">
                  {savedLocations.map((loc) => (
                    <li
                      key={loc.id}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-[#F5F3EE]">
                          {loc.label}
                        </span>
                        <span className="ml-2 text-[#A19E95] truncate">
                          {loc.addressOrCoords}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateLocation({
                              personName: loc.label,
                              mode: 'navigate',
                            })
                          }
                          className="text-[#E14B32] hover:underline cursor-pointer"
                        >
                          Go
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSavedLocation(loc.id)}
                          aria-label={`Remove location ${loc.label}`}
                          className="text-[#78756E] hover:text-[#F5F3EE] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Website Fixer & Worker */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                <Link2 className="w-4 h-4 text-[#E14B32]" />
                <span>Website Fixer &amp; Live Inspector</span>
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!siteUrlInput.trim()) return;
                  onInspectWebsite(siteUrlInput, siteTaskInput, true);
                }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={siteUrlInput}
                    onChange={(e) => setSiteUrlInput(e.target.value)}
                    placeholder="Any URL (even broken: htps://amazon.in, wikipedia.org)…"
                    aria-label="Website URL to fix and work on"
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                  />
                  <button
                    type="submit"
                    disabled={!siteUrlInput.trim() || websiteLoading}
                    className="h-9 px-3 rounded-lg bg-[#E14B32] hover:bg-[#EC5E47] disabled:opacity-40 text-xs font-semibold text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {websiteLoading ? 'Fixing…' : 'Fix & Open'}
                  </button>
                </div>
                <input
                  type="text"
                  value={siteTaskInput}
                  onChange={(e) => setSiteTaskInput(e.target.value)}
                  placeholder="Optional work/search inside site (e.g. wireless earbuds under 1500)…"
                  aria-label="Optional task query inside website"
                  className="w-full h-8 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE] placeholder:text-[#78756E]"
                />
              </form>

              {lastWebsiteWork && (
                <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#F5F3EE] truncate">
                      {lastWebsiteWork.title || lastWebsiteWork.fixedUrl}
                    </span>
                    <span className="font-mono text-[11px] text-[#E6B86E] shrink-0">
                      HTTP {lastWebsiteWork.status}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#78756E] truncate">
                    Fixed URL: {lastWebsiteWork.fixedUrl}
                  </p>
                  {lastWebsiteWork.textPreview && (
                    <p className="text-[#D7D4CC] leading-relaxed line-clamp-3">
                      {lastWebsiteWork.textPreview}
                    </p>
                  )}
                  {lastWebsiteWork.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {lastWebsiteWork.links.slice(0, 4).map((l, idx) => (
                        <a
                          key={idx}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#E14B32] hover:underline"
                        >
                          <span className="truncate max-w-[140px]">
                            {l.text}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Weather */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <CloudSun className="w-4 h-4 text-[#E14B32]" />
                  <span>Live Weather</span>
                </h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onFetchWeather(weatherCity);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={weatherCity}
                  onChange={(e) => setWeatherCity(e.target.value)}
                  placeholder="Enter city (e.g. Delhi, Mumbai, Patna)…"
                  aria-label="Weather city"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                />
                <button
                  type="submit"
                  disabled={weatherLoading}
                  className="h-9 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {weatherLoading ? 'Loading…' : 'Check Weather'}
                </button>
              </form>

              {weatherReport && (
                <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#F5F3EE]">
                      {weatherReport.city}
                      {weatherReport.country ? `, ${weatherReport.country}` : ''}
                    </div>
                    <div className="text-xs text-[#A19E95] mt-0.5 tabular-nums">
                      {weatherReport.condition} · Feels {weatherReport.feelsLikeC}°C · Humidity{' '}
                      {weatherReport.humidity}%
                    </div>
                  </div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#E14B32]">
                    {weatherReport.temperatureC}°C
                  </div>
                </div>
              )}
            </div>

            {/* Live News Headlines */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <Newspaper className="w-4 h-4 text-[#E14B32]" />
                  <span>Live News Headlines</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewsLang('hi');
                      onFetchNews('', 'hi');
                    }}
                    className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                      newsLang === 'hi'
                        ? 'bg-[#1D1D23] text-[#F5F3EE]'
                        : 'text-[#A19E95]'
                    }`}
                  >
                    Hindi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewsLang('en');
                      onFetchNews('', 'en');
                    }}
                    className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                      newsLang === 'en'
                        ? 'bg-[#1D1D23] text-[#F5F3EE]'
                        : 'text-[#A19E95]'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    disabled={newsLoading}
                    onClick={() => onFetchNews('', newsLang)}
                    className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#F5F3EE] cursor-pointer"
                  >
                    {newsLoading ? '…' : 'Fetch'}
                  </button>
                </div>
              </div>

              {newsHeadlines.length === 0 ? (
                <p className="text-xs text-[#78756E]">
                  Tap Fetch or ask Swati “आज की ताज़ा खबरें सुनाओ” to read real-time headlines.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                  {newsHeadlines.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="py-2.5 text-xs">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F5F3EE] hover:text-[#E14B32] leading-snug block"
                      >
                        {item.title}
                      </a>
                      <span className="text-[11px] text-[#78756E] mt-0.5 block">
                        {item.source}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Message Drafts */}
            {messageDrafts.length > 0 && (
              <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
                <h3 className="text-sm font-semibold text-[#F5F3EE]">
                  Message Drafts
                </h3>
                <div className="space-y-2">
                  {messageDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs text-[#A19E95]">
                        <span>
                          {draft.platform} · {draft.recipient}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCopyDraft(draft)}
                            className="text-[#E14B32] hover:underline cursor-pointer"
                          >
                            {copiedDraftId === draft.id ? 'Copied' : 'Copy'}
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(draft.text)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#F5F3EE] hover:underline"
                          >
                            WhatsApp ↗
                          </a>
                        </div>
                      </div>
                      <p className="text-xs text-[#F5F3EE] leading-relaxed">
                        {draft.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Launched Links Archive */}
            {openedLinks.length > 0 && (
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <h3 className="text-sm font-semibold text-[#F5F3EE]">
                  Launched Links ({openedLinks.length})
                </h3>
                <ul className="divide-y divide-white/[0.06]">
                  {openedLinks.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="truncate text-[#F5F3EE]">
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => onReopenLink(item.url)}
                        className="inline-flex items-center gap-1 text-[#E14B32] hover:underline shrink-0 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 5. SYSTEM: AI MODELS, PERSONALITY, DEVICE CONTROLS, PERMISSIONS & PRIVACY */}
        {activeTab === 'system' && (
          <div id="system" className="space-y-6">
            {/* Multiple AI Models Switcher */}
            <div className="space-y-2.5">
              <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                <Cpu className="w-4 h-4 text-[#E14B32]" />
                <span>AI Voice Model</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onUpdateSettings({ model: m.id })}
                    className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      settings.model === m.id
                        ? 'bg-[#E14B32]/12 border-[#E14B32]/70'
                        : 'bg-[#0B0B0D] border-white/[0.08]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#F5F3EE]">
                      {m.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#A19E95]">
                      {m.note}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom AI Personality & Voice Selection */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3.5">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                <User className="w-4 h-4 text-[#E14B32]" />
                <span>Custom AI Personality &amp; Voice</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="pet-name-input"
                    className="block text-[11px] text-[#A19E95] mb-1"
                  >
                    What should Swati call you?
                  </label>
                  <input
                    id="pet-name-input"
                    type="text"
                    value={settings.userPetName}
                    onChange={(e) =>
                      onUpdateSettings({ userPetName: e.target.value })
                    }
                    placeholder="Jaan, Babu, Boss…"
                    className="w-full h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-personality-input"
                    className="block text-[11px] text-[#A19E95] mb-1"
                  >
                    Custom Personality Directive
                  </label>
                  <input
                    id="custom-personality-input"
                    type="text"
                    value={settings.customPersonalityNote}
                    onChange={(e) =>
                      onUpdateSettings({
                        customPersonalityNote: e.target.value,
                      })
                    }
                    placeholder="e.g. Speak softly & motivate me for exams"
                    className="w-full h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] text-xs text-[#F5F3EE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onUpdateSettings({ languageMode: lang.id })}
                    className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      settings.languageMode === lang.id
                        ? 'bg-[#E14B32]/12 border-[#E14B32]/70'
                        : 'bg-[#0B0B0D] border-white/[0.08]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#F5F3EE]">
                      {lang.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#A19E95]">
                      {lang.note}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SASS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ sassLevel: opt.id })}
                    className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      settings.sassLevel === opt.id
                        ? 'bg-[#E14B32]/12 border-[#E14B32]/70'
                        : 'bg-[#0B0B0D] border-white/[0.08]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#F5F3EE]">
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#A19E95] leading-snug">
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onUpdateSettings({ voice: v.id })}
                    className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      settings.voice === v.id
                        ? 'bg-[#E14B32]/12 border-[#E14B32]/70'
                        : 'bg-[#0B0B0D] border-white/[0.08]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#F5F3EE]">
                      {v.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#A19E95]">
                      {v.note}
                    </div>
                  </button>
                ))}
              </div>

              {pendingSettingsApply && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#E14B32]/10 border border-[#E14B32]/40">
                  <span className="text-xs text-[#F5F3EE]">
                    Reconnect to apply model, voice, or personality changes.
                  </span>
                  <button
                    type="button"
                    onClick={onApplyAndReconnect}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E14B32] hover:bg-[#EC5E47] text-xs font-semibold text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span>Apply &amp; Reconnect</span>
                  </button>
                </div>
              )}
            </div>

            {/* Wake Word & Floating Bubble */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                <div>
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Wake Word (“Backup Swati”)
                  </div>
                  <div className="text-[11px] text-[#A19E95] mt-0.5">
                    {wakeWordSupported
                      ? 'Listens for “Backup Swati” while tab is active (respects mic & battery limits).'
                      : 'Web Speech Recognition unavailable in this browser.'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!wakeWordSupported}
                  onClick={() =>
                    onUpdateSettings({
                      wakeWordEnabled: !settings.wakeWordEnabled,
                    })
                  }
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                    settings.wakeWordEnabled
                      ? 'bg-[#E14B32] text-[#F5F3EE]'
                      : 'bg-white/[0.08] text-[#D7D4CC]'
                  }`}
                >
                  {settings.wakeWordEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                <div>
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Floating Assistant Bubble
                  </div>
                  <div className="text-[11px] text-[#A19E95] mt-0.5">
                    Shows compact quick-talk bubble in the corner of the screen.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      floatingBubbleEnabled: !settings.floatingBubbleEnabled,
                    })
                  }
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.floatingBubbleEnabled
                      ? 'bg-[#E14B32] text-[#F5F3EE]'
                      : 'bg-white/[0.08] text-[#D7D4CC]'
                  }`}
                >
                  {settings.floatingBubbleEnabled ? 'Shown' : 'Hidden'}
                </button>
              </div>
            </div>

            {/* Hardware & Device Status Grid */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#F5F3EE]">
                  Device Telemetry &amp; Controls
                </h3>
                {activeControlFocus && (
                  <span className="text-xs text-[#E14B32]">
                    Focus: {activeControlFocus.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#A19E95]">
                    <span>Battery</span>
                    {deviceStatus.batteryCharging ? (
                      <BatteryCharging className="w-4 h-4 text-[#E6B86E]" />
                    ) : (
                      <Battery className="w-4 h-4" />
                    )}
                  </div>
                  <div className="mt-1.5 text-base font-semibold font-mono tabular-nums text-[#F5F3EE]">
                    {deviceStatus.batteryLevel !== null
                      ? `${deviceStatus.batteryLevel}%`
                      : 'Restricted'}
                  </div>
                  <div className="mt-0.5 text-xs text-[#78756E]">
                    {deviceStatus.batteryCharging === true
                      ? 'Charging'
                      : deviceStatus.batteryCharging === false
                        ? 'On battery'
                        : 'Browser blocked API'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#A19E95]">
                    <span>Wi-Fi / Network</span>
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-[#F5F3EE]">
                    {deviceStatus.online ? 'Connected' : 'Offline'}
                  </div>
                  <div className="mt-0.5 text-xs text-[#78756E] uppercase font-mono">
                    {deviceStatus.connectionType}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleFlashlight}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    deviceStatus.flashlightOn
                      ? 'bg-[#F5E7B8]/12 border-[#F5E7B8]/60'
                      : 'bg-[#0B0B0D] border-white/[0.08] hover:border-white/[0.18]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#A19E95]">
                    <span>Flashlight</span>
                    <Flashlight
                      className={`w-4 h-4 ${
                        deviceStatus.flashlightOn ? 'text-[#F5E7B8]' : ''
                      }`}
                    />
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-[#F5F3EE]">
                    {deviceStatus.flashlightOn ? 'ON' : 'OFF'}
                  </div>
                  <div className="mt-0.5 text-xs text-[#78756E]">
                    {deviceStatus.flashlightHardware
                      ? 'Hardware torch active'
                      : 'Tap to toggle torch'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onCaptureScreenshot}
                  className="text-left p-3.5 rounded-lg bg-[#0B0B0D] border border-white/[0.08] hover:border-[#E14B32]/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-[#A19E95]">
                    <span>Screenshot</span>
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-[#F5F3EE]">
                    Capture PNG
                  </div>
                  <div className="mt-0.5 text-xs text-[#78756E] tabular-nums">
                    {screenshots.length} saved
                  </div>
                </button>
              </div>

              {/* Volume & Brightness Sliders */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#D7D4CC]">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Voice Volume</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#F5F3EE]">
                      {deviceStatus.volume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={deviceStatus.volume}
                    onChange={(e) => onSetVolume(Number(e.target.value))}
                    aria-label="Voice volume"
                    className="w-full accent-[#E14B32] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#D7D4CC]">
                      <Sun className="w-3.5 h-3.5" />
                      <span>Display Brightness</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#F5F3EE]">
                      {deviceStatus.brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    step={10}
                    value={deviceStatus.brightness}
                    onChange={(e) => onSetBrightness(Number(e.target.value))}
                    aria-label="Display brightness"
                    className="w-full accent-[#E14B32] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Timers & Alarms */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <Timer className="w-4 h-4 text-[#E14B32]" />
                  <span>Timers &amp; Alarms</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAddTimer(60, '1 Min Focus')}
                    className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-[#F5F3EE] cursor-pointer"
                  >
                    +1m
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddTimer(300, '5 Min Break')}
                    className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-[#F5F3EE] cursor-pointer"
                  >
                    +5m
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onAddAlarm(newAlarmTime, newAlarmLabel);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="time"
                  value={newAlarmTime}
                  onChange={(e) => setNewAlarmTime(e.target.value)}
                  aria-label="Alarm time"
                  className="h-9 px-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.10] text-xs font-mono text-[#F5F3EE]"
                />
                <input
                  type="text"
                  value={newAlarmLabel}
                  onChange={(e) => setNewAlarmLabel(e.target.value)}
                  placeholder="Alarm label"
                  aria-label="Alarm label"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#0B0B0D] border border-white/[0.10] text-xs text-[#F5F3EE]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Alarm</span>
                </button>
              </form>

              {(timers.length > 0 || alarms.length > 0) && (
                <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                  {timers.map((t) => (
                    <li
                      key={t.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Timer className="w-3.5 h-3.5 text-[#E14B32] shrink-0" />
                        <span className="text-[#F5F3EE] truncate">
                          {t.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono tabular-nums text-[#E6B86E]">
                          {t.ringing
                            ? 'RINGING'
                            : formatDuration(t.remainingSeconds)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveTimer(t.id)}
                          aria-label={`Delete timer ${t.label}`}
                          className="text-[#78756E] hover:text-[#F5F3EE] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {alarms.map((a) => (
                    <li
                      key={a.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlarmClock className="w-3.5 h-3.5 text-[#E6B86E] shrink-0" />
                        <span className="font-mono tabular-nums text-[#F5F3EE]">
                          {a.time24h}
                        </span>
                        <span className="text-[#A19E95] truncate">
                          {a.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleAlarm(a.id)}
                          className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                            a.enabled
                              ? 'bg-[#E14B32]/20 text-[#F5F3EE]'
                              : 'bg-white/[0.05] text-[#78756E]'
                          }`}
                        >
                          {a.ringing ? 'Ringing' : a.enabled ? 'On' : 'Off'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveAlarm(a.id)}
                          aria-label={`Delete alarm ${a.label}`}
                          className="text-[#78756E] hover:text-[#F5F3EE] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* All Connected Phone Apps & Custom App Connector */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                  <Smartphone className="w-4 h-4 text-[#E14B32]" />
                  <span>
                    All Connected Phone Apps ({APP_DIRECTORY.length + customApps.length})
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={handleBluetoothScan}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A19E95] hover:text-[#F5F3EE] cursor-pointer"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Bluetooth Pair</span>
                </button>
              </div>
              {bluetoothNotice && (
                <p className="text-xs text-[#A19E95]">{bluetoothNotice}</p>
              )}

              {/* Category Filter Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  'All',
                  'Phone',
                  'Social',
                  'Media',
                  'Travel',
                  'Finance',
                  'Shopping',
                  'Work',
                  'Custom',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAppCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                      appCategoryFilter === cat
                        ? 'bg-[#E14B32] text-[#F5F3EE]'
                        : 'bg-[#0B0B0D] text-[#A19E95] border border-white/[0.08] hover:text-[#F5F3EE]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-0.5">
                {appCategoryFilter !== 'Custom' &&
                  APP_DIRECTORY.filter(
                    (app) =>
                      appCategoryFilter === 'All' ||
                      app.category === appCategoryFilter
                  ).map((app) => (
                    <button
                      key={app.key}
                      type="button"
                      onClick={() => onLaunchApp(app.name)}
                      title={app.description}
                      className="px-3 py-2 rounded-lg bg-[#0B0B0D] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-[#F5F3EE] text-left truncate cursor-pointer"
                    >
                      {app.name}
                    </button>
                  ))}

                {(appCategoryFilter === 'All' ||
                  appCategoryFilter === 'Custom') &&
                  customApps.map((cApp) => (
                    <div
                      key={cApp.id}
                      className="flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg bg-[#0B0B0D] border border-[#E6B86E]/40 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onLaunchApp(cApp.name)}
                        className="text-left font-medium text-[#F5F3EE] truncate cursor-pointer flex-1 min-w-0"
                      >
                        {cApp.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomApp(cApp.id)}
                        aria-label={`Remove ${cApp.name}`}
                        className="text-[#78756E] hover:text-[#F5F3EE] shrink-0 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>

              {/* Add Any Custom Phone App */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const added = onAddCustomApp(
                    customAppName,
                    customAppUrl,
                    'Custom',
                    customAppIntent
                  );
                  if (!added) {
                    setCustomAppError(
                      'Enter a valid app name and URL / intent:// scheme.'
                    );
                    return;
                  }
                  setCustomAppError(null);
                  setCustomAppName('');
                  setCustomAppUrl('');
                  setCustomAppIntent('');
                }}
                className="p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-2"
              >
                <div className="text-[11px] font-semibold text-[#D7D4CC]">
                  Connect Custom Phone App (any extra app on your phone)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value)}
                    placeholder="App Name (e.g. Hotstar)"
                    aria-label="Custom app name"
                    className="h-8 px-2.5 rounded bg-[#131317] border border-white/[0.08] text-xs text-[#F5F3EE]"
                  />
                  <input
                    type="text"
                    value={customAppUrl}
                    onChange={(e) => setCustomAppUrl(e.target.value)}
                    placeholder="URL or scheme (hotstar.com)"
                    aria-label="Custom app URL"
                    className="h-8 px-2.5 rounded bg-[#131317] border border-white/[0.08] text-xs text-[#F5F3EE]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customAppIntent}
                    onChange={(e) => setCustomAppIntent(e.target.value)}
                    placeholder="Optional Android intent:// package URI"
                    aria-label="Optional Android intent URI"
                    className="flex-1 min-w-0 h-8 px-2.5 rounded bg-[#131317] border border-white/[0.08] text-xs font-mono text-[#F5F3EE]"
                  />
                  <button
                    type="submit"
                    disabled={!customAppName.trim() || !customAppUrl.trim()}
                    className="h-8 px-3 rounded bg-[#E14B32] hover:bg-[#EC5E47] disabled:opacity-40 text-xs font-semibold text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Connect App
                  </button>
                </div>
                {customAppError && (
                  <p className="text-[11px] text-[#E14B32]">{customAppError}</p>
                )}
              </form>

              {/* Phone Automation & Android Companion Bridge */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-[#F5F3EE]">
                      Android Native Deep-Link Mode
                    </div>
                    <div className="text-[11px] text-[#A19E95] mt-0.5">
                      Uses intent://, whatsapp:// &amp; google.navigation: URIs on Android phones.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        androidDeepLinkMode: !settings.androidDeepLinkMode,
                      })
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.androidDeepLinkMode
                        ? 'bg-[#E14B32] text-[#F5F3EE]'
                        : 'bg-white/[0.08] text-[#D7D4CC]'
                    }`}
                  >
                    {settings.androidDeepLinkMode ? 'Android' : 'Web Links'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-[#F5F3EE]">
                      Auto-Type &amp; Instant Send
                    </div>
                    <div className="text-[11px] text-[#A19E95] mt-0.5">
                      Opens WhatsApp/SMS automatically once Swati finishes auto-typing.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        autoConfirmMessages: !settings.autoConfirmMessages,
                      })
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.autoConfirmMessages
                        ? 'bg-[#E14B32] text-[#F5F3EE]'
                        : 'bg-white/[0.08] text-[#D7D4CC]'
                    }`}
                  >
                    {settings.autoConfirmMessages ? 'Instant' : 'Ask 1-Tap'}
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08] space-y-1.5">
                  <label
                    htmlFor="android-bridge-input"
                    className="block text-xs font-semibold text-[#F5F3EE]"
                  >
                    Android Companion Webhook (MacroDroid / Tasker)
                  </label>
                  <input
                    id="android-bridge-input"
                    type="url"
                    value={settings.androidBridgeWebhookUrl}
                    onChange={(e) =>
                      onUpdateSettings({
                        androidBridgeWebhookUrl: e.target.value,
                      })
                    }
                    placeholder="https://trigger.macrodroid.com/your-id/swati"
                    className="w-full h-8 px-2.5 rounded bg-[#131317] border border-white/[0.08] text-xs font-mono text-[#F5F3EE]"
                  />
                  <p className="text-[11px] text-[#78756E] leading-snug">
                    Optional HTTPS webhook for full Android Accessibility auto-tapping across native apps outside the browser.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="intent:#Intent;action=android.settings.WIFI_SETTINGS;end"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-xs text-[#D7D4CC]"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Android Wi-Fi Settings</span>
                </a>
                <a
                  href="intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-xs text-[#D7D4CC]"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Android Bluetooth Settings</span>
                </a>
              </div>
            </div>

            {/* App Permission Manager */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <h3 className="text-sm font-semibold text-[#F5F3EE]">
                App Permission Manager
              </h3>
              <ul className="divide-y divide-white/[0.06] bg-[#0B0B0D] border border-white/[0.08] rounded-lg px-3.5">
                {(
                  [
                    {
                      key: 'microphone',
                      label: 'Microphone Access',
                      status: permissions.microphone,
                    },
                    {
                      key: 'location',
                      label: 'GPS Location & Navigation',
                      status: permissions.location,
                    },
                    {
                      key: 'camera',
                      label: 'Camera / Flashlight Torch',
                      status: permissions.camera,
                    },
                    {
                      key: 'notifications',
                      label: 'Browser Notifications',
                      status: permissions.notifications,
                    },
                  ] as const
                ).map((perm) => (
                  <li
                    key={perm.key}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-[#F5F3EE] font-medium">
                        {perm.label}
                      </span>
                      <span className="ml-2 font-mono text-[11px] uppercase text-[#A19E95]">
                        · {perm.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequestPermission(perm.key)}
                      className="px-2.5 py-1 rounded bg-white/[0.07] hover:bg-white/[0.14] text-xs text-[#F5F3EE] cursor-pointer"
                    >
                      Request
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Privacy Protection */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F5F3EE]">
                <Lock className="w-4 h-4 text-[#E14B32]" />
                <span>Privacy Protection</span>
              </h3>

              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                <div>
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Incognito / No-Save Mode
                  </div>
                  <div className="text-[11px] text-[#A19E95] mt-0.5">
                    Pauses saving transcript, memories, health &amp; tasks to browser storage.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ privacyMode: !settings.privacyMode })
                  }
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.privacyMode
                      ? 'bg-[#E14B32] text-[#F5F3EE]'
                      : 'bg-white/[0.08] text-[#D7D4CC]'
                  }`}
                >
                  {settings.privacyMode ? 'Protected' : 'Standard'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0B0D] border border-white/[0.08]">
                <div>
                  <div className="text-xs font-semibold text-[#F5F3EE]">
                    Wipe All Local Data
                  </div>
                  <div className="text-[11px] text-[#A19E95] mt-0.5">
                    Clears saved memories, transcript, to-dos, timetable &amp; health logs.
                  </div>
                </div>
                {confirmWipe ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onWipeAllLocalData();
                        setConfirmWipe(false);
                      }}
                      className="px-2.5 py-1.5 rounded-md bg-[#E14B32] text-xs font-semibold text-[#F5F3EE] cursor-pointer"
                    >
                      Confirm Wipe
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(false)}
                      className="px-2 py-1.5 rounded-md bg-white/[0.08] text-xs text-[#D7D4CC] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(true)}
                    className="px-3 py-1.5 rounded-md bg-white/[0.08] hover:bg-[#E14B32]/80 text-xs font-medium text-[#F5F3EE] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Wipe Data
                  </button>
                )}
              </div>
            </div>

            {/* Live Audio Meters */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A19E95]">
                  Mic Input ({formatDuration(sessionSeconds)})
                </span>
                <span className="font-mono tabular-nums text-[#D7D4CC]">
                  {Math.round(inputLevel * 100)}%
                </span>
              </div>
              <SegmentedMeter
                level={connectionState === 'connected' ? inputLevel : 0}
                activeColorClass="bg-[#F5F3EE]"
              />
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#A19E95]">Swati Output (24 kHz)</span>
                <span className="font-mono tabular-nums text-[#D7D4CC]">
                  {Math.round(outputLevel * 100)}%
                </span>
              </div>
              <SegmentedMeter
                level={connectionState === 'connected' ? outputLevel : 0}
                activeColorClass="bg-[#E14B32]"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
