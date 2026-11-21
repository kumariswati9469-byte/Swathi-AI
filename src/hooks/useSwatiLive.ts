import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AlarmItem,
  ClientToServerMessage,
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
  ServerToClientMessage,
  SessionSettings,
  TimerItem,
  TimetableSlot,
  TodoItem,
  TranscriptEntry,
  TypingPreviewState,
  UserMood,
  VoicePreset,
  WeatherReport,
  WebsiteInspectionResult,
} from '../types/live.ts';
import {
  base64PcmToFloat32,
  computeRms,
  float32ToBase64Pcm,
  formatClockTime,
  sanitizeExternalUrl,
} from '../utils/audio.ts';
import {
  APP_DIRECTORY,
  createWorkspaceSnapshotPng,
  getCurrentGpsPosition,
  normalizeAndFixUrl,
  playAlertChime,
  readBatteryStatus,
  readNetworkStatus,
  resolveAppEntry,
  setHardwareFlashlight,
} from '../utils/deviceControl.ts';

const MEMORIES_STORAGE_KEY = 'swati_memories_v1';
const TRANSCRIPT_STORAGE_KEY = 'swati_recent_transcript_v1';
const SETTINGS_STORAGE_KEY = 'swati_settings_v3';
const HEALTH_STORAGE_KEY = 'swati_health_v1';
const TODOS_STORAGE_KEY = 'swati_todos_v1';
const TIMETABLE_STORAGE_KEY = 'swati_timetable_v1';
const EMERGENCY_STORAGE_KEY = 'swati_emergency_v1';
const CUSTOM_APPS_STORAGE_KEY = 'swati_custom_apps_v1';
const SAVED_LOCATIONS_STORAGE_KEY = 'swati_locations_v1';

const DEFAULT_SETTINGS: SessionSettings = {
  model: 'gemini-3.8-live',
  voice: 'Aoede',
  sassLevel: 'girlfriend',
  languageMode: 'bilingual',
  wakeWordEnabled: false,
  floatingBubbleEnabled: true,
  privacyMode: false,
  userPetName: 'Jaan',
  customPersonalityNote: '',
  androidDeepLinkMode: false,
  autoConfirmMessages: false,
  androidBridgeWebhookUrl: '',
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function triggerExternalUri(url: string): boolean {
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    if (/^https?:/i.test(url)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch {
    return false;
  }
}

function loadJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const DEFAULT_HEALTH: HealthState = {
  mood: 'Calm',
  waterGlasses: 3,
  waterGoal: 8,
  sleepHours: 7,
  lastMeal: 'Not logged yet',
  lastCheckinAt: '--:--',
  notes: [],
};

const DEFAULT_TIMETABLE: TimetableSlot[] = [
  { id: 'tt_1', time: '07:30 AM', activity: 'Morning Hydration & Stretch', done: false },
  { id: 'tt_2', time: '10:00 AM', activity: 'Deep Study / Work Session', done: false },
  { id: 'tt_3', time: '01:30 PM', activity: 'Lunch & Short Walk', done: false },
  { id: 'tt_4', time: '08:30 PM', activity: 'Dinner & Wind-down', done: false },
];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    app: 'WhatsApp',
    sender: 'Mom',
    body: 'Khaana kha liya beta? Sham ko ghar aana.',
    time: '06:45 PM',
    read: false,
  },
  {
    id: 'notif_2',
    app: 'Calendar',
    sender: 'Swati Care',
    body: 'Hydration & eye-rest break scheduled.',
    time: '07:00 PM',
    read: false,
  },
];

const DEFAULT_EMERGENCY: EmergencyContact = {
  name: 'Emergency Services',
  phone: '112',
  relation: 'Emergency Helpline',
};

export interface SwatiLiveHook {
  connectionState: ConnectionState;
  isMuted: boolean;
  isMicAvailable: boolean;
  isSwatiSpeaking: boolean;
  wakeWordSupported: boolean;
  wakeWordListening: boolean;
  errorMessage: string | null;
  micNotice: string | null;
  internetError: string | null;
  settings: SessionSettings;
  pendingSettingsApply: boolean;
  sessionSeconds: number;
  inputLevel: number;
  outputLevel: number;
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
  typingPreview: TypingPreviewState | null;
  activeControlFocus: string | null;
  inputAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  outputAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  connect: (overrideSettings?: SessionSettings) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  interruptSwati: () => void;
  sendTextMessage: (text: string) => Promise<void>;
  updateSettings: (partial: Partial<SessionSettings>) => void;
  applyAndReconnect: () => Promise<void>;
  clearTranscript: () => void;
  reopenLink: (url: string) => void;
  setVolume: (level: number) => void;
  setBrightness: (level: number) => void;
  toggleFlashlight: (enabled?: boolean) => Promise<void>;
  captureScreenshot: (label?: string) => ScreenshotItem;
  addTimer: (durationSeconds: number, label?: string) => TimerItem;
  removeTimer: (id: string) => void;
  addAlarm: (time24h: string, label?: string) => AlarmItem;
  toggleAlarm: (id: string) => void;
  removeAlarm: (id: string) => void;
  dismissRinging: () => void;
  addMemory: (fact: string, category?: string) => MemoryItem;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
  launchAppByName: (appName: string) => void;
  addCustomApp: (
    name: string,
    url: string,
    category?: string,
    androidIntent?: string
  ) => CustomPhoneApp | null;
  removeCustomApp: (id: string) => void;
  addSavedLocation: (
    label: string,
    addressOrCoords: string
  ) => SavedLocation | null;
  removeSavedLocation: (id: string) => void;
  navigateToDestination: (params: {
    destination?: string;
    personName?: string;
    mode?: 'navigate' | 'view' | 'share_my_location';
    openInMaps?: boolean;
  }) => Promise<LocationNavigationCard>;
  inspectWebsiteUrl: (
    rawUrl: string,
    siteTaskQuery?: string,
    openInTab?: boolean
  ) => Promise<WebsiteInspectionResult | null>;
  triggerAutoTypeAndSend: (params: {
    recipient: string;
    platform?: string;
    phoneOrHandle?: string;
    messageText: string;
  }) => Promise<TypingPreviewState>;
  dismissTypingPreview: () => void;
  updateHealth: (partial: Partial<HealthState>) => void;
  incrementWater: (delta?: number) => void;
  fetchWeather: (city: string) => Promise<WeatherReport | null>;
  fetchNews: (topic?: string, lang?: 'hi' | 'en') => Promise<NewsHeadline[]>;
  askWebQuestion: (question: string) => Promise<GroundedAnswer | null>;
  searchGoogleUrl: (query: string) => void;
  searchYouTubeUrl: (query: string) => void;
  approveConfirmation: (id: string) => void;
  cancelConfirmation: (id: string) => void;
  addTodo: (title: string, priority?: 'normal' | 'high') => TodoItem;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  addTimetableSlot: (time: string, activity: string) => TimetableSlot;
  toggleTimetableSlot: (id: string) => void;
  removeTimetableSlot: (id: string) => void;
  runRoutine: (name: 'morning' | 'study' | 'night') => Promise<string>;
  addNotification: (app: string, sender: string, body: string) => void;
  markNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  updateEmergencyContact: (contact: EmergencyContact) => void;
  refreshPermissions: () => Promise<void>;
  requestPermission: (
    kind: 'microphone' | 'camera' | 'notifications' | 'location'
  ) => Promise<void>;
  wipeAllLocalData: () => void;
}

