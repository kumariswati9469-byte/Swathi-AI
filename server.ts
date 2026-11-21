import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GeminiLiveManager } from './src/server/geminiLiveManager.ts';
import {
  dispatchAndroidBridge,
  fetchLiveNews,
  fetchLiveWeather,
  inspectAndWorkWebsite,
  runGroundedWebSearch,
} from './src/server/internetService.ts';
import type {
  ClientToServerMessage,
  LanguageMode,
  LiveModelId,
  SassLevel,
  ServerToClientMessage,
  VoicePreset,
} from './src/types/live.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MODELS: ReadonlySet<LiveModelId> = new Set([
  'gemini-3.8-live',
  'gemini-3.8-live-extended-thinking',
]);
const ALLOWED_VOICES: ReadonlySet<VoicePreset> = new Set([
  'Aoede',
  'Kore',
  'Zephyr',
  'Puck',
]);
const ALLOWED_SASS: ReadonlySet<SassLevel> = new Set([
  'girlfriend',
  'sweet',
  'sassy',
  'jarvis',
]);
const ALLOWED_LANGUAGES: ReadonlySet<LanguageMode> = new Set([
  'bilingual',
  'hindi',
  'english',
]);

function sendToClient(ws: WebSocket, payload: ServerToClientMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Unexpected error connecting to Swati Live service.';
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-3.8-live',
    });
  });

  app.get('/api/internet/weather', async (req, res) => {
    const city =
      typeof req.query.city === 'string' ? req.query.city : 'New Delhi';
    try {
      const weather = await fetchLiveWeather(city);
      res.json(weather);
    } catch (err) {
      res.status(400).json({ error: formatErrorMessage(err) });
    }
  });

  app.get('/api/internet/news', async (req, res) => {
    const topic = typeof req.query.topic === 'string' ? req.query.topic : '';
    const lang = req.query.lang === 'en' ? 'en' : 'hi';
    try {
      const headlines = await fetchLiveNews(topic, lang);
      res.json({ headlines });
    } catch (err) {
      res.status(502).json({ error: formatErrorMessage(err) });
    }
  });

  app.post('/api/internet/search', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured. Check Settings > Secrets.',
      });
      return;
    }
    const question =
      typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }
    try {
      const result = await runGroundedWebSearch(question, apiKey);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: formatErrorMessage(err) });
    }
  });

  app.post('/api/internet/website', async (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) {
      res.status(400).json({ error: 'Website URL is required.' });
      return;
    }
    try {
      const inspection = await inspectAndWorkWebsite(url);
      res.json(inspection);
    } catch (err) {
      res.status(400).json({ error: formatErrorMessage(err) });
    }
  });

  app.post('/api/bridge/dispatch', async (req, res) => {
    const webhookUrl =
      typeof req.body?.webhookUrl === 'string'
        ? req.body.webhookUrl.trim()
        : '';
    const payload =
      req.body?.payload && typeof req.body.payload === 'object'
        ? (req.body.payload as Record<string, unknown>)
        : {};
    if (!webhookUrl) {
      res.status(400).json({ error: 'Bridge webhook URL is required.' });
      return;
    }
    try {
      const result = await dispatchAndroidBridge(webhookUrl, payload);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: formatErrorMessage(err) });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', (clientWs: WebSocket) => {
    let manager: GeminiLiveManager | null = null;
    let isStarting = false;

    const cleanup = () => {
      if (manager) {
        manager.disconnect();
        manager = null;
      }
    };

    clientWs.on('message', async (rawData) => {
      let message: ClientToServerMessage;
      try {
        message = JSON.parse(rawData.toString()) as ClientToServerMessage;
      } catch {
        sendToClient(clientWs, {
          type: 'error',
          message: 'Invalid WebSocket payload.',
        });
        return;
      }

      if (message.type === 'start') {
        if (manager || isStarting) return;
        isStarting = true;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          isStarting = false;
          sendToClient(clientWs, {
            type: 'error',
            message:
              'GEMINI_API_KEY is not configured. Add it in Settings > Secrets.',
          });
          return;
        }

        const model: LiveModelId =
          message.model && ALLOWED_MODELS.has(message.model)
            ? message.model
            : 'gemini-3.8-live';
        const voice: VoicePreset =
          message.voice && ALLOWED_VOICES.has(message.voice)
            ? message.voice
            : 'Aoede';
        const sassLevel: SassLevel =
          message.sassLevel && ALLOWED_SASS.has(message.sassLevel)
            ? message.sassLevel
            : 'girlfriend';
        const languageMode: LanguageMode =
          message.languageMode && ALLOWED_LANGUAGES.has(message.languageMode)
            ? message.languageMode
            : 'bilingual';
        const userPetName =
          typeof message.userPetName === 'string'
            ? message.userPetName.slice(0, 40)
            : 'Jaan';
        const customPersonalityNote =
          typeof message.customPersonalityNote === 'string'
            ? message.customPersonalityNote.slice(0, 600)
            : '';
        const memoryContext =
          typeof message.memoryContext === 'string'
            ? message.memoryContext.slice(0, 3500)
            : '';
        const healthContext =
          typeof message.healthContext === 'string'
            ? message.healthContext.slice(0, 1200)
            : '';
        const appsContext =
          typeof message.appsContext === 'string'
            ? message.appsContext.slice(0, 2000)
            : '';
        const locationsContext =
          typeof message.locationsContext === 'string'
            ? message.locationsContext.slice(0, 1500)
            : '';

        manager = new GeminiLiveManager(apiKey, model);

        try {
          await manager.connect(
            {
              voice,
              sassLevel,
              languageMode,
              userPetName,
              customPersonalityNote,
              memoryContext,
              healthContext,
              appsContext,
              locationsContext,
            },
            {
              onAudioChunk: (audio) => {
                sendToClient(clientWs, { type: 'audio', audio });
              },
              onInterrupted: () => {
                sendToClient(clientWs, { type: 'interrupted' });
              },
              onTurnComplete: () => {
                sendToClient(clientWs, { type: 'turnComplete' });
              },
              onInputTranscript: (text) => {
                sendToClient(clientWs, { type: 'inputTranscript', text });
              },
              onOutputTranscript: (text) => {
                sendToClient(clientWs, { type: 'outputTranscript', text });
              },
              onToolCall: (toolCall) => {
                sendToClient(clientWs, { type: 'toolCall', toolCall });
              },
              onClose: (reason) => {
                sendToClient(clientWs, { type: 'closed', reason });
                manager = null;
              },
              onError: (err) => {
                sendToClient(clientWs, {
                  type: 'error',
                  message: formatErrorMessage(err),
                });
              },
            }
          );

          isStarting = false;
          sendToClient(clientWs, {
            type: 'ready',
            model,
            voice,
            sassLevel,
            languageMode,
          });
        } catch (err) {
          isStarting = false;
          cleanup();
          sendToClient(clientWs, {
            type: 'error',
            message: formatErrorMessage(err),
          });
        }
        return;
      }

      if (message.type === 'audio' && manager) {
        manager.sendRealtimeAudio(message.audio);
        return;
      }

      if (message.type === 'text' && manager) {
        const trimmed = message.text.trim();
        if (trimmed) {
          manager.sendText(trimmed);
        }
        return;
      }

      if (message.type === 'toolResult' && manager) {
        manager.sendToolResponse(message.id, message.name, message.result);
        return;
      }

      if (message.type === 'stop') {
        cleanup();
        sendToClient(clientWs, { type: 'closed', reason: 'user_stopped' });
      }
    });

    clientWs.on('close', cleanup);
    clientWs.on('error', cleanup);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`[Swati] Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
