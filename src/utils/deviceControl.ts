import type { CustomPhoneApp, DeviceStatus } from '../types/live.ts';

export interface AppDirectoryEntry {
  key: string;
  name: string;
  category: 'Social' | 'Media' | 'Travel' | 'Finance' | 'Shopping' | 'Phone' | 'Work';
  url: string;
  androidIntent?: string;
  description: string;
  buildTaskUrl?: (params: {
    query?: string;
    recipient?: string;
    subject?: string;
  }) => string;
}

export const APP_DIRECTORY: AppDirectoryEntry[] = [
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    category: 'Social',
    url: 'https://web.whatsapp.com',
    androidIntent:
      'intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;end',
    description: 'Messaging and voice/video calls',
    buildTaskUrl: ({ query, recipient }) => {
      const digits = (recipient ?? '').replace(/[^\d]/g, '');
      if (digits || query) {
        const textPart = query ? `?text=${encodeURIComponent(query)}` : '';
        return `https://wa.me/${digits}${textPart}`;
      }
      return 'https://web.whatsapp.com';
    },
  },
  {
    key: 'youtube',
    name: 'YouTube',
    category: 'Media',
    url: 'https://www.youtube.com',
    androidIntent:
      'intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end',
    description: 'Videos, songs and search playback',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
        : 'https://www.youtube.com',
  },
  {
    key: 'maps',
    name: 'Google Maps',
    category: 'Travel',
    url: 'https://maps.google.com',
    androidIntent:
      'intent://maps.google.com/#Intent;scheme=https;package=com.google.android.apps.maps;end',
    description: 'Navigation, live location & routes',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        : 'https://maps.google.com',
  },
  {
    key: 'spotify',
    name: 'Spotify',
    category: 'Media',
    url: 'https://open.spotify.com',
    androidIntent:
      'intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;end',
    description: 'Music tracks, playlists and podcasts',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://open.spotify.com/search/${encodeURIComponent(query)}`
        : 'https://open.spotify.com',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    category: 'Social',
    url: 'https://www.instagram.com',
    androidIntent:
      'intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;end',
    description: 'Reels, stories and profile lookup',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`
        : 'https://www.instagram.com',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    category: 'Social',
    url: 'https://www.facebook.com',
    androidIntent:
      'intent://www.facebook.com/#Intent;scheme=https;package=com.facebook.katana;end',
    description: 'Feed, friends and messages',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.facebook.com/search/top/?q=${encodeURIComponent(query)}`
        : 'https://www.facebook.com',
  },
  {
    key: 'telegram',
    name: 'Telegram',
    category: 'Social',
    url: 'https://web.telegram.org',
    androidIntent:
      'intent://t.me/#Intent;scheme=https;package=org.telegram.messenger;end',
    description: 'Telegram chats and channels',
    buildTaskUrl: ({ recipient }) =>
      recipient
        ? `https://t.me/${encodeURIComponent(recipient.replace(/^@/, ''))}`
        : 'https://web.telegram.org',
  },
  {
    key: 'snapchat',
    name: 'Snapchat',
    category: 'Social',
    url: 'https://web.snapchat.com',
    androidIntent:
      'intent://www.snapchat.com/#Intent;scheme=https;package=com.snapchat.android;end',
    description: 'Snaps, chat and stories',
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    category: 'Social',
    url: 'https://x.com',
    androidIntent:
      'intent://x.com/#Intent;scheme=https;package=com.twitter.android;end',
    description: 'Posts and live trends',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://x.com/search?q=${encodeURIComponent(query)}`
        : 'https://x.com',
  },
  {
    key: 'gmail',
    name: 'Gmail',
    category: 'Work',
    url: 'https://mail.google.com',
    androidIntent:
      'intent://mail.google.com/#Intent;scheme=https;package=com.google.android.gm;end',
    description: 'Email inbox and compose',
    buildTaskUrl: ({ query, recipient, subject }) => {
      if (query || recipient || subject) {
        const params = new URLSearchParams({ view: 'cm', fs: '1' });
        if (recipient) params.set('to', recipient);
        if (subject) params.set('su', subject);
        if (query) params.set('body', query);
        return `https://mail.google.com/mail/?${params.toString()}`;
      }
      return 'https://mail.google.com';
    },
  },
  {
    key: 'chrome',
    name: 'Google Chrome',
    category: 'Work',
    url: 'https://www.google.com',
    androidIntent:
      'intent://www.google.com/#Intent;scheme=https;package=com.android.chrome;end',
    description: 'Web browser and Google search',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
        : 'https://www.google.com',
  },
  {
    key: 'paytm',
    name: 'Paytm',
    category: 'Finance',
    url: 'https://paytm.com',
    androidIntent:
      'intent://paytm.com/#Intent;scheme=https;package=net.one97.paytm;end',
    description: 'UPI payments and recharge',
  },
  {
    key: 'phonepe',
    name: 'PhonePe',
    category: 'Finance',
    url: 'https://www.phonepe.com',
    androidIntent:
      'intent://pay/#Intent;scheme=upi;package=com.phonepe.app;end',
    description: 'UPI transfers and bills',
  },
  {
    key: 'gpay',
    name: 'Google Pay',
    category: 'Finance',
    url: 'https://pay.google.com',
    androidIntent:
      'intent://upi/pay#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end',
    description: 'UPI payments',
  },
  {
    key: 'zomato',
    name: 'Zomato',
    category: 'Shopping',
    url: 'https://www.zomato.com',
    androidIntent:
      'intent://www.zomato.com/#Intent;scheme=https;package=com.application.zomato;end',
    description: 'Food delivery and restaurants',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.zomato.com/search?q=${encodeURIComponent(query)}`
        : 'https://www.zomato.com',
  },
  {
    key: 'swiggy',
    name: 'Swiggy',
    category: 'Shopping',
    url: 'https://www.swiggy.com',
    androidIntent:
      'intent://www.swiggy.com/#Intent;scheme=https;package=in.swiggy.android;end',
    description: 'Food and Instamart delivery',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.swiggy.com/search?query=${encodeURIComponent(query)}`
        : 'https://www.swiggy.com',
  },
  {
    key: 'uber',
    name: 'Uber',
    category: 'Travel',
    url: 'https://m.uber.com',
    androidIntent:
      'intent://m.uber.com/#Intent;scheme=https;package=com.ubercab;end',
    description: 'Cab & auto ride booking',
  },
  {
    key: 'ola',
    name: 'Ola Cabs',
    category: 'Travel',
    url: 'https://book.olacabs.com',
    androidIntent:
      'intent://book.olacabs.com/#Intent;scheme=https;package=com.olacabs.customer;end',
    description: 'Cab, auto and bike rides',
  },
  {
    key: 'amazon',
    name: 'Amazon',
    category: 'Shopping',
    url: 'https://www.amazon.in',
    androidIntent:
      'intent://www.amazon.in/#Intent;scheme=https;package=in.amazon.mShop.android.shopping;end',
    description: 'Shopping and product search',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.amazon.in/s?k=${encodeURIComponent(query)}`
        : 'https://www.amazon.in',
  },
  {
    key: 'flipkart',
    name: 'Flipkart',
    category: 'Shopping',
    url: 'https://www.flipkart.com',
    androidIntent:
      'intent://www.flipkart.com/#Intent;scheme=https;package=com.flipkart.android;end',
    description: 'Shopping and product search',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`
        : 'https://www.flipkart.com',
  },
  {
    key: 'dialer',
    name: 'Phone Dialer',
    category: 'Phone',
    url: 'tel:',
    androidIntent: 'intent:#Intent;action=android.intent.action.DIAL;end',
    description: 'Phone call dialer',
  },
  {
    key: 'sms',
    name: 'Messages (SMS)',
    category: 'Phone',
    url: 'sms:',
    androidIntent:
      'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_MESSAGING;end',
    description: 'Phone SMS inbox & compose',
    buildTaskUrl: ({ query, recipient }) =>
      `sms:${recipient ? recipient.replace(/[^\d+]/g, '') : ''}${
        query ? `?body=${encodeURIComponent(query)}` : ''
      }`,
  },
  {
    key: 'camera',
    name: 'Camera',
    category: 'Phone',
    url: 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
    androidIntent:
      'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
    description: 'Phone camera launcher',
  },
  {
    key: 'calculator',
    name: 'Calculator',
    category: 'Phone',
    url: 'https://www.google.com/search?q=calculator',
    androidIntent:
      'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end',
    description: 'Math calculator',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
        : 'https://www.google.com/search?q=calculator',
  },
  {
    key: 'clock',
    name: 'Clock & Alarm',
    category: 'Phone',
    url: 'https://time.is',
    androidIntent:
      'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end',
    description: 'Alarms and world clock',
  },
  {
    key: 'calendar',
    name: 'Calendar',
    category: 'Work',
    url: 'https://calendar.google.com',
    androidIntent:
      'intent://calendar.google.com/#Intent;scheme=https;package=com.google.android.calendar;end',
    description: 'Events, schedule and reminders',
  },
  {
    key: 'notes',
    name: 'Google Keep',
    category: 'Work',
    url: 'https://keep.google.com',
    androidIntent:
      'intent://keep.google.com/#Intent;scheme=https;package=com.google.android.keep;end',
    description: 'Quick notes and checklists',
  },
  {
    key: 'photos',
    name: 'Google Photos',
    category: 'Media',
    url: 'https://photos.google.com',
    androidIntent:
      'intent://photos.google.com/#Intent;scheme=https;package=com.google.android.apps.photos;end',
    description: 'Photo gallery and memories',
  },
  {
    key: 'drive',
    name: 'Google Drive',
    category: 'Work',
    url: 'https://drive.google.com',
    androidIntent:
      'intent://drive.google.com/#Intent;scheme=https;package=com.google.android.apps.docs;end',
    description: 'Cloud files and documents',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`
        : 'https://drive.google.com',
  },
  {
    key: 'playstore',
    name: 'Play Store',
    category: 'Phone',
    url: 'https://play.google.com/store',
    androidIntent:
      'intent://play.google.com/store/#Intent;scheme=https;package=com.android.vending;end',
    description: 'Android apps and games store',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`
        : 'https://play.google.com/store',
  },
  {
    key: 'settings',
    name: 'Phone Settings',
    category: 'Phone',
    url: 'intent:#Intent;action=android.settings.SETTINGS;end',
    androidIntent: 'intent:#Intent;action=android.settings.SETTINGS;end',
    description: 'Android system settings',
  },
  {
    key: 'github',
    name: 'GitHub',
    category: 'Work',
    url: 'https://github.com',
    description: 'Code repositories and issues',
    buildTaskUrl: ({ query }) =>
      query
        ? `https://github.com/search?q=${encodeURIComponent(query)}`
        : 'https://github.com',
  },
];