export function useSwatiLive(
  onNavigateTab?: (
    tab: 'transcript' | 'planner' | 'care' | 'internet' | 'system'
  ) => void
): SwatiLiveHook {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(true);
  const [isSwatiSpeaking, setIsSwatiSpeaking] = useState(false);
  const [wakeWordListening, setWakeWordListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [internetError, setInternetError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SessionSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJsonStorage<Partial<SessionSettings>>(
      SETTINGS_STORAGE_KEY,
      DEFAULT_SETTINGS
    ),
  }));
  const [activeSessionSettings, setActiveSessionSettings] =
    useState<SessionSettings | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() =>
    loadJsonStorage<TranscriptEntry[]>(TRANSCRIPT_STORAGE_KEY, [])
  );
  const [openedLinks, setOpenedLinks] = useState<OpenedLinkItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>(() =>
    loadJsonStorage<MemoryItem[]>(MEMORIES_STORAGE_KEY, [])
  );
  const [healthState, setHealthState] = useState<HealthState>(() =>
    loadJsonStorage<HealthState>(HEALTH_STORAGE_KEY, DEFAULT_HEALTH)
  );
  const [todos, setTodos] = useState<TodoItem[]>(() =>
    loadJsonStorage<TodoItem[]>(TODOS_STORAGE_KEY, [])
  );
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() =>
    loadJsonStorage<TimetableSlot[]>(TIMETABLE_STORAGE_KEY, DEFAULT_TIMETABLE)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    DEFAULT_NOTIFICATIONS
  );
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(
    () => loadJsonStorage<EmergencyContact>(EMERGENCY_STORAGE_KEY, DEFAULT_EMERGENCY)
  );
  const [customApps, setCustomApps] = useState<CustomPhoneApp[]>(() =>
    loadJsonStorage<CustomPhoneApp[]>(CUSTOM_APPS_STORAGE_KEY, [])
  );
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() =>
    loadJsonStorage<SavedLocation[]>(SAVED_LOCATIONS_STORAGE_KEY, [])
  );
  const [permissions, setPermissions] = useState<PermissionSnapshot>({
    microphone: 'prompt',
    camera: 'prompt',
    notifications:
      typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
    location: 'prompt',
  });

  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [weatherReport, setWeatherReport] = useState<WeatherReport | null>(
    null
  );
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadline[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [groundedAnswers, setGroundedAnswers] = useState<GroundedAnswer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lastNavCard, setLastNavCard] = useState<LocationNavigationCard | null>(
    null
  );
  const [lastWebsiteWork, setLastWebsiteWork] =
    useState<WebsiteInspectionResult | null>(null);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [typingPreview, setTypingPreview] = useState<TypingPreviewState | null>(
    null
  );
  const [messageDrafts, setMessageDrafts] = useState<MessageDraft[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    PendingConfirmation[]
  >([]);
  const [activeControlFocus, setActiveControlFocus] = useState<string | null>(
    null
  );

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(() => ({
    volume: 90,
    brightness: 100,
    flashlightOn: false,
    flashlightHardware: false,
    batteryLevel: null,
    batteryCharging: null,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: readNetworkStatus().connectionType,
  }));

  const wakeWordSupported = Boolean(getSpeechRecognitionCtor());

  const wsRef = useRef<WebSocket | null>(null);
  const isMutedRef = useRef(false);
  const isConnectedRef = useRef(false);
  const queuedPromptRef = useRef<string | null>(null);
  const lastAlarmFiredMinuteRef = useRef<string>('');
  const typingIntervalRef = useRef<number | null>(null);

  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const pendingUserTranscriptIdRef = useRef<string | null>(null);
  const pendingSwatiTranscriptIdRef = useRef<string | null>(null);

  const deviceStatusRef = useRef(deviceStatus);
  deviceStatusRef.current = deviceStatus;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const customAppsRef = useRef(customApps);
  customAppsRef.current = customApps;
  const savedLocationsRef = useRef(savedLocations);
  savedLocationsRef.current = savedLocations;
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const memoriesRef = useRef(memories);
  memoriesRef.current = memories;
  const healthRef = useRef(healthState);
  healthRef.current = healthState;
  const timersRef = useRef(timers);
  timersRef.current = timers;
  const alarmsRef = useRef(alarms);
  alarmsRef.current = alarms;
  const todosRef = useRef(todos);
  todosRef.current = todos;
  const timetableRef = useRef(timetable);
  timetableRef.current = timetable;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const pendingConfirmationsRef = useRef(pendingConfirmations);
  pendingConfirmationsRef.current = pendingConfirmations;
  const emergencyRef = useRef(emergencyContact);
  emergencyRef.current = emergencyContact;

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
    } catch {
      // ignore
    }
  }, [memories, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(healthState));
    } catch {
      // ignore
    }
  }, [healthState, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
    } catch {
      // ignore
    }
  }, [todos, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(timetable));
    } catch {
      // ignore
    }
  }, [timetable, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(
        EMERGENCY_STORAGE_KEY,
        JSON.stringify(emergencyContact)
      );
    } catch {
      // ignore
    }
  }, [emergencyContact, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(
        TRANSCRIPT_STORAGE_KEY,
        JSON.stringify(transcript.slice(-24))
      );
    } catch {
      // ignore
    }
  }, [transcript, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(customApps));
    } catch {
      // ignore
    }
  }, [customApps, settings.privacyMode]);

  useEffect(() => {
    if (settings.privacyMode) return;
    try {
      localStorage.setItem(
        SAVED_LOCATIONS_STORAGE_KEY,
        JSON.stringify(savedLocations)
      );
    } catch {
      // ignore
    }
  }, [savedLocations, settings.privacyMode]);

  const refreshPermissions = useCallback(async () => {
    const next: PermissionSnapshot = {
      microphone: 'prompt',
      camera: 'prompt',
      notifications:
        typeof Notification !== 'undefined'
          ? Notification.permission
          : 'unsupported',
      location:
        typeof navigator !== 'undefined' && navigator.geolocation
          ? 'prompt'
          : 'unsupported',
    };
    if (navigator.permissions?.query) {
      try {
        const mic = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        next.microphone = mic.state;
      } catch {
        next.microphone = 'unknown';
      }
      try {
        const cam = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        next.camera = cam.state;
      } catch {
        next.camera = 'unknown';
      }
      try {
        const geo = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        next.location = geo.state;
      } catch {
        next.location = 'unknown';
      }
    }
    setPermissions(next);
  }, []);

  const requestPermission = useCallback(
    async (kind: 'microphone' | 'camera' | 'notifications' | 'location') => {
      try {
        if (kind === 'microphone' && navigator.mediaDevices?.getUserMedia) {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          s.getTracks().forEach((t) => t.stop());
        } else if (kind === 'camera' && navigator.mediaDevices?.getUserMedia) {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          s.getTracks().forEach((t) => t.stop());
        } else if (
          kind === 'notifications' &&
          typeof Notification !== 'undefined'
        ) {
          await Notification.requestPermission();
        } else if (kind === 'location') {
          await getCurrentGpsPosition();
        }
      } catch {
        // user declined
      }
      await refreshPermissions();
    },
    [refreshPermissions]
  );

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Real Battery & Network telemetry listeners
  useEffect(() => {
    let mounted = true;
    const syncBatteryAndNetwork = async () => {
      const bat = await readBatteryStatus();
      const net = readNetworkStatus();
      if (!mounted) return;
      setDeviceStatus((prev) => ({
        ...prev,
        batteryLevel: bat.level,
        batteryCharging: bat.charging,
        online: net.online,
        connectionType: net.connectionType,
      }));
    };

    syncBatteryAndNetwork();
    const batInterval = window.setInterval(syncBatteryAndNetwork, 30000);
    window.addEventListener('online', syncBatteryAndNetwork);
    window.addEventListener('offline', syncBatteryAndNetwork);

    return () => {
      mounted = false;
      window.clearInterval(batInterval);
      window.removeEventListener('online', syncBatteryAndNetwork);
      window.removeEventListener('offline', syncBatteryAndNetwork);
    };
  }, []);

  // Countdown Timers & Alarms ticker
  useEffect(() => {
    const interval = window.setInterval(() => {
      let shouldChime = false;

      setTimers((prev) => {
        if (prev.length === 0) return prev;
        let changed = false;
        const next = prev.map((t) => {
          if (t.ringing || t.remainingSeconds <= 0) return t;
          changed = true;
          const rem = t.remainingSeconds - 1;
          if (rem <= 0) {
            shouldChime = true;
            return { ...t, remainingSeconds: 0, ringing: true };
          }
          return { ...t, remainingSeconds: rem };
        });
        return changed ? next : prev;
      });

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      if (lastAlarmFiredMinuteRef.current !== hhmm) {
        setAlarms((prev) => {
          const hasMatch = prev.some(
            (a) => a.enabled && !a.ringing && a.time24h === hhmm
          );
          if (!hasMatch) return prev;
          lastAlarmFiredMinuteRef.current = hhmm;
          shouldChime = true;
          return prev.map((a) =>
            a.enabled && a.time24h === hhmm ? { ...a, ringing: true } : a
          );
        });
      }

      if (shouldChime) {
        playAlertChime();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const setVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    setDeviceStatus((prev) => ({ ...prev, volume: clamped }));
    if (outputGainRef.current && outputAudioCtxRef.current) {
      outputGainRef.current.gain.setTargetAtTime(
        clamped / 100,
        outputAudioCtxRef.current.currentTime,
        0.02
      );
    }
  }, []);

  const setBrightness = useCallback((level: number) => {
    const clamped = Math.max(20, Math.min(100, Math.round(level)));
    setDeviceStatus((prev) => ({ ...prev, brightness: clamped }));
  }, []);

  const toggleFlashlight = useCallback(async (enabled?: boolean) => {
    const nextState =
      typeof enabled === 'boolean'
        ? enabled
        : !deviceStatusRef.current.flashlightOn;
    const result = await setHardwareFlashlight(nextState);
    setDeviceStatus((prev) => ({
      ...prev,
      flashlightOn: nextState,
      flashlightHardware: result.hardwareSupported,
    }));
  }, []);

  const captureScreenshot = useCallback((label?: string): ScreenshotItem => {
    const cleanLabel = label?.trim() || 'Swati Workspace Snapshot';
    const recentDialogue = transcriptRef.current
      .filter((t) => t.speaker === 'user' || t.speaker === 'swati')
      .map((t) => ({ speaker: t.speaker, text: t.text }));
    const dataUrl = createWorkspaceSnapshotPng({
      label: cleanLabel,
      deviceStatus: deviceStatusRef.current,
      recentLines: recentDialogue,
    });
    const item: ScreenshotItem = {
      id: `shot_${Date.now()}`,
      label: cleanLabel,
      dataUrl,
      timestamp: formatClockTime(),
    };
    setScreenshots((prev) => [item, ...prev.slice(0, 7)]);
    return item;
  }, []);

  const addTimer = useCallback(
    (durationSeconds: number, label?: string): TimerItem => {
      const secs = Math.max(1, Math.round(durationSeconds));
      const item: TimerItem = {
        id: `timer_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label: label?.trim() || 'Timer',
        totalSeconds: secs,
        remainingSeconds: secs,
        ringing: false,
        createdAt: formatClockTime(),
      };
      setTimers((prev) => [item, ...prev]);
      return item;
    },
    []
  );

  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAlarm = useCallback(
    (time24h: string, label?: string): AlarmItem => {
      const normalized = /^\d{1,2}:\d{2}$/.test(time24h.trim())
        ? time24h
            .trim()
            .split(':')
            .map((p) => p.padStart(2, '0'))
            .join(':')
        : '07:00';
      const item: AlarmItem = {
        id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label: label?.trim() || 'Alarm',
        time24h: normalized,
        enabled: true,
        ringing: false,
      };
      setAlarms((prev) => [item, ...prev]);
      return item;
    },
    []
  );

  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled, ringing: false } : a
      )
    );
  }, []);

  const removeAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissRinging = useCallback(() => {
    setTimers((prev) =>
      prev.map((t) => (t.ringing ? { ...t, ringing: false } : t))
    );
    setAlarms((prev) =>
      prev.map((a) => (a.ringing ? { ...a, ringing: false } : a))
    );
  }, []);

  const addMemory = useCallback(
    (fact: string, category: string = 'note'): MemoryItem => {
      const item: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fact: fact.trim(),
        category: category.trim() || 'note',
        createdAt: formatClockTime(),
      };
      setMemories((prev) => [item, ...prev.slice(0, 29)]);
      return item;
    },
    []
  );

  const removeMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  const updateHealth = useCallback((partial: Partial<HealthState>) => {
    setHealthState((prev) => ({
      ...prev,
      ...partial,
      lastCheckinAt: formatClockTime(),
    }));
  }, []);

  const incrementWater = useCallback((delta: number = 1) => {
    setHealthState((prev) => ({
      ...prev,
      waterGlasses: Math.max(0, Math.min(20, prev.waterGlasses + delta)),
      lastCheckinAt: formatClockTime(),
    }));
  }, []);

  const addTodo = useCallback(
    (title: string, priority: 'normal' | 'high' = 'normal'): TodoItem => {
      const item: TodoItem = {
        id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        title: title.trim(),
        done: false,
        priority,
        createdAt: formatClockTime(),
      };
      setTodos((prev) => [item, ...prev]);
      return item;
    },
    []
  );

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTimetableSlot = useCallback(
    (time: string, activity: string): TimetableSlot => {
      const slot: TimetableSlot = {
        id: `tt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        time: time.trim() || '09:00 AM',
        activity: activity.trim(),
        done: false,
      };
      setTimetable((prev) => [...prev, slot]);
      return slot;
    },
    []
  );

  const toggleTimetableSlot = useCallback((id: string) => {
    setTimetable((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  }, []);

  const removeTimetableSlot = useCallback((id: string) => {
    setTimetable((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addNotification = useCallback(
    (app: string, sender: string, body: string) => {
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          app: app.trim() || 'System',
          sender: sender.trim() || 'Alert',
          body: body.trim(),
          time: formatClockTime(),
          read: false,
        },
        ...prev,
      ]);
    },
    []
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateEmergencyContact = useCallback((contact: EmergencyContact) => {
    setEmergencyContact(contact);
  }, []);

  const approveConfirmation = useCallback((id: string) => {
    const target = pendingConfirmationsRef.current.find((c) => c.id === id);
    if (!target) return;
    setPendingConfirmations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
    );
    triggerExternalUri(target.actionUrl);
  }, []);

  const cancelConfirmation = useCallback((id: string) => {
    setPendingConfirmations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'cancelled' } : c))
    );
  }, []);

  const fetchWeather = useCallback(
    async (city: string): Promise<WeatherReport | null> => {
      setWeatherLoading(true);
      setInternetError(null);
      try {
        const res = await fetch(
          `/api/internet/weather?city=${encodeURIComponent(city)}`
        );
        const data = (await res.json()) as WeatherReport & { error?: string };
        if (!res.ok) {
          setInternetError(data.error ?? 'Weather request failed.');
          return null;
        }
        setWeatherReport(data);
        return data;
      } catch {
        setInternetError('Network error fetching weather.');
        return null;
      } finally {
        setWeatherLoading(false);
      }
    },
    []
  );

  const fetchNews = useCallback(
    async (topic: string = '', lang: 'hi' | 'en' = 'hi'): Promise<NewsHeadline[]> => {
      setNewsLoading(true);
      setInternetError(null);
      try {
        const res = await fetch(
          `/api/internet/news?topic=${encodeURIComponent(topic)}&lang=${lang}`
        );
        const data = (await res.json()) as {
          headlines?: NewsHeadline[];
          error?: string;
        };
        if (!res.ok) {
          setInternetError(data.error ?? 'News feed failed.');
          return [];
        }
        const headlines = data.headlines ?? [];
        setNewsHeadlines(headlines);
        return headlines;
      } catch {
        setInternetError('Network error fetching news.');
        return [];
      } finally {
        setNewsLoading(false);
      }
    },
    []
  );

  const askWebQuestion = useCallback(
    async (question: string): Promise<GroundedAnswer | null> => {
      const cleaned = question.trim();
      if (!cleaned) return null;
      setSearchLoading(true);
      setInternetError(null);
      try {
        const res = await fetch('/api/internet/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: cleaned }),
        });
        const data = (await res.json()) as GroundedAnswer & { error?: string };
        if (!res.ok) {
          setInternetError(
            data.error ?? 'Search request failed. Check API quota in Settings > Secrets.'
          );
          return null;
        }
        setGroundedAnswers((prev) => [data, ...prev.slice(0, 5)]);
        return data;
      } catch {
        setInternetError('Network error executing search.');
        return null;
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  const openAndLogUrl = useCallback(
    (url: string, title: string): OpenedLinkItem | null => {
      const safeUrl = sanitizeExternalUrl(url);
      if (!safeUrl) return null;
      const autoOpened = triggerExternalUri(safeUrl);
      const linkItem: OpenedLinkItem = {
        id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        url: safeUrl,
        title,
        timestamp: formatClockTime(),
        autoOpened,
      };
      setOpenedLinks((prev) => [linkItem, ...prev]);
      return linkItem;
    },
    []
  );

  const searchGoogleUrl = useCallback(
    (query: string) => {
      const clean = query.trim();
      if (!clean) return;
      openAndLogUrl(
        `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
        `Google: ${clean}`
      );
    },
    [openAndLogUrl]
  );

  const searchYouTubeUrl = useCallback(
    (query: string) => {
      const clean = query.trim();
      if (!clean) return;
      openAndLogUrl(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`,
        `YouTube: ${clean}`
      );
    },
    [openAndLogUrl]
  );

  const launchAppByName = useCallback(
    (
      appName: string,
      taskParams?: { query?: string; recipient?: string; subject?: string }
    ) => {
      const entry = resolveAppEntry(appName, customAppsRef.current);
      if (!entry) return;
      const preferAndroidIntent =
        settingsRef.current.androidDeepLinkMode &&
        Boolean(entry.androidIntent) &&
        !taskParams?.query &&
        !taskParams?.recipient;
      const targetUrl = preferAndroidIntent
        ? (entry.androidIntent as string)
        : entry.buildTaskUrl && taskParams
          ? entry.buildTaskUrl(taskParams)
          : entry.url;
      if (/^https?:/i.test(targetUrl)) {
        openAndLogUrl(
          targetUrl,
          taskParams?.query ? `${entry.name}: ${taskParams.query}` : entry.name
        );
      } else {
        triggerExternalUri(targetUrl);
        setOpenedLinks((prev) => [
          {
            id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            url: targetUrl,
            title: entry.name,
            timestamp: formatClockTime(),
            autoOpened: true,
          },
          ...prev,
        ]);
      }
    },
    [openAndLogUrl]
  );

  const addCustomApp = useCallback(
    (
      name: string,
      url: string,
      category: string = 'Phone',
      androidIntent?: string
    ): CustomPhoneApp | null => {
      const cleanName = name.trim();
      const rawUrl = url.trim();
      if (!cleanName || !rawUrl) return null;
      const resolvedUrl = /^(intent:|tel:|sms:|mailto:|whatsapp:|upi:)/i.test(
        rawUrl
      )
        ? rawUrl
        : normalizeAndFixUrl(rawUrl);
      if (!resolvedUrl) return null;

      const app: CustomPhoneApp = {
        id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        url: resolvedUrl,
        androidIntent: androidIntent?.trim() || undefined,
        category: category.trim() || 'Phone',
      };
      setCustomApps((prev) => [app, ...prev]);
      return app;
    },
    []
  );

  const removeCustomApp = useCallback((id: string) => {
    setCustomApps((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addSavedLocation = useCallback(
    (label: string, addressOrCoords: string): SavedLocation | null => {
      const cleanLabel = label.trim();
      const cleanAddr = addressOrCoords.trim();
      if (!cleanLabel || !cleanAddr) return null;
      const loc: SavedLocation = {
        id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label: cleanLabel,
        addressOrCoords: cleanAddr,
        createdAt: formatClockTime(),
      };
      setSavedLocations((prev) => [
        loc,
        ...prev.filter(
          (item) => item.label.toLowerCase() !== cleanLabel.toLowerCase()
        ),
      ]);
      return loc;
    },
    []
  );

  const removeSavedLocation = useCallback((id: string) => {
    setSavedLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const navigateToDestination = useCallback(
    async ({
      destination = '',
      personName = '',
      mode = 'navigate',
      openInMaps = true,
    }: {
      destination?: string;
      personName?: string;
      mode?: 'navigate' | 'view' | 'share_my_location';
      openInMaps?: boolean;
    }): Promise<LocationNavigationCard> => {
      const lookupName = (personName || destination).trim().toLowerCase();
      const savedMatch = lookupName
        ? savedLocationsRef.current.find(
            (l) =>
              l.label.toLowerCase() === lookupName ||
              l.label.toLowerCase().includes(lookupName) ||
              lookupName.includes(l.label.toLowerCase())
          )
        : undefined;

      const resolvedDest =
        savedMatch?.addressOrCoords ||
        destination.trim() ||
        personName.trim();

      const gps = await getCurrentGpsPosition();
      const originCoords =
        gps.lat !== null && gps.lng !== null
          ? { lat: gps.lat, lng: gps.lng }
          : null;

      let directionsUrl = 'https://maps.google.com';
      let androidNavUrl = 'google.navigation:q=';

      if (mode === 'share_my_location' || !resolvedDest) {
        if (originCoords) {
          directionsUrl = `https://www.google.com/maps/search/?api=1&query=${originCoords.lat},${originCoords.lng}`;
          androidNavUrl = `geo:${originCoords.lat},${originCoords.lng}?q=${originCoords.lat},${originCoords.lng}`;
        }
      } else if (mode === 'view') {
        directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          resolvedDest
        )}`;
        androidNavUrl = `geo:0,0?q=${encodeURIComponent(resolvedDest)}`;
      } else {
        const originParam = originCoords
          ? `&origin=${originCoords.lat},${originCoords.lng}`
          : '';
        directionsUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(
          resolvedDest
        )}&travelmode=driving`;
        androidNavUrl = `google.navigation:q=${encodeURIComponent(resolvedDest)}`;
      }

      const card: LocationNavigationCard = {
        id: `nav_${Date.now()}`,
        mode,
        destination:
          savedMatch && personName
            ? `${savedMatch.label} (${savedMatch.addressOrCoords})`
            : resolvedDest ||
              (originCoords
                ? `${originCoords.lat}, ${originCoords.lng}`
                : 'Live Maps'),
        originCoords,
        directionsUrl,
        androidNavUrl,
        timestamp: formatClockTime(),
      };

      setLastNavCard(card);
      await refreshPermissions();

      if (openInMaps) {
        const launchTarget = settingsRef.current.androidDeepLinkMode
          ? androidNavUrl
          : directionsUrl;
        if (/^https?:/i.test(launchTarget)) {
          openAndLogUrl(
            launchTarget,
            mode === 'share_my_location'
              ? 'My Live GPS Location'
              : `Maps: ${card.destination}`
          );
        } else {
          triggerExternalUri(launchTarget);
        }
      }

      return card;
    },
    [openAndLogUrl, refreshPermissions]
  );

  const inspectWebsiteUrl = useCallback(
    async (
      rawUrl: string,
      siteTaskQuery?: string,
      openInTab: boolean = true
    ): Promise<WebsiteInspectionResult | null> => {
      const candidate = normalizeAndFixUrl(rawUrl) ?? rawUrl.trim();
      if (!candidate) return null;
      setWebsiteLoading(true);
      setInternetError(null);
      try {
        const res = await fetch('/api/internet/website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: candidate }),
        });
        const data = (await res.json()) as WebsiteInspectionResult & {
          error?: string;
        };
        if (!res.ok) {
          setInternetError(data.error ?? 'Could not inspect website.');
          if (openInTab && /^https?:\/\//i.test(candidate)) {
            openAndLogUrl(candidate, candidate);
          }
          return null;
        }
        setLastWebsiteWork(data);

        if (openInTab) {
          const cleanTask = siteTaskQuery?.trim();
          if (cleanTask) {
            try {
              const host = new URL(data.fixedUrl).hostname;
              const taskUrl = `https://www.google.com/search?q=${encodeURIComponent(
                `site:${host} ${cleanTask}`
              )}`;
              openAndLogUrl(taskUrl, `${host}: ${cleanTask}`);
            } catch {
              openAndLogUrl(data.fixedUrl, data.title || data.fixedUrl);
            }
          } else {
            openAndLogUrl(data.fixedUrl, data.title || data.fixedUrl);
          }
        }
        return data;
      } catch {
        setInternetError('Network error inspecting website.');
        return null;
      } finally {
        setWebsiteLoading(false);
      }
    },
    [openAndLogUrl]
  );

  const dismissTypingPreview = useCallback(() => {
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setTypingPreview(null);
  }, []);

  const triggerAutoTypeAndSend = useCallback(
    async ({
      recipient,
      platform = 'WhatsApp',
      phoneOrHandle = '',
      messageText,
    }: {
      recipient: string;
      platform?: string;
      phoneOrHandle?: string;
      messageText: string;
    }): Promise<TypingPreviewState> => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      const cleanRecipient = recipient.trim() || 'Contact';
      const cleanPlatform = platform.trim() || 'WhatsApp';
      const cleanHandle = phoneOrHandle.trim();
      const cleanMsg = messageText.trim();

      let actionUrl = `https://wa.me/?text=${encodeURIComponent(cleanMsg)}`;
      const platLower = cleanPlatform.toLowerCase();
      if (platLower === 'sms') {
        actionUrl = `sms:${cleanHandle.replace(/[^\d+]/g, '')}?body=${encodeURIComponent(cleanMsg)}`;
      } else if (platLower === 'email' || platLower === 'gmail') {
        actionUrl = `mailto:${cleanHandle}?body=${encodeURIComponent(cleanMsg)}`;
      } else if (cleanHandle) {
        const digits = cleanHandle.replace(/[^\d]/g, '');
        actionUrl = settingsRef.current.androidDeepLinkMode
          ? `whatsapp://send?phone=${digits}&text=${encodeURIComponent(cleanMsg)}`
          : `https://wa.me/${digits}?text=${encodeURIComponent(cleanMsg)}`;
      } else if (settingsRef.current.androidDeepLinkMode) {
        actionUrl = `whatsapp://send?text=${encodeURIComponent(cleanMsg)}`;
      }

      const previewId = `type_${Date.now()}`;
      const initialPreview: TypingPreviewState = {
        id: previewId,
        recipient: cleanRecipient,
        platform: cleanPlatform,
        fullText: cleanMsg,
        typedText: '',
        isTyping: true,
        actionUrl,
        dispatched: false,
      };
      setTypingPreview(initialPreview);

      try {
        await navigator.clipboard?.writeText(cleanMsg);
      } catch {
        // clipboard may be blocked in background tabs
      }

      const draftItem: MessageDraft = {
        id: `draft_${Date.now()}`,
        recipient: cleanRecipient,
        platform: cleanPlatform,
        text: cleanMsg,
        timestamp: formatClockTime(),
      };
      setMessageDrafts((prev) => [draftItem, ...prev.slice(0, 9)]);

      const stepSize = Math.max(1, Math.ceil(cleanMsg.length / 40));
      let cursor = 0;

      typingIntervalRef.current = window.setInterval(async () => {
        cursor = Math.min(cleanMsg.length, cursor + stepSize);
        const sliced = cleanMsg.slice(0, cursor);
        const done = cursor >= cleanMsg.length;

        setTypingPreview((prev) =>
          prev && prev.id === previewId
            ? { ...prev, typedText: sliced, isTyping: !done }
            : prev
        );

        if (done) {
          if (typingIntervalRef.current) {
            window.clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }

          let didDispatch = false;
          const bridgeUrl = settingsRef.current.androidBridgeWebhookUrl.trim();
          if (bridgeUrl) {
            try {
              const res = await fetch('/api/bridge/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  webhookUrl: bridgeUrl,
                  payload: {
                    action: 'auto_send_message',
                    recipient: cleanRecipient,
                    platform: cleanPlatform,
                    phoneOrHandle: cleanHandle,
                    messageText: cleanMsg,
                    actionUrl,
                  },
                }),
              });
              didDispatch = res.ok;
            } catch {
              didDispatch = false;
            }
          }

          if (!didDispatch && settingsRef.current.autoConfirmMessages) {
            triggerExternalUri(actionUrl);
            didDispatch = true;
          }

          if (didDispatch) {
            setTypingPreview((prev) =>
              prev && prev.id === previewId
                ? { ...prev, isTyping: false, dispatched: true }
                : prev
            );
          } else {
            const conf: PendingConfirmation = {
              id: `conf_${Date.now()}`,
              kind: 'send_message',
              recipient: cleanRecipient,
              target: cleanPlatform,
              messageText: cleanMsg,
              actionUrl,
              status: 'pending',
              createdAt: formatClockTime(),
            };
            setPendingConfirmations((prev) => [conf, ...prev]);
          }
        }
      }, 24);

      return initialPreview;
    },
    []
  );

  const runRoutine = useCallback(
    async (name: 'morning' | 'study' | 'night'): Promise<string> => {
      if (name === 'morning') {
        await fetchWeather('New Delhi');
        await fetchNews('', 'hi');
        addTimer(1800, 'Morning Water Care');
        return 'Morning Routine activated: checked live weather & Hindi news, and set a 30m hydration reminder.';
      }
      if (name === 'study') {
        addTimer(1500, '25m Study Pomodoro');
        updateHealth({ mood: 'Energized' });
        return 'Study Focus Routine activated: 25-minute study timer started.';
      }
      setBrightness(60);
      addTimer(600, 'Wind-Down Sleep Prep');
      updateHealth({ mood: 'Calm' });
      return 'Night Wind-Down Routine activated: dimmed brightness to 60% and started a 10m sleep prep timer.';
    },
    [addTimer, fetchNews, fetchWeather, setBrightness, updateHealth]
  );

  const wipeAllLocalData = useCallback(() => {
    setTranscript([]);
    setMemories([]);
    setTodos([]);
    setTimetable(DEFAULT_TIMETABLE);
    setHealthState(DEFAULT_HEALTH);
    setEmergencyContact(DEFAULT_EMERGENCY);
    setCustomApps([]);
    setSavedLocations([]);
    setOpenedLinks([]);
    setMessageDrafts([]);
    setPendingConfirmations([]);
    setGroundedAnswers([]);
    setLastNavCard(null);
    setLastWebsiteWork(null);
    dismissTypingPreview();
    try {
      [
        MEMORIES_STORAGE_KEY,
        TRANSCRIPT_STORAGE_KEY,
        HEALTH_STORAGE_KEY,
        TODOS_STORAGE_KEY,
        TIMETABLE_STORAGE_KEY,
        EMERGENCY_STORAGE_KEY,
        CUSTOM_APPS_STORAGE_KEY,
        SAVED_LOCATIONS_STORAGE_KEY,
      ].forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, [dismissTypingPreview]);

  const sendWsMessage = useCallback((msg: ClientToServerMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const stopAllPlayback = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSwatiSpeaking(false);
    setOutputLevel(0);
  }, []);

  const teardownAudio = useCallback(() => {
    stopAllPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (micStreamRef.current) {
      for (const track of micStreamRef.current.getTracks()) {
        track.stop();
      }
      micStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    inputAnalyserRef.current = null;

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    outputGainRef.current = null;
    outputAnalyserRef.current = null;

    setInputLevel(0);
    setOutputLevel(0);
  }, [stopAllPlayback]);

  const appendOrUpdateTranscript = useCallback(
    (
      speaker: 'user' | 'swati',
      deltaText: string,
      pendingIdRef: React.MutableRefObject<string | null>
    ) => {
      if (!deltaText) return;
      setTranscript((prev) => {
        const currentId = pendingIdRef.current;
        if (currentId) {
          const idx = prev.findIndex((item) => item.id === currentId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              text: updated[idx].text + deltaText,
            };
            return updated;
          }
        }
        const newId = `${speaker}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        pendingIdRef.current = newId;
        return [
          ...prev,
          {
            id: newId,
            speaker,
            text: deltaText.trimStart(),
            timestamp: formatClockTime(),
          },
        ];
      });
    },
    []
  );

  const playAudioChunk = useCallback((base64Pcm: string) => {
    const ctx = outputAudioCtxRef.current;
    const gainNode = outputGainRef.current;
    const analyser = outputAnalyserRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const float32 = base64PcmToFloat32(base64Pcm);
    if (float32.length === 0) return;

    setOutputLevel(computeRms(float32));

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    if (gainNode && analyser) {
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(ctx.destination);
    } else if (analyser) {
      source.connect(analyser);
      analyser.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    nextStartTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    setIsSwatiSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsSwatiSpeaking(false);
        setOutputLevel(0);
      }
    };

    source.start(startAt);
  }, []);

  const buildMemoryContext = useCallback((): string => {
    const factLines = memoriesRef.current
      .slice(0, 15)
      .map((m) => `- [${m.category}] ${m.fact}`);
    const recentTurns = transcriptRef.current
      .filter((t) => t.speaker === 'user' || t.speaker === 'swati')
      .slice(-8)
      .map((t) => `${t.speaker === 'swati' ? 'Swati' : 'User'}: ${t.text}`);

    const sections: string[] = [];
    if (factLines.length > 0) {
      sections.push(`Saved Facts:\n${factLines.join('\n')}`);
    }
    if (recentTurns.length > 0) {
      sections.push(`Recent Dialogue:\n${recentTurns.join('\n')}`);
    }
    return sections.join('\n\n');
  }, []);

  const buildHealthContext = useCallback((): string => {
    const h = healthRef.current;
    return `Mood: ${h.mood}, Water: ${h.waterGlasses}/${h.waterGoal} glasses, Sleep: ${h.sleepHours}h, Last Meal: ${h.lastMeal}`;
  }, []);

  const disconnect = useCallback(() => {
    isConnectedRef.current = false;
    queuedPromptRef.current = null;
    pendingUserTranscriptIdRef.current = null;
    pendingSwatiTranscriptIdRef.current = null;

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    teardownAudio();
    setActiveSessionSettings(null);
    setConnectionState('disconnected');
  }, [teardownAudio]);

  const connect = useCallback(
    async (overrideSettings?: SessionSettings) => {
      if (
        connectionState === 'connecting' ||
        connectionState === 'connected'
      ) {
        return;
      }

      const targetSettings = overrideSettings ?? settings;
      setErrorMessage(null);
      setMicNotice(null);
      setConnectionState('connecting');
      setSessionSeconds(0);
      pendingUserTranscriptIdRef.current = null;
      pendingSwatiTranscriptIdRef.current = null;

      const outputCtx = new AudioContext({ sampleRate: 24000 });
      const outputGain = outputCtx.createGain();
      outputGain.gain.value = deviceStatusRef.current.volume / 100;
      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyser.smoothingTimeConstant = 0.78;
      outputAudioCtxRef.current = outputCtx;
      outputGainRef.current = outputGain;
      outputAnalyserRef.current = outputAnalyser;

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Microphone capture is not supported in this browser.'
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;
        setIsMicAvailable(true);
        refreshPermissions();

        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;

        const source = inputCtx.createMediaStreamSource(stream);
        const inputAnalyser = inputCtx.createAnalyser();
        inputAnalyser.fftSize = 256;
        inputAnalyser.smoothingTimeConstant = 0.78;
        inputAnalyserRef.current = inputAnalyser;

        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        const silentSink = inputCtx.createGain();
        silentSink.gain.value = 0;

        source.connect(inputAnalyser);
        inputAnalyser.connect(processor);
        processor.connect(silentSink);
        silentSink.connect(inputCtx.destination);

        processor.onaudioprocess = (event) => {
          if (!isConnectedRef.current || isMutedRef.current) {
            setInputLevel(0);
            return;
          }
          const samples = event.inputBuffer.getChannelData(0);
          setInputLevel(computeRms(samples));
          const base64 = float32ToBase64Pcm(samples);
          sendWsMessage({ type: 'audio', audio: base64 });
        };
      } catch (micErr) {
        setIsMicAvailable(false);
        const reason =
          micErr instanceof Error
            ? micErr.message
            : 'Microphone permission unavailable';
        setMicNotice(
          `Microphone off (${reason}). Type in Hindi or English below and Swati will reply in voice.`
        );
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        const allAppNames = [
          ...APP_DIRECTORY.map((a) => a.name),
          ...customAppsRef.current.map((c) => `${c.name} (${c.url})`),
        ].join(', ');
        const savedLocText = savedLocationsRef.current
          .map((l) => `${l.label}: ${l.addressOrCoords}`)
          .join(' | ');

        ws.send(
          JSON.stringify({
            type: 'start',
            model: targetSettings.model,
            voice: targetSettings.voice,
            sassLevel: targetSettings.sassLevel,
            languageMode: targetSettings.languageMode,
            userPetName: targetSettings.userPetName,
            customPersonalityNote: targetSettings.customPersonalityNote,
            memoryContext: buildMemoryContext(),
            healthContext: buildHealthContext(),
            appsContext: allAppNames,
            locationsContext: savedLocText || undefined,
          } satisfies ClientToServerMessage)
        );
      };

      ws.onmessage = async (event) => {
        let msg: ServerToClientMessage;
        try {
          msg = JSON.parse(event.data as string) as ServerToClientMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'ready': {
            isConnectedRef.current = true;
            setConnectionState('connected');
            setActiveSessionSettings({
              ...targetSettings,
              model: msg.model,
              voice: msg.voice,
              sassLevel: msg.sassLevel,
              languageMode: msg.languageMode,
            });
            if (queuedPromptRef.current) {
              const queued = queuedPromptRef.current;
              queuedPromptRef.current = null;
              pendingSwatiTranscriptIdRef.current = null;
              setTranscript((prev) => [
                ...prev,
                {
                  id: `user_${Date.now()}`,
                  speaker: 'user',
                  text: queued,
                  timestamp: formatClockTime(),
                },
              ]);
              ws.send(
                JSON.stringify({
                  type: 'text',
                  text: queued,
                } satisfies ClientToServerMessage)
              );
            }
            break;
          }
          case 'audio': {
            pendingUserTranscriptIdRef.current = null;
            playAudioChunk(msg.audio);
            break;
          }
          case 'inputTranscript': {
            pendingSwatiTranscriptIdRef.current = null;
            appendOrUpdateTranscript(
              'user',
              msg.text,
              pendingUserTranscriptIdRef
            );
            break;
          }
          case 'outputTranscript': {
            pendingUserTranscriptIdRef.current = null;
            appendOrUpdateTranscript(
              'swati',
              msg.text,
              pendingSwatiTranscriptIdRef
            );
            break;
          }
          case 'interrupted': {
            stopAllPlayback();
            pendingSwatiTranscriptIdRef.current = null;
            break;
          }
          case 'turnComplete': {
            pendingSwatiTranscriptIdRef.current = null;
            break;
          }
          case 'toolCall': {
            const { id, name, args } = msg.toolCall;
            const respond = (result: Record<string, unknown>) => {
              sendWsMessage({ type: 'toolResult', id, name, result });
            };

            if (name === 'openWebsite') {
              const rawUrl = String(args.url ?? '');
              const title =
                String(args.title ?? '').trim() || rawUrl || 'Website';
              const linkItem = openAndLogUrl(rawUrl, title);
              if (linkItem) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    speaker: 'action',
                    text: `Launched ${linkItem.title}`,
                    timestamp: linkItem.timestamp,
                    link: linkItem,
                  },
                ]);
                respond({
                  success: true,
                  url: linkItem.url,
                  title: linkItem.title,
                });
              } else {
                respond({
                  success: false,
                  error: 'Invalid or unsupported URL protocol.',
                });
              }
              break;
            }

            if (name === 'searchGoogle') {
              const query = String(args.query ?? '').trim();
              if (query) {
                const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                const linkItem = openAndLogUrl(url, `Google: ${query}`);
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Searched Google for "${query}"`,
                    timestamp: formatClockTime(),
                    link: linkItem ?? undefined,
                  },
                ]);
                respond({
                  success: true,
                  query,
                  url,
                });
              } else {
                respond({ success: false, error: 'Empty search query.' });
              }
              break;
            }

            if (name === 'searchYouTube') {
              const query = String(args.query ?? '').trim();
              if (query) {
                const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                const linkItem = openAndLogUrl(url, `YouTube: ${query}`);
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Searched YouTube for "${query}"`,
                    timestamp: formatClockTime(),
                    link: linkItem ?? undefined,
                  },
                ]);
                respond({ success: true, query, url });
              } else {
                respond({ success: false, error: 'Empty YouTube query.' });
              }
              break;
            }

            if (name === 'getWeather') {
              const city = String(args.city ?? 'New Delhi');
              const weather = await fetchWeather(city);
              if (weather) {
                onNavigateTab?.('internet');
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Weather in ${weather.city}: ${weather.temperatureC}°C, ${weather.condition}`,
                    timestamp: weather.fetchedAt,
                    weather,
                  },
                ]);
                respond({ success: true, ...weather });
              } else {
                respond({
                  success: false,
                  error: `Could not fetch weather for ${city}.`,
                });
              }
              break;
            }

            if (name === 'getNews') {
              const topic = typeof args.topic === 'string' ? args.topic : '';
              const lang = args.language === 'en' ? 'en' : 'hi';
              const headlines = await fetchNews(topic, lang);
              onNavigateTab?.('internet');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Fetched ${headlines.length} live news headlines${topic ? ` on "${topic}"` : ''}`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({
                success: headlines.length > 0,
                headlines: headlines.slice(0, 5).map((h) => ({
                  title: h.title,
                  source: h.source,
                })),
              });
              break;
            }

            if (name === 'askWebSearch') {
              const question = String(args.question ?? '').trim();
              const grounded = await askWebQuestion(question);
              onNavigateTab?.('internet');
              if (grounded) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Web lookup: ${grounded.question}`,
                    timestamp: grounded.timestamp,
                  },
                ]);
                respond({
                  success: true,
                  answer: grounded.answer,
                  sources: grounded.sources,
                });
              } else {
                respond({
                  success: false,
                  error:
                    'Search quota or network unavailable; opened fallback Google Search option.',
                });
              }
              break;
            }

            if (name === 'translateText') {
              const sourceText = String(args.sourceText ?? '');
              const targetLanguage = String(args.targetLanguage ?? 'English');
              const translatedText = String(args.translatedText ?? '');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Translation (${targetLanguage}): "${sourceText}" → "${translatedText}"`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({ success: true, targetLanguage, translatedText });
              break;
            }

            if (name === 'draftMessage') {
              const recipient =
                String(args.recipient ?? '').trim() || 'Someone special';
              const platform =
                String(args.platform ?? '').trim() || 'WhatsApp';
              const text = String(args.messageText ?? '').trim();
              const draft: MessageDraft = {
                id: `draft_${Date.now()}`,
                recipient,
                platform,
                text,
                timestamp: formatClockTime(),
              };
              setMessageDrafts((prev) => [draft, ...prev.slice(0, 9)]);
              onNavigateTab?.('internet');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Drafted ${platform} message for ${recipient}`,
                  timestamp: draft.timestamp,
                  draft,
                },
              ]);
              respond({
                success: true,
                recipient,
                platform,
                messageText: text,
              });
              break;
            }

            if (name === 'requestSendMessage') {
              const recipient =
                String(args.recipient ?? '').trim() || 'Contact';
              const platform =
                String(args.platform ?? '').trim() || 'WhatsApp';
              const phoneOrHandle = String(args.phoneOrHandle ?? '').trim();
              const messageText = String(args.messageText ?? '').trim();

              let actionUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
              if (platform.toLowerCase() === 'sms') {
                actionUrl = `sms:${phoneOrHandle}?body=${encodeURIComponent(messageText)}`;
              } else if (platform.toLowerCase() === 'email') {
                actionUrl = `mailto:${phoneOrHandle}?body=${encodeURIComponent(messageText)}`;
              } else if (phoneOrHandle) {
                const digits = phoneOrHandle.replace(/[^\d+]/g, '');
                actionUrl = `https://wa.me/${digits.replace(/^\+/, '')}?text=${encodeURIComponent(messageText)}`;
              }

              const conf: PendingConfirmation = {
                id: `conf_${Date.now()}`,
                kind: 'send_message',
                recipient,
                target: platform,
                messageText,
                actionUrl,
                status: 'pending',
                createdAt: formatClockTime(),
              };
              setPendingConfirmations((prev) => [conf, ...prev]);
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Awaiting your permission to send ${platform} message to ${recipient}`,
                  timestamp: conf.createdAt,
                  confirmationId: conf.id,
                },
              ]);
              respond({
                awaitingUserConfirmation: true,
                confirmationId: conf.id,
                message:
                  'Displayed message confirmation card. Ask the user for explicit confirmation before sending.',
              });
              break;
            }

            if (name === 'requestPhoneCall') {
              const contactName =
                String(args.contactName ?? '').trim() || 'Contact';
              const phoneNumber = String(args.phoneNumber ?? '').trim();
              const cleanTel = phoneNumber.replace(/[^\d+*#]/g, '');
              const conf: PendingConfirmation = {
                id: `conf_${Date.now()}`,
                kind: 'make_call',
                recipient: contactName,
                target: phoneNumber || 'Tap to dial',
                actionUrl: cleanTel ? `tel:${cleanTel}` : 'tel:',
                status: 'pending',
                createdAt: formatClockTime(),
              };
              setPendingConfirmations((prev) => [conf, ...prev]);
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Awaiting your confirmation to call ${contactName}${phoneNumber ? ` (${phoneNumber})` : ''}`,
                  timestamp: conf.createdAt,
                  confirmationId: conf.id,
                },
              ]);
              respond({
                awaitingUserConfirmation: true,
                confirmationId: conf.id,
                message:
                  'Displayed call confirmation card. Ask the user to confirm before dialing.',
              });
              break;
            }

            if (name === 'confirmPendingAction') {
              const approved = Boolean(args.approved);
              const latestPending = pendingConfirmationsRef.current.find(
                (c) => c.status === 'pending'
              );
              if (!latestPending) {
                respond({
                  success: false,
                  message: 'No pending call or message confirmation found.',
                });
                break;
              }
              if (approved) {
                approveConfirmation(latestPending.id);
                respond({
                  success: true,
                  executed: latestPending.kind,
                  recipient: latestPending.recipient,
                });
              } else {
                cancelConfirmation(latestPending.id);
                respond({
                  success: true,
                  cancelled: latestPending.kind,
                  recipient: latestPending.recipient,
                });
              }
              break;
            }

            if (name === 'addTodoTask') {
              const title = String(args.title ?? '').trim();
              const priority =
                args.priority === 'high' ? 'high' : 'normal';
              if (title) {
                const task = addTodo(title, priority);
                onNavigateTab?.('planner');
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Added task: ${task.title}`,
                    timestamp: task.createdAt,
                  },
                ]);
                respond({ success: true, task });
              } else {
                respond({ success: false, error: 'Task title required.' });
              }
              break;
            }

            if (name === 'toggleTodoTask') {
              const q = String(args.titleMatch ?? '').trim().toLowerCase();
              const match = todosRef.current.find((t) =>
                t.title.toLowerCase().includes(q)
              );
              if (match) {
                toggleTodo(match.id);
                respond({
                  success: true,
                  title: match.title,
                  done: !match.done,
                });
              } else {
                respond({ success: false, error: 'Matching task not found.' });
              }
              break;
            }

            if (name === 'getTodoList') {
              respond({ todos: todosRef.current });
              break;
            }

            if (name === 'createDailyTimetable') {
              const rawSlots = Array.isArray(args.slots) ? args.slots : [];
              const mapped: TimetableSlot[] = rawSlots
                .map((s, idx) => {
                  const rec = s as { time?: string; activity?: string };
                  return {
                    id: `tt_${Date.now()}_${idx}`,
                    time: String(rec.time ?? '09:00 AM'),
                    activity: String(rec.activity ?? 'Activity'),
                    done: false,
                  };
                })
                .filter((s) => s.activity.trim().length > 0);
              if (mapped.length > 0) {
                setTimetable(mapped);
                onNavigateTab?.('planner');
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Updated daily timetable (${mapped.length} slots)`,
                    timestamp: formatClockTime(),
                  },
                ]);
                respond({ success: true, slots: mapped });
              } else {
                respond({ success: false, error: 'No valid slots provided.' });
              }
              break;
            }

            if (name === 'getDailyTimetable') {
              respond({ timetable: timetableRef.current });
              break;
            }

            if (name === 'runRoutine') {
              const r = String(args.routineName ?? 'morning').toLowerCase();
              const normalized: 'morning' | 'study' | 'night' =
                r === 'study' ? 'study' : r === 'night' ? 'night' : 'morning';
              const summary = await runRoutine(normalized);
              onNavigateTab?.('planner');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: summary,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({ success: true, routine: normalized, summary });
              break;
            }

            if (name === 'readNotifications') {
              const unread = notificationsRef.current.filter((n) => !n.read);
              const list =
                unread.length > 0 ? unread : notificationsRef.current;
              markNotificationsRead();
              onNavigateTab?.('care');
              respond({
                success: true,
                unreadCount: unread.length,
                notifications: list,
              });
              break;
            }

            if (name === 'triggerEmergencyShortcut') {
              const em = emergencyRef.current;
              const reason =
                typeof args.reason === 'string' ? args.reason : 'Emergency SOS';
              const conf: PendingConfirmation = {
                id: `em_${Date.now()}`,
                kind: 'make_call',
                recipient: `${em.name} (${em.relation})`,
                target: em.phone,
                actionUrl: `tel:${em.phone.replace(/[^\d+*#]/g, '')}`,
                status: 'pending',
                createdAt: formatClockTime(),
              };
              setPendingConfirmations((prev) => [conf, ...prev]);
              onNavigateTab?.('planner');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Emergency Shortcut ready: ${em.name} (${em.phone}) · ${reason}`,
                  timestamp: conf.createdAt,
                  confirmationId: conf.id,
                },
              ]);
              respond({
                success: true,
                emergencyContact: em,
                reason,
              });
              break;
            }

            if (name === 'logHealthCheckin') {
              const allowedMoods: UserMood[] = [
                'Happy',
                'Calm',
                'Tired',
                'Stressed',
                'Low',
                'Energized',
              ];
              const moodArg =
                typeof args.mood === 'string' &&
                allowedMoods.includes(args.mood as UserMood)
                  ? (args.mood as UserMood)
                  : undefined;
              const addWater = Number(args.addWaterGlasses ?? 0);
              const sleepHours =
                typeof args.sleepHours === 'number'
                  ? args.sleepHours
                  : undefined;
              const mealNote =
                typeof args.mealNote === 'string' ? args.mealNote.trim() : '';

              setHealthState((prev) => ({
                ...prev,
                mood: moodArg ?? prev.mood,
                waterGlasses: Math.max(
                  0,
                  Math.min(
                    20,
                    prev.waterGlasses + (Number.isFinite(addWater) ? addWater : 0)
                  )
                ),
                sleepHours: sleepHours ?? prev.sleepHours,
                lastMeal: mealNote || prev.lastMeal,
                lastCheckinAt: formatClockTime(),
              }));

              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Care log updated${moodArg ? ` · Mood: ${moodArg}` : ''}${addWater ? ` · +${addWater} glass water` : ''}${mealNote ? ` · Meal: ${mealNote}` : ''}`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({ success: true, updated: healthRef.current });
              break;
            }

            if (name === 'getHealthStatus') {
              respond({ success: true, ...healthRef.current });
              break;
            }

            if (name === 'setWellnessReminder') {
              const type = String(args.type ?? 'water');
              const minutes = Math.max(1, Number(args.minutes ?? 30));
              const note =
                typeof args.note === 'string' && args.note.trim()
                  ? args.note.trim()
                  : `Swati Care: Time for ${type}`;
              const timer = addTimer(Math.round(minutes * 60), note);
              onNavigateTab?.('care');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Set care reminder "${note}" (${minutes} min)`,
                  timestamp: timer.createdAt,
                },
              ]);
              respond({ success: true, label: note, minutes });
              break;
            }

            if (name === 'openApp') {
              const appName = String(args.appName ?? '').trim();
              const action = String(args.action ?? 'open').toLowerCase();
              const taskQuery =
                typeof args.taskQuery === 'string' ? args.taskQuery.trim() : '';
              const recipient =
                typeof args.recipient === 'string' ? args.recipient.trim() : '';
              const subject =
                typeof args.subject === 'string' ? args.subject.trim() : '';

              if (action === 'close') {
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Requested close for ${appName} (browser security restricts closing external OS apps directly)`,
                    timestamp: formatClockTime(),
                  },
                ]);
                respond({
                  success: false,
                  reason:
                    'Browser sandbox prevents force-closing external OS apps; close the tab manually or on Android via system switcher.',
                });
                break;
              }
              const entry = resolveAppEntry(appName, customAppsRef.current);
              if (entry) {
                const useAndroidIntent =
                  settingsRef.current.androidDeepLinkMode &&
                  Boolean(entry.androidIntent) &&
                  !taskQuery &&
                  !recipient;
                const targetUrl = useAndroidIntent
                  ? (entry.androidIntent as string)
                  : entry.buildTaskUrl
                    ? entry.buildTaskUrl({
                        query: taskQuery || undefined,
                        recipient: recipient || undefined,
                        subject: subject || undefined,
                      })
                    : entry.url;
                const actionLabel = taskQuery
                  ? `${entry.name} (${taskQuery})`
                  : entry.name;

                let linkItem: OpenedLinkItem | null = null;
                if (/^https?:/i.test(targetUrl)) {
                  linkItem = openAndLogUrl(targetUrl, actionLabel);
                } else {
                  triggerExternalUri(targetUrl);
                  linkItem = {
                    id: `link_${Date.now()}`,
                    url: targetUrl,
                    title: actionLabel,
                    timestamp: formatClockTime(),
                    autoOpened: true,
                  };
                  setOpenedLinks((prev) => [linkItem!, ...prev]);
                }

                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: taskQuery
                      ? `Opened ${entry.name} and ran task: "${taskQuery}"`
                      : `Opened ${entry.name}`,
                    timestamp: formatClockTime(),
                    link: linkItem ?? undefined,
                  },
                ]);
                respond({
                  success: true,
                  appName: entry.name,
                  taskQuery: taskQuery || null,
                  url: targetUrl,
                });
              } else {
                respond({
                  success: false,
                  availableApps: [
                    ...APP_DIRECTORY.map((a) => a.name),
                    ...customAppsRef.current.map((c) => c.name),
                  ],
                });
              }
              break;
            }

            if (name === 'openDeviceSettings') {
              const setting = String(args.setting ?? 'all').toLowerCase();
              setActiveControlFocus(setting);
              onNavigateTab?.('system');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Opened System Controls (${setting.toUpperCase()})`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({
                success: true,
                setting,
                online: deviceStatusRef.current.online,
                connectionType: deviceStatusRef.current.connectionType,
              });
              break;
            }

            if (name === 'toggleFlashlight') {
              const enabled = Boolean(args.enabled);
              await toggleFlashlight(enabled);
              onNavigateTab?.('system');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Flashlight turned ${enabled ? 'ON' : 'OFF'}`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({
                success: true,
                enabled,
                hardwareTorchActive: deviceStatusRef.current.flashlightHardware,
              });
              break;
            }

            if (name === 'setVolume') {
              const level = Number(args.level ?? 80);
              setVolume(level);
              const clamped = Math.max(0, Math.min(100, Math.round(level)));
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Voice volume set to ${clamped}%`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({ success: true, volume: clamped });
              break;
            }

            if (name === 'setBrightness') {
              const level = Number(args.level ?? 100);
              setBrightness(level);
              const clamped = Math.max(20, Math.min(100, Math.round(level)));
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Display brightness set to ${clamped}%`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({ success: true, brightness: clamped });
              break;
            }

            if (name === 'getBatteryStatus') {
              const bat = await readBatteryStatus();
              setDeviceStatus((prev) => ({
                ...prev,
                batteryLevel: bat.level,
                batteryCharging: bat.charging,
              }));
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: bat.supported
                    ? `Battery: ${bat.level}% (${bat.charging ? 'Charging' : 'On battery'})`
                    : 'Battery API restricted by browser',
                  timestamp: formatClockTime(),
                },
              ]);
              respond(bat);
              break;
            }

            if (name === 'takeScreenshot') {
              const label =
                typeof args.label === 'string' ? args.label : undefined;
              const shot = captureScreenshot(label);
              onNavigateTab?.('system');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Captured screenshot: ${shot.label}`,
                  timestamp: shot.timestamp,
                  screenshotUrl: shot.dataUrl,
                },
              ]);
              respond({
                success: true,
                label: shot.label,
                timestamp: shot.timestamp,
              });
              break;
            }

            if (name === 'setTimer') {
              const durationSeconds = Number(args.durationSeconds ?? 60);
              const label =
                typeof args.label === 'string' ? args.label : 'Timer';
              const timer = addTimer(durationSeconds, label);
              onNavigateTab?.('system');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Started timer "${timer.label}" (${timer.totalSeconds}s)`,
                  timestamp: timer.createdAt,
                },
              ]);
              respond({
                success: true,
                id: timer.id,
                label: timer.label,
                durationSeconds: timer.totalSeconds,
              });
              break;
            }

            if (name === 'setAlarm') {
              const time24h = String(args.time24h ?? '07:00');
              const label =
                typeof args.label === 'string' ? args.label : 'Alarm';
              const alarm = addAlarm(time24h, label);
              onNavigateTab?.('system');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Scheduled alarm "${alarm.label}" for ${alarm.time24h}`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({
                success: true,
                id: alarm.id,
                time24h: alarm.time24h,
                label: alarm.label,
              });
              break;
            }

            if (name === 'getAppCapabilities') {
              respond({
                apps: [
                  ...APP_DIRECTORY.map((a) => ({
                    name: a.name,
                    category: a.category,
                    description: a.description,
                  })),
                  ...customAppsRef.current.map((c) => ({
                    name: c.name,
                    category: c.category,
                    description: 'Custom user-connected app',
                  })),
                ],
                savedLocations: savedLocationsRef.current,
                deviceStatus: deviceStatusRef.current,
                healthState: healthRef.current,
                activeTimers: timersRef.current.length,
                activeAlarms: alarmsRef.current.length,
                savedMemories: memoriesRef.current.length,
                todosCount: todosRef.current.length,
              });
              break;
            }

            if (name === 'getConnectedApps') {
              onNavigateTab?.('system');
              respond({
                builtInApps: APP_DIRECTORY.map((a) => ({
                  name: a.name,
                  category: a.category,
                  description: a.description,
                })),
                customApps: customAppsRef.current,
                totalConnected:
                  APP_DIRECTORY.length + customAppsRef.current.length,
              });
              break;
            }

            if (name === 'navigateToLocation') {
              const dest =
                typeof args.destination === 'string' ? args.destination : '';
              const person =
                typeof args.personName === 'string' ? args.personName : '';
              const rawMode = String(args.mode ?? 'navigate').toLowerCase();
              const mode: 'navigate' | 'view' | 'share_my_location' =
                rawMode === 'share_my_location'
                  ? 'share_my_location'
                  : rawMode === 'view'
                    ? 'view'
                    : 'navigate';

              const navCard = await navigateToDestination({
                destination: dest,
                personName: person,
                mode,
                openInMaps: true,
              });
              onNavigateTab?.('internet');
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text:
                    mode === 'share_my_location'
                      ? `Located GPS coordinates (${navCard.destination})`
                      : `${mode === 'view' ? 'Viewing' : 'Navigating to'} ${navCard.destination}`,
                  timestamp: navCard.timestamp,
                  navigation: navCard,
                },
              ]);
              respond({
                success: true,
                ...navCard,
              });
              break;
            }

            if (name === 'saveLocation') {
              const label = String(args.label ?? '').trim();
              const addr = String(args.addressOrCoords ?? '').trim();
              const saved = addSavedLocation(label, addr);
              if (saved) {
                onNavigateTab?.('internet');
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Saved location "${saved.label}" → ${saved.addressOrCoords}`,
                    timestamp: saved.createdAt,
                  },
                ]);
                respond({ success: true, location: saved });
              } else {
                respond({
                  success: false,
                  error: 'Both label and address/coordinates are required.',
                });
              }
              break;
            }

            if (name === 'workOnWebsite') {
              const rawUrl = String(args.url ?? '').trim();
              const siteTaskQuery =
                typeof args.siteTaskQuery === 'string'
                  ? args.siteTaskQuery.trim()
                  : '';
              const openInTab =
                typeof args.openInTab === 'boolean' ? args.openInTab : true;
              const inspection = await inspectWebsiteUrl(
                rawUrl,
                siteTaskQuery,
                openInTab
              );
              onNavigateTab?.('internet');
              if (inspection) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Fixed & inspected website: ${inspection.title || inspection.fixedUrl}${siteTaskQuery ? ` (Task: ${siteTaskQuery})` : ''}`,
                    timestamp: inspection.timestamp,
                    link: {
                      id: `link_${Date.now()}`,
                      url: inspection.fixedUrl,
                      title: inspection.title || inspection.fixedUrl,
                      timestamp: inspection.timestamp,
                      autoOpened: openInTab,
                    },
                  },
                ]);
                respond({
                  success: true,
                  fixedUrl: inspection.fixedUrl,
                  status: inspection.status,
                  title: inspection.title,
                  description: inspection.description,
                  textPreview: inspection.textPreview.slice(0, 450),
                  topLinks: inspection.links.slice(0, 4),
                });
              } else {
                respond({
                  success: false,
                  error: `Could not fetch website "${rawUrl}".`,
                });
              }
              break;
            }

            if (name === 'autoTypeAndSendMessage') {
              const recipient =
                String(args.recipient ?? '').trim() || 'Contact';
              const platform =
                String(args.platform ?? '').trim() || 'WhatsApp';
              const phoneOrHandle = String(args.phoneOrHandle ?? '').trim();
              const messageText = String(args.messageText ?? '').trim();
              if (!messageText) {
                respond({
                  success: false,
                  error: 'Message text cannot be empty.',
                });
                break;
              }
              const preview = await triggerAutoTypeAndSend({
                recipient,
                platform,
                phoneOrHandle,
                messageText,
              });
              setTranscript((prev) => [
                ...prev,
                {
                  id: `action_${Date.now()}`,
                  speaker: 'action',
                  text: `Auto-typing ${platform} message to ${recipient}: "${messageText}"`,
                  timestamp: formatClockTime(),
                },
              ]);
              respond({
                success: true,
                typingStarted: true,
                autoSendEnabled:
                  settingsRef.current.autoConfirmMessages ||
                  Boolean(settingsRef.current.androidBridgeWebhookUrl),
                copiedToClipboard: true,
                actionUrl: preview.actionUrl,
              });
              break;
            }

            if (name === 'saveMemory') {
              const fact = String(args.fact ?? '').trim();
              const category = String(args.category ?? 'note');
              if (fact) {
                const mem = addMemory(fact, category);
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    speaker: 'action',
                    text: `Remembered: "${mem.fact}"`,
                    timestamp: mem.createdAt,
                  },
                ]);
                respond({ success: true, id: mem.id, fact: mem.fact });
              } else {
                respond({ success: false, error: 'Empty fact.' });
              }
              break;
            }

            respond({ success: false, error: `Unknown tool: ${name}` });
            break;
          }
          case 'error': {
            isConnectedRef.current = false;
            setErrorMessage(msg.message);
            setConnectionState('error');
            teardownAudio();
            ws.close();
            break;
          }
          case 'closed': {
            if (isConnectedRef.current) {
              isConnectedRef.current = false;
              teardownAudio();
              setActiveSessionSettings(null);
              setConnectionState('disconnected');
            }
            break;
          }
        }
      };

      ws.onerror = () => {
        isConnectedRef.current = false;
        setErrorMessage('WebSocket connection to voice server failed.');
        setConnectionState('error');
        teardownAudio();
      };

      ws.onclose = () => {
        if (isConnectedRef.current) {
          isConnectedRef.current = false;
          teardownAudio();
          setActiveSessionSettings(null);
          setConnectionState('disconnected');
        }
      };
    },
    [
      addAlarm,
      addMemory,
      addSavedLocation,
      addTimer,
      addTodo,
      appendOrUpdateTranscript,
      approveConfirmation,
      askWebQuestion,
      buildHealthContext,
      buildMemoryContext,
      cancelConfirmation,
      captureScreenshot,
      connectionState,
      fetchNews,
      fetchWeather,
      inspectWebsiteUrl,
      markNotificationsRead,
      navigateToDestination,
      onNavigateTab,
      openAndLogUrl,
      playAudioChunk,
      refreshPermissions,
      runRoutine,
      sendWsMessage,
      setBrightness,
      setVolume,
      settings,
      stopAllPlayback,
      teardownAudio,
      toggleFlashlight,
      toggleTodo,
      triggerAutoTypeAndSend,
    ]
  );

  // Hands-free "Backup Swati" Wake Word listener
  useEffect(() => {
    if (!settings.wakeWordEnabled || connectionState !== 'disconnected') {
      setWakeWordListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setWakeWordListening(false);
      return;
    }

    let cancelled = false;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.languageMode === 'hindi' ? 'hi-IN' : 'en-IN';

    recognition.onresult = (event) => {
      for (let i = 0; i < event.results.length; i++) {
        const spoken = event.results[i][0]?.transcript?.toLowerCase() ?? '';
        if (
          spoken.includes('backup swati') ||
          spoken.includes('बैकअप स्वाति') ||
          spoken.includes('hey swati') ||
          spoken.includes('swati') ||
          spoken.includes('स्वाति')
        ) {
          cancelled = true;
          try {
            recognition.stop();
          } catch {
            // ignore
          }
          connect();
          break;
        }
      }
    };

    recognition.onerror = () => {
      setWakeWordListening(false);
    };

    recognition.onend = () => {
      if (!cancelled && settings.wakeWordEnabled) {
        try {
          recognition.start();
        } catch {
          setWakeWordListening(false);
        }
      } else {
        setWakeWordListening(false);
      }
    };

    try {
      recognition.start();
      setWakeWordListening(true);
    } catch {
      setWakeWordListening(false);
    }

    return () => {
      cancelled = true;
      setWakeWordListening(false);
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [
    connect,
    connectionState,
    settings.languageMode,
    settings.wakeWordEnabled,
  ]);

  useEffect(() => {
    if (connectionState !== 'connected') return;
    const interval = window.setInterval(() => {
      setSessionSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [connectionState]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const interruptSwati = useCallback(() => {
    stopAllPlayback();
    pendingSwatiTranscriptIdRef.current = null;
  }, [stopAllPlayback]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      if (connectionState === 'connected' && isConnectedRef.current) {
        pendingUserTranscriptIdRef.current = null;
        pendingSwatiTranscriptIdRef.current = null;
        setTranscript((prev) => [
          ...prev,
          {
            id: `user_${Date.now()}`,
            speaker: 'user',
            text: cleaned,
            timestamp: formatClockTime(),
          },
        ]);
        sendWsMessage({ type: 'text', text: cleaned });
        return;
      }

      queuedPromptRef.current = cleaned;
      await connect();
    },
    [connect, connectionState, sendWsMessage]
  );

  const updateSettings = useCallback((partial: Partial<SessionSettings>) => {
    setSettings((prev) => ({
      model: (partial.model ?? prev.model) as LiveModelId,
      voice: (partial.voice ?? prev.voice) as VoicePreset,
      sassLevel: (partial.sassLevel ?? prev.sassLevel) as SassLevel,
      languageMode: (partial.languageMode ?? prev.languageMode) as LanguageMode,
      wakeWordEnabled:
        typeof partial.wakeWordEnabled === 'boolean'
          ? partial.wakeWordEnabled
          : prev.wakeWordEnabled,
      floatingBubbleEnabled:
        typeof partial.floatingBubbleEnabled === 'boolean'
          ? partial.floatingBubbleEnabled
          : prev.floatingBubbleEnabled,
      privacyMode:
        typeof partial.privacyMode === 'boolean'
          ? partial.privacyMode
          : prev.privacyMode,
      userPetName:
        typeof partial.userPetName === 'string'
          ? partial.userPetName
          : prev.userPetName,
      customPersonalityNote:
        typeof partial.customPersonalityNote === 'string'
          ? partial.customPersonalityNote
          : prev.customPersonalityNote,
      androidDeepLinkMode:
        typeof partial.androidDeepLinkMode === 'boolean'
          ? partial.androidDeepLinkMode
          : prev.androidDeepLinkMode,
      autoConfirmMessages:
        typeof partial.autoConfirmMessages === 'boolean'
          ? partial.autoConfirmMessages
          : prev.autoConfirmMessages,
      androidBridgeWebhookUrl:
        typeof partial.androidBridgeWebhookUrl === 'string'
          ? partial.androidBridgeWebhookUrl
          : prev.androidBridgeWebhookUrl,
    }));
  }, []);

  const applyAndReconnect = useCallback(async () => {
    const nextSettings = settings;
    disconnect();
    await new Promise((r) => setTimeout(r, 120));
    await connect(nextSettings);
  }, [connect, disconnect, settings]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    pendingUserTranscriptIdRef.current = null;
    pendingSwatiTranscriptIdRef.current = null;
    try {
      localStorage.removeItem(TRANSCRIPT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const reopenLink = useCallback((url: string) => {
    const safeUrl = sanitizeExternalUrl(url);
    if (safeUrl) {
      triggerExternalUri(safeUrl);
    }
  }, []);

  const pendingSettingsApply =
    connectionState === 'connected' &&
    activeSessionSettings !== null &&
    (activeSessionSettings.model !== settings.model ||
      activeSessionSettings.voice !== settings.voice ||
      activeSessionSettings.sassLevel !== settings.sassLevel ||
      activeSessionSettings.languageMode !== settings.languageMode ||
      activeSessionSettings.userPetName !== settings.userPetName ||
      activeSessionSettings.customPersonalityNote !==
        settings.customPersonalityNote);

  return {
    connectionState,
    isMuted,
    isMicAvailable,
    isSwatiSpeaking,
    wakeWordSupported,
    wakeWordListening,
    errorMessage,
    micNotice,
    internetError,
    settings,
    pendingSettingsApply,
    sessionSeconds,
    inputLevel,
    outputLevel,
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
    typingPreview,
    activeControlFocus,
    inputAnalyserRef,
    outputAnalyserRef,
    connect,
    disconnect,
    toggleMute,
    interruptSwati,
    sendTextMessage,
    updateSettings,
    applyAndReconnect,
    clearTranscript,
    reopenLink,
    setVolume,
    setBrightness,
    toggleFlashlight,
    captureScreenshot,
    addTimer,
    removeTimer,
    addAlarm,
    toggleAlarm,
    removeAlarm,
    dismissRinging,
    addMemory,
    removeMemory,
    clearMemories,
    launchAppByName,
    addCustomApp,
    removeCustomApp,
    addSavedLocation,
    removeSavedLocation,
    navigateToDestination,
    inspectWebsiteUrl,
    triggerAutoTypeAndSend,
    dismissTypingPreview,
    updateHealth,
    incrementWater,
    fetchWeather,
    fetchNews,
    askWebQuestion,
    searchGoogleUrl,
    searchYouTubeUrl,
    approveConfirmation,
    cancelConfirmation,
    addTodo,
    toggleTodo,
    removeTodo,
    addTimetableSlot,
    toggleTimetableSlot,
    removeTimetableSlot,
    runRoutine,
    addNotification,
    markNotificationsRead,
    removeNotification,
    updateEmergencyContact,
    refreshPermissions,
    requestPermission,
    wipeAllLocalData,
  };
}
