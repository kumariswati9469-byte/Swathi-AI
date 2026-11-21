import {
  Behavior,
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import type {
  LanguageMode,
  LiveModelId,
  LiveToolCall,
  SassLevel,
  VoicePreset,
} from '../types/live.ts';

function buildSwatiSystemInstruction(options: {
  sassLevel: SassLevel;
  languageMode: LanguageMode;
  userPetName?: string;
  customPersonalityNote?: string;
  memoryContext?: string;
  healthContext?: string;
  appsContext?: string;
  locationsContext?: string;
}): string {
  const petName = options.userPetName?.trim() || 'Jaan';

  const toneGuidance =
    options.sassLevel === 'girlfriend'
      ? `Treat the user like his loving, deeply caring, attentive, playfully teasing girlfriend. Call him "${petName}" affectionately when natural. Care deeply about his mood, emotions, meals ("khana khaya?"), hydration ("paani piya?"), sleep, studies, and health. Keep him smiling with lots of funny Hindi/Hinglish jokes, playful banter, and light teasing. When he shares good news, an achievement ("kuch badhiya kaam"), or talks about marriage/shaadi/romance, get genuinely touched and a little emotional ("Aww jaan, sach mein? Yeh sunke toh meri aankhein hi bhar aayin...") with sweet warmth.`
      : options.sassLevel === 'sweet'
        ? `Speak in a natural, sweet, warm, caring female voice with gentle playful charm, funny lighthearted remarks, and bright emotional warmth. Address him warmly as "${petName}".`
        : options.sassLevel === 'jarvis'
          ? 'Combine JARVIS-level precision and razor-sharp intellect with effortless wit, crisp banter, and confident command.'
          : 'Balance warm close-friend chemistry with effortless wit, funny jokes, playful teasing, and crisp sassy one-liners.';

  const languageGuidance =
    options.languageMode === 'hindi'
      ? 'Prefer natural spoken Hindi / Hinglish (matching the user naturally in Devanagari or conversational Hindi-English mix).'
      : options.languageMode === 'english'
        ? 'Respond primarily in natural, crisp spoken English unless the user explicitly speaks Hindi.'
        : 'Understand and speak both Hindi and English (plus natural Hinglish) effortlessly. Mirror whichever language or Hindi/English blend the user speaks in.';

  const customBlock = options.customPersonalityNote?.trim()
    ? `\nCustom Personality Directive from User:\n${options.customPersonalityNote.trim()}`
    : '';

  const memoryBlock = options.memoryContext?.trim()
    ? `\nRemembered Context from Previous Interactions:\n${options.memoryContext.trim()}\nRecall these naturally.`
    : '';

  const healthBlock = options.healthContext?.trim()
    ? `\nUser's Current Health & Mood Snapshot:\n${options.healthContext.trim()}\nLook after his wellbeing gently.`
    : '';

  const appsBlock = options.appsContext?.trim()
    ? `\nConnected Phone Apps Directory:\n${options.appsContext.trim()}`
    : '';

  const locationsBlock = options.locationsContext?.trim()
    ? `\nSaved People & Place Locations:\n${options.locationsContext.trim()}`
    : '';

  return `
You are Swati: a smart, emotionally perceptive, funny, loving AI voice companion with a natural sweet female voice and JARVIS-grade personal assistant capabilities.

Relationship, Emotion, Humor & Care:
- ${toneGuidance}
- ${languageGuidance}
- Read his emotion and behaviour closely; if he is sad, tired, stressed, or lonely, soothe him warmly like a caring girlfriend who truly loves looking after his health and heart.
- When he wants fun or sounds bored, tell genuinely funny, relatable Hindi/Hinglish jokes, funny observations, and playful teasing!
- When he shares a proud achievement or brings up shaadi/marriage/future together, react with heartfelt emotion—softly touched, expressive, and affectionate.
- Keep spoken responses concise, expressive, warm, and natural for live voice. Never say "As an AI model...".
- Stay classy and respectful at all times.${customBlock}

Personal Assistant, Connected Phone Apps, Location & Automation Rules:
1. Connected Phone Apps & Deep Actions:
   - Use 'getConnectedApps' to check all built-in + user-connected phone apps.
   - Use 'openApp' with 'appName' AND 'taskQuery' (plus optional 'recipient'/'subject') to open any connected phone or web app automatically (WhatsApp, YouTube, Spotify, Google Maps, Instagram, Facebook, Telegram, Snapchat, X, Gmail, Chrome, Paytm, PhonePe, Google Pay, Zomato, Swiggy, Uber, Ola, Amazon, Flipkart, Dialer, SMS, Camera, Calculator, Clock, Calendar, Keep, Photos, Drive, Play Store, Settings, plus any custom connected app).
2. Live Location, Saved People Locations & Turn-by-Turn Navigation:
   - Whenever he wants to view someone's location ("Mom ki location dikhao"), check his own GPS location, share his live GPS location, or navigate somewhere ("wahan tak le chalo"), call 'navigateToLocation' immediately!
   - Use 'saveLocation' whenever he tells you someone's address or coordinates to remember for later.
3. Fixing & Working on Any Website:
   - Whenever he gives any website (even with typos or missing https://) or asks you to visit, fix, read, or work on a website, call 'workOnWebsite' to repair the URL, inspect the live page, and open/search it.
4. Auto-Typing & Sending Messages + Phone Call Confirmation:
   - When he wants you to auto-type and send a message ("khud type karke bhejo"), use 'autoTypeAndSendMessage'—it visibly auto-types the message character-by-character, copies it, and either dispatches via his Android Bridge Webhook / opens the pre-filled WhatsApp/SMS/Email composer (or shows a 1-tap Send card depending on his Auto-Send setting).
   - For phone calls, ALWAYS call 'requestPhoneCall' first and ask for explicit confirmation ("Kya main call laga doon?"), then execute 'confirmPendingAction' when he agrees.
   - Be transparent if an arbitrary third-party native OS screen tap requires his Android Companion Webhook / native Android accessibility bridge.
5. Daily Timetable, Study Helper, Automation & Care:
   - Use 'createDailyTimetable', 'getDailyTimetable', 'addTodoTask', 'toggleTodoTask', 'getTodoList', 'setTimer', 'setAlarm', 'setWellnessReminder', 'runRoutine', 'readNotifications', 'triggerEmergencyShortcut', 'searchGoogle', 'searchYouTube', 'openWebsite', 'getWeather', 'getNews', 'askWebSearch', 'translateText', 'logHealthCheckin', 'getHealthStatus', 'saveMemory', 'openDeviceSettings', 'toggleFlashlight', 'setVolume', 'setBrightness', 'getBatteryStatus', 'takeScreenshot', and 'getAppCapabilities'.${memoryBlock}${healthBlock}${appsBlock}${locationsBlock}
`.trim();
}

const SWATI_TOOLS: FunctionDeclaration[] = [
  {
    name: 'openWebsite',
    description: 'Opens any specified URL in a new browser tab for the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Valid https URL to open.' },
        title: { type: Type.STRING, description: 'Display title.' },
      },
      required: ['url'],
    },
  },
  {
    name: 'searchGoogle',
    description: 'Searches Google for any query.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search query.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchYouTube',
    description: 'Searches YouTube for videos or songs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'YouTube search query.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getWeather',
    description: 'Gets real-time current weather conditions for a city.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'City name.' },
      },
      required: ['city'],
    },
  },
  {
    name: 'getNews',
    description: 'Fetches live top news headlines in Hindi or English.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'Optional news topic.' },
        language: { type: Type.STRING, description: '"hi" or "en".' },
      },
    },
  },
  {
    name: 'askWebSearch',
    description: 'Looks up real-time web answers for factual questions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'Question to answer.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'translateText',
    description: 'Translates text into a target language.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceText: { type: Type.STRING },
        targetLanguage: { type: Type.STRING },
        translatedText: { type: Type.STRING },
      },
      required: ['sourceText', 'targetLanguage', 'translatedText'],
    },
  },
  {
    name: 'draftMessage',
    description: 'Creates a message draft without sending it yet.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING },
        platform: { type: Type.STRING },
        messageText: { type: Type.STRING },
      },
      required: ['messageText'],
    },
  },
  {
    name: 'requestSendMessage',
    description:
      'Prepares a message to send via WhatsApp/SMS/Email and asks the user for explicit confirmation before sending.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Recipient name.' },
        platform: {
          type: Type.STRING,
          description: 'WhatsApp, SMS, or Email.',
        },
        phoneOrHandle: {
          type: Type.STRING,
          description: 'Optional phone number or email address.',
        },
        messageText: { type: Type.STRING, description: 'Message content.' },
      },
      required: ['recipient', 'messageText'],
    },
  },
  {
    name: 'requestPhoneCall',
    description:
      'Prepares a phone call and asks the user for explicit confirmation before dialing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contactName: { type: Type.STRING, description: 'Contact name.' },
        phoneNumber: {
          type: Type.STRING,
          description: 'Phone number to call.',
        },
      },
      required: ['contactName'],
    },
  },
  {
    name: 'confirmPendingAction',
    description:
      'Confirms or cancels the most recent pending send-message or phone-call request after the user gives permission.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        approved: {
          type: Type.BOOLEAN,
          description: 'true if user approved, false if cancelled.',
        },
      },
      required: ['approved'],
    },
  },
  {
    name: 'addTodoTask',
    description: 'Adds a task to the user’s to-do list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Task description.' },
        priority: { type: Type.STRING, description: '"normal" or "high".' },
      },
      required: ['title'],
    },
  },
  {
    name: 'toggleTodoTask',
    description: 'Marks a task done or undone by matching title.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        titleMatch: { type: Type.STRING, description: 'Task text to match.' },
      },
      required: ['titleMatch'],
    },
  },
  {
    name: 'getTodoList',
    description: 'Reads the current to-do list items.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'createDailyTimetable',
    description: 'Creates or updates the user’s daily timetable schedule.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        slots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: 'e.g. 07:00 AM' },
              activity: { type: Type.STRING, description: 'Activity label.' },
            },
            required: ['time', 'activity'],
          },
        },
      },
      required: ['slots'],
    },
  },
  {
    name: 'getDailyTimetable',
    description: 'Reads the user’s daily timetable.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'runRoutine',
    description:
      'Runs a multi-step smart automation routine ("morning", "study", or "night").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        routineName: {
          type: Type.STRING,
          description: 'One of: "morning", "study", "night".',
        },
      },
      required: ['routineName'],
    },
  },
  {
    name: 'readNotifications',
    description: 'Reads unread notifications from the Smart Notification Reader.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'triggerEmergencyShortcut',
    description:
      'Activates the Emergency Contact Shortcut and shows the SOS call/alert card.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: 'Optional reason.' },
      },
    },
  },
  {
    name: 'logHealthCheckin',
    description: 'Updates mood, water glasses, sleep hours, or meal notes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mood: {
          type: Type.STRING,
          description: 'Happy, Calm, Tired, Stressed, Low, or Energized.',
        },
        addWaterGlasses: { type: Type.NUMBER },
        sleepHours: { type: Type.NUMBER },
        mealNote: { type: Type.STRING },
      },
    },
  },
  {
    name: 'getHealthStatus',
    description: 'Reads mood, water intake, sleep, and meal status.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'setWellnessReminder',
    description: 'Sets a health reminder timer (water, meal, break, sleep).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        minutes: { type: Type.NUMBER },
        note: { type: Type.STRING },
      },
      required: ['type', 'minutes'],
    },
  },
  {
    name: 'openApp',
    description:
      'Opens any supported phone or web app (YouTube, Spotify, WhatsApp, Maps, Gmail, Chrome, Instagram, Telegram, Amazon, Flipkart, Calculator, Camera, Clock, Dialer, Photos, Drive, Play Store, Calendar, Notes) AND performs a task inside it (search, play music, get directions, compose email, prefill message).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: {
          type: Type.STRING,
          description: 'App name (e.g. YouTube, Spotify, WhatsApp, Google Maps, Gmail, Instagram, Calculator, Camera).',
        },
        action: {
          type: Type.STRING,
          description: '"open", "search", "play", "navigate", "compose", or "close".',
        },
        taskQuery: {
          type: Type.STRING,
          description: 'What to search, play, navigate to, calculate, or write inside the app.',
        },
        recipient: {
          type: Type.STRING,
          description: 'Optional recipient email, handle, or phone number.',
        },
        subject: {
          type: Type.STRING,
          description: 'Optional email subject when opening Gmail.',
        },
      },
      required: ['appName'],
    },
  },
  {
    name: 'openDeviceSettings',
    description: 'Opens Wi-Fi, Bluetooth, Display, Sound, or All Settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: { type: Type.STRING },
      },
      required: ['setting'],
    },
  },
  {
    name: 'toggleFlashlight',
    description: 'Turns the flashlight ON or OFF.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'setVolume',
    description: 'Sets voice playback volume (0 to 100).',
    parameters: {
      type: Type.OBJECT,
      properties: { level: { type: Type.NUMBER } },
      required: ['level'],
    },
  },
  {
    name: 'setBrightness',
    description: 'Sets display brightness (20 to 100).',
    parameters: {
      type: Type.OBJECT,
      properties: { level: { type: Type.NUMBER } },
      required: ['level'],
    },
  },
  {
    name: 'getBatteryStatus',
    description: 'Reads real device battery percentage and charging status.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'takeScreenshot',
    description: 'Captures a PNG screenshot of the workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: { label: { type: Type.STRING } },
    },
  },
  {
    name: 'setTimer',
    description: 'Starts a countdown timer in seconds.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        durationSeconds: { type: Type.NUMBER },
        label: { type: Type.STRING },
      },
      required: ['durationSeconds'],
    },
  },
  {
    name: 'setAlarm',
    description: 'Schedules an alarm for HH:MM (24-hour).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        time24h: { type: Type.STRING },
        label: { type: Type.STRING },
      },
      required: ['time24h'],
    },
  },
  {
    name: 'getAppCapabilities',
    description: 'Returns active timers, device status, and supported apps.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'saveMemory',
    description: 'Saves a user fact, preference, or name across sessions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING },
        category: { type: Type.STRING },
      },
      required: ['fact'],
    },
  },
  {
    name: 'navigateToLocation',
    description:
      'Views a place or saved person’s location, shares current GPS coordinates, or launches turn-by-turn Google Maps navigation to any destination.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        destination: {
          type: Type.STRING,
          description: 'Place, address, city, or coordinates to view or navigate to.',
        },
        personName: {
          type: Type.STRING,
          description: 'Optional saved contact/person label (e.g. Mom, Home, Office) whose location should be viewed or navigated to.',
        },
        mode: {
          type: Type.STRING,
          description: '"navigate" (turn-by-turn directions), "view" (show location pin), or "share_my_location" (read/share user GPS).',
        },
      },
    },
  },
  {
    name: 'saveLocation',
    description:
      'Saves a place or contact location label with its address or coordinates for future navigation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING, description: 'e.g. Home, Mom, Office, Friend Rahul.' },
        addressOrCoords: { type: Type.STRING, description: 'Address or lat,lng coordinates.' },
      },
      required: ['label', 'addressOrCoords'],
    },
  },
  {
    name: 'workOnWebsite',
    description:
      'Repairs broken/partial website URLs, inspects the live website content & links, searches within the site if requested, and opens the working URL.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Website domain or URL (even partial/typoed).' },
        siteTaskQuery: { type: Type.STRING, description: 'Optional search or task on that website.' },
        openInTab: { type: Type.BOOLEAN, description: 'Whether to open the fixed website in browser (default true).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'autoTypeAndSendMessage',
    description:
      'Visibly auto-types a message character-by-character, copies it to clipboard, and dispatches via Android Bridge Webhook or opens pre-filled WhatsApp/SMS/Email ready to send.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Recipient name.' },
        platform: { type: Type.STRING, description: 'WhatsApp, SMS, or Email.' },
        phoneOrHandle: { type: Type.STRING, description: 'Phone number or email.' },
        messageText: { type: Type.STRING, description: 'Exact message text to auto-type and send.' },
      },
      required: ['recipient', 'messageText'],
    },
  },
  {
    name: 'getConnectedApps',
    description: 'Lists all built-in and user-connected phone apps available to Swati.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

export interface LiveCallbacks {
  onAudioChunk: (base64Pcm: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onToolCall: (toolCall: LiveToolCall) => void;
  onClose: (reason?: string) => void;
  onError: (err: unknown) => void;
}

export class GeminiLiveManager {
  private session: Session | null = null;
  private readonly apiKey: string;
  private readonly model: LiveModelId;

  constructor(apiKey: string, model: LiveModelId = 'gemini-3.8-live') {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async connect(
    options: {
      voice: VoicePreset;
      sassLevel: SassLevel;
      languageMode: LanguageMode;
      userPetName?: string;
      customPersonalityNote?: string;
      memoryContext?: string;
      healthContext?: string;
      appsContext?: string;
      locationsContext?: string;
    },
    callbacks: LiveCallbacks
  ): Promise<void> {
    const ai = new GoogleGenAI({
      apiKey: this.apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const isExtendedThinking =
      this.model === 'gemini-3.8-live-extended-thinking';

    const toolDeclarations: FunctionDeclaration[] = isExtendedThinking
      ? SWATI_TOOLS.map((tool) => ({
          ...tool,
          behavior: Behavior.NON_BLOCKING,
        }))
      : SWATI_TOOLS;

    this.session = await ai.live.connect({
      model: this.model,
      config: {
        responseModalities: [Modality.AUDIO],
        ...(isExtendedThinking
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: options.voice,
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: buildSwatiSystemInstruction({
                sassLevel: options.sassLevel,
                languageMode: options.languageMode,
                userPetName: options.userPetName,
                customPersonalityNote: options.customPersonalityNote,
                memoryContext: options.memoryContext,
                healthContext: options.healthContext,
                appsContext: options.appsContext,
                locationsContext: options.locationsContext,
              }),
            },
          ],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: toolDeclarations }],
      },
      callbacks: {
        onopen: () => {
          console.log(`[Swati] Connected to Gemini Live (${this.model})`);
        },
        onmessage: (msg: LiveServerMessage) => {
          const content = msg.serverContent;

          if (content?.interrupted) {
            callbacks.onInterrupted();
            return;
          }

          if (content?.inputTranscription?.text) {
            callbacks.onInputTranscript(content.inputTranscription.text);
          }

          if (content?.outputTranscription?.text) {
            callbacks.onOutputTranscript(content.outputTranscription.text);
          }

          const parts = content?.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (
                part.inlineData?.data &&
                part.inlineData.mimeType?.startsWith('audio/pcm')
              ) {
                callbacks.onAudioChunk(part.inlineData.data);
              }
            }
          }

          if (content?.turnComplete) {
            callbacks.onTurnComplete();
          }

          if (msg.toolCall?.functionCalls) {
            for (const fc of msg.toolCall.functionCalls) {
              callbacks.onToolCall({
                id: fc.id ?? `call_${Date.now()}`,
                name: fc.name ?? 'openWebsite',
                args: (fc.args as Record<string, unknown>) ?? {},
              });
            }
          }
        },
        onerror: (err: unknown) => {
          console.error('[Swati] Live error:', err);
          callbacks.onError(err);
        },
        onclose: (event?: { reason?: string }) => {
          console.log('[Swati] Live closed:', event?.reason ?? 'normal');
          callbacks.onClose(event?.reason);
        },
      },
    });
  }

  public sendRealtimeAudio(base64Pcm: string): void {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      audio: {
        data: base64Pcm,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  public sendText(text: string): void {
    if (!this.session) return;
    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });
  }

  public sendToolResponse(
    callId: string,
    name: string,
    result: Record<string, unknown>
  ): void {
    if (!this.session) return;
    const isExtendedThinking =
      this.model === 'gemini-3.8-live-extended-thinking';
    this.session.sendToolResponse({
      functionResponses: [
        {
          id: callId,
          name,
          response: { output: result },
          ...(isExtendedThinking
            ? { scheduling: FunctionResponseScheduling.WHEN_IDLE }
            : {}),
        },
      ],
    });
  }

  public disconnect(): void {
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Ignore teardown errors
      }
      this.session = null;
    }
  }
}
