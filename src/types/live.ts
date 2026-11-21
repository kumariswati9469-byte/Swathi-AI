export type VoicePreset = 'Aoede' | 'Kore' | 'Zephyr' | 'Puck';

export type SassLevel = 'girlfriend' | 'sweet' | 'sassy' | 'jarvis';

export type LanguageMode = 'bilingual' | 'hindi' | 'english';

export type LiveModelId =
  | 'gemini-3.8-live'
  | 'gemini-3.8-live-extended-thinking';

export type UserMood =
  | 'Happy'
  | 'Calm'
  | 'Tired'
  | 'Stressed'
  | 'Low'
  | 'Energized';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface LiveToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface OpenedLinkItem {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  autoOpened: boolean;
}

export interface CustomPhoneApp {
  id: string;
  name: string;
  url: string;
  androidIntent?: string;
  category: string;
}

export interface SavedLocation {
  id: string;
  label: string;
  addressOrCoords: string;
  createdAt: string;
}

export interface LocationNavigationCard {
  id: string;
  mode: 'navigate' | 'view' | 'share_my_location';
  destination: string;
  originCoords?: { lat: number; lng: number } | null;
  directionsUrl: string;
  androidNavUrl: string;
  timestamp: string;
}

export interface WebsiteInspectionResult {
  fixedUrl: string;
  status: number;
  title: string;
  description: string;
  textPreview: string;
  links: Array<{ text: string; url: string }>;
  timestamp: string;
}

export interface TypingPreviewState {
  id: string;
  recipient: string;
  platform: string;
  fullText: string;
  typedText: string;
  isTyping: boolean;
  actionUrl: string;
  dispatched: boolean;
}

export interface MemoryItem {
  id: string;
  fact: string;
  category: string;
  createdAt: string;
}

export interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  ringing: boolean;
  createdAt: string;
}

export interface AlarmItem {
  id: string;
  label: string;
  time24h: string;
  enabled: boolean;
  ringing: boolean;
}

export interface ScreenshotItem {
  id: string;
  label: string;
  dataUrl: string;
  timestamp: string;
}

export interface WeatherReport {
  city: string;
  country: string;
  temperatureC: number;
  feelsLikeC: number;
  humidity: number;
  windKmh: number;
  condition: string;
  fetchedAt: string;
}

export interface NewsHeadline {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

export interface GroundedAnswer {
  id: string;
  question: string;
  answer: string;
  sources: Array<{ title: string; uri: string }>;
  timestamp: string;
}

export interface MessageDraft {
  id: string;
  recipient: string;
  platform: string;
  text: string;
  timestamp: string;
}

export interface PendingConfirmation {
  id: string;
  kind: 'send_message' | 'make_call';
  recipient: string;
  target: string; // phone number or platform
  messageText?: string;
  actionUrl: string; // tel:, sms:, https://wa.me/, mailto:
  status: 'pending' | 'approved' | 'cancelled';
  createdAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  priority: 'normal' | 'high';
  createdAt: string;
}

export interface TimetableSlot {
  id: string;
  time: string;
  activity: string;
  done: boolean;
}

export interface NotificationItem {
  id: string;
  app: string;
  sender: string;
  body: string;
  time: string;
  read: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface PermissionSnapshot {
  microphone: string;
  camera: string;
  notifications: string;
  location: string;
}

export interface HealthState {
  mood: UserMood;
  waterGlasses: number;
  waterGoal: number;
  sleepHours: number;
  lastMeal: string;
  lastCheckinAt: string;
  notes: string[];
}

export interface DeviceStatus {
  volume: number;
  brightness: number;
  flashlightOn: boolean;
  flashlightHardware: boolean;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  online: boolean;
  connectionType: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'swati' | 'action' | 'system';
  text: string;
  timestamp: string;
  link?: OpenedLinkItem;
  screenshotUrl?: string;
  weather?: WeatherReport;
  draft?: MessageDraft;
  confirmationId?: string;
  navigation?: LocationNavigationCard;
}

export interface SessionSettings {
  model: LiveModelId;
  voice: VoicePreset;
  sassLevel: SassLevel;
  languageMode: LanguageMode;
  wakeWordEnabled: boolean;
  floatingBubbleEnabled: boolean;
  privacyMode: boolean;
  userPetName: string;
  customPersonalityNote: string;
  androidDeepLinkMode: boolean;
  autoConfirmMessages: boolean;
  androidBridgeWebhookUrl: string;
}

export type ClientToServerMessage =
  | {
      type: 'start';
      model?: LiveModelId;
      voice?: VoicePreset;
      sassLevel?: SassLevel;
      languageMode?: LanguageMode;
      userPetName?: string;
      customPersonalityNote?: string;
      memoryContext?: string;
      healthContext?: string;
      appsContext?: string;
      locationsContext?: string;
    }
  | { type: 'audio'; audio: string }
  | { type: 'text'; text: string }
  | {
      type: 'toolResult';
      id: string;
      name: string;
      result: Record<string, unknown>;
    }
  | { type: 'stop' };

export type ServerToClientMessage =
  | {
      type: 'ready';
      model: LiveModelId;
      voice: VoicePreset;
      sassLevel: SassLevel;
      languageMode: LanguageMode;
    }
  | { type: 'audio'; audio: string }
  | { type: 'interrupted' }
  | { type: 'turnComplete' }
  | { type: 'inputTranscript'; text: string }
  | { type: 'outputTranscript'; text: string }
  | { type: 'toolCall'; toolCall: LiveToolCall }
  | { type: 'error'; message: string }
  | { type: 'closed'; reason?: string };