const APP_ALIASES: Record<string, string> = {
  yt: 'youtube',
  song: 'spotify',
  music: 'spotify',
  wa: 'whatsapp',
  map: 'maps',
  navigation: 'maps',
  location: 'maps',
  mail: 'gmail',
  email: 'gmail',
  google: 'chrome',
  browser: 'chrome',
  insta: 'instagram',
  ig: 'instagram',
  fb: 'facebook',
  twitter: 'x',
  tg: 'telegram',
  snap: 'snapchat',
  googlepay: 'gpay',
  'g pay': 'gpay',
  keep: 'notes',
  note: 'notes',
  calc: 'calculator',
  alarm: 'clock',
  timer: 'clock',
  phone: 'dialer',
  call: 'dialer',
  message: 'sms',
  messages: 'sms',
  gallery: 'photos',
  store: 'playstore',
  play: 'playstore',
};

export function resolveAppEntry(
  appName: string,
  customApps: CustomPhoneApp[] = []
): AppDirectoryEntry | null {
  const normalized = appName.trim().toLowerCase();
  if (!normalized) return null;

  const customMatch = customApps.find(
    (c) =>
      c.name.toLowerCase() === normalized ||
      c.name.toLowerCase().includes(normalized) ||
      normalized.includes(c.name.toLowerCase())
  );
  if (customMatch) {
    return {
      key: customMatch.id,
      name: customMatch.name,
      category: 'Phone',
      url: customMatch.url,
      androidIntent: customMatch.androidIntent,
      description: `User-connected app (${customMatch.category})`,
    };
  }

  for (const [alias, targetKey] of Object.entries(APP_ALIASES)) {
    if (normalized === alias || normalized.includes(alias)) {
      const aliased = APP_DIRECTORY.find((e) => e.key === targetKey);
      if (aliased) return aliased;
    }
  }

  return (
    APP_DIRECTORY.find(
      (entry) =>
        entry.key === normalized ||
        entry.name.toLowerCase().includes(normalized) ||
        normalized.includes(entry.key)
    ) ?? null
  );
}

export function normalizeAndFixUrl(rawInput: string): string | null {
  let cleaned = rawInput.trim().replace(/\s+/g, '');
  if (!cleaned) return null;

  // Fix common voice-to-text / user URL typos
  cleaned = cleaned
    .replace(/^htps:\/\//i, 'https://')
    .replace(/^htp:\/\//i, 'http://')
    .replace(/^https\/\//i, 'https://')
    .replace(/^http\/\//i, 'http://')
    .replace(/^www\./i, 'https://www.');

  if (!/^https?:\/\//i.test(cleaned)) {
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(cleaned)) {
      cleaned = `https://${cleaned}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function getCurrentGpsPosition(): Promise<{
  supported: boolean;
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
  error?: string;
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      supported: false,
      lat: null,
      lng: null,
      accuracyMeters: null,
      error: 'Geolocation unavailable in this browser.',
    };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          supported: true,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        resolve({
          supported: true,
          lat: null,
          lng: null,
          accuracyMeters: null,
          error: err.message || 'Location permission denied.',
        });
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  });
}

export async function readBatteryStatus(): Promise<{
  supported: boolean;
  level: number | null;
  charging: boolean | null;
}> {
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{
      level: number;
      charging: boolean;
    }>;
  };
  if (typeof nav.getBattery !== 'function') {
    return { supported: false, level: null, charging: null };
  }
  try {
    const battery = await nav.getBattery();
    return {
      supported: true,
      level: Math.round(battery.level * 100),
      charging: Boolean(battery.charging),
    };
  } catch {
    return { supported: false, level: null, charging: null };
  }
}

export function readNetworkStatus(): {
  online: boolean;
  connectionType: string;
} {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string };
  };
  const connType =
    nav.connection?.type ||
    nav.connection?.effectiveType ||
    (navigator.onLine ? 'Connected' : 'Offline');
  return {
    online: navigator.onLine,
    connectionType: String(connType),
  };
}

let activeTorchTrack: MediaStreamTrack | null = null;

export async function setHardwareFlashlight(
  enabled: boolean
): Promise<{ hardwareSupported: boolean }> {
  if (!enabled) {
    if (activeTorchTrack) {
      try {
        await activeTorchTrack.applyConstraints({
          advanced: [{ torch: false } as MediaTrackConstraintSet],
        });
      } catch {
        // ignore
      }
      activeTorchTrack.stop();
      activeTorchTrack = null;
    }
    return { hardwareSupported: false };
  }

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { hardwareSupported: false };
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    const track = stream.getVideoTracks()[0];
    if (!track) {
      return { hardwareSupported: false };
    }
    const capabilities = track.getCapabilities?.() as
      | (MediaTrackCapabilities & { torch?: boolean })
      | undefined;
    if (capabilities && capabilities.torch) {
      await track.applyConstraints({
        advanced: [{ torch: true } as MediaTrackConstraintSet],
      });
      activeTorchTrack = track;
      return { hardwareSupported: true };
    }
    track.stop();
    return { hardwareSupported: false };
  } catch {
    return { hardwareSupported: false };
  }
}

export function playAlertChime(): void {
  try {
    const ctx = new AudioContext();
    const notes = [880, 1174.66, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {
    // ignore audio block
  }
}

export function createWorkspaceSnapshotPng(params: {
  label: string;
  deviceStatus: DeviceStatus;
  recentLines: Array<{ speaker: string; text: string }>;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0B0B0D';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border frame
  ctx.strokeStyle = 'rgba(245, 243, 238, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Header
  ctx.fillStyle = '#E14B32';
  ctx.font = 'italic 600 32px Georgia, serif';
  ctx.fillText('Swati', 52, 78);

  ctx.fillStyle = '#A19E95';
  ctx.font = '500 15px system-ui, sans-serif';
  ctx.fillText(
    `${params.label} · ${new Date().toLocaleString()}`,
    152,
    76
  );

  // Device Telemetry Strip
  ctx.fillStyle = '#131317';
  ctx.fillRect(52, 104, canvas.width - 104, 68);
  ctx.strokeStyle = 'rgba(245, 243, 238, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(52, 104, canvas.width - 104, 68);

  const metrics = [
    `Battery: ${
      params.deviceStatus.batteryLevel !== null
        ? `${params.deviceStatus.batteryLevel}%${params.deviceStatus.batteryCharging ? ' (Charging)' : ''}`
        : 'Unavailable'
    }`,
    `Volume: ${params.deviceStatus.volume}%`,
    `Brightness: ${params.deviceStatus.brightness}%`,
    `Flashlight: ${params.deviceStatus.flashlightOn ? 'ON' : 'OFF'}`,
    `Network: ${params.deviceStatus.online ? 'Online' : 'Offline'}`,
  ];

  ctx.fillStyle = '#F5F3EE';
  ctx.font = '500 14px monospace';
  ctx.fillText(metrics.join('   |   '), 74, 144);

  // Recent conversation lines
  ctx.fillStyle = '#A19E95';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('RECENT SESSION TRANSCRIPT', 52, 210);

  let y = 244;
  const lines = params.recentLines.slice(-6);
  if (lines.length === 0) {
    ctx.fillStyle = '#78756E';
    ctx.font = '400 15px system-ui, sans-serif';
    ctx.fillText('No spoken dialogue recorded yet in this snapshot.', 52, y);
  } else {
    for (const item of lines) {
      if (y > 480) break;
      ctx.fillStyle = item.speaker === 'swati' ? '#E14B32' : '#D7D4CC';
      ctx.font = '600 13px system-ui, sans-serif';
      const label = item.speaker === 'swati' ? 'Swati:' : 'You:';
      ctx.fillText(label, 52, y);

      ctx.fillStyle = '#F5F3EE';
      ctx.font = '400 14px system-ui, sans-serif';
      const clipped =
        item.text.length > 88 ? `${item.text.slice(0, 88)}…` : item.text;
      ctx.fillText(clipped, 114, y);
      y += 36;
    }
  }

  return canvas.toDataURL('image/png');
}
