import { GoogleGenAI } from '@google/genai';
import type {
  GroundedAnswer,
  NewsHeadline,
  WeatherReport,
} from '../types/live.ts';

const WMO_WEATHER_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

async function fetchWttrWeather(city: string): Promise<WeatherReport> {
  const res = await fetch(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
    { signal: AbortSignal.timeout(6000) }
  );
  if (!res.ok) {
    throw new Error(`Weather service returned ${res.status}`);
  }
  const data = (await res.json()) as {
    current_condition?: Array<{
      temp_C: string;
      FeelsLikeC: string;
      humidity: string;
      windspeedKmph: string;
      weatherDesc?: Array<{ value: string }>;
    }>;
    nearest_area?: Array<{
      areaName?: Array<{ value: string }>;
      country?: Array<{ value: string }>;
    }>;
  };
  const cur = data.current_condition?.[0];
  if (!cur) {
    throw new Error(`No weather data found for "${city}".`);
  }
  const area = data.nearest_area?.[0];
  return {
    city: area?.areaName?.[0]?.value || city,
    country: area?.country?.[0]?.value || '',
    temperatureC: Math.round(Number(cur.temp_C)),
    feelsLikeC: Math.round(Number(cur.FeelsLikeC)),
    humidity: Math.round(Number(cur.humidity)),
    windKmh: Math.round(Number(cur.windspeedKmph)),
    condition: cur.weatherDesc?.[0]?.value || 'Clear',
    fetchedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

export async function fetchLiveWeather(city: string): Promise<WeatherReport> {
  const cleanCity = city.trim() || 'New Delhi';
  try {
    return await fetchWttrWeather(cleanCity);
  } catch {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cleanCity
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(6000) });
    if (!geoRes.ok) {
      throw new Error(`Weather geocoding failed (${geoRes.status})`);
    }
    const geoData = (await geoRes.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
      }>;
    };
    const place = geoData.results?.[0];
    if (!place) {
      throw new Error(`Could not find location "${cleanCity}".`);
    }

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
    const forecastRes = await fetch(forecastUrl, {
      signal: AbortSignal.timeout(6000),
    });
    if (!forecastRes.ok) {
      throw new Error(`Weather forecast failed (${forecastRes.status})`);
    }
    const forecast = (await forecastRes.json()) as {
      current?: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
      };
    };
    const cur = forecast.current;
    if (!cur) {
      throw new Error('Weather data unavailable for this location.');
    }

    return {
      city: place.name,
      country: place.country ?? '',
      temperatureC: Math.round(cur.temperature_2m),
      feelsLikeC: Math.round(cur.apparent_temperature),
      humidity: Math.round(cur.relative_humidity_2m),
      windKmh: Math.round(cur.wind_speed_10m),
      condition: WMO_WEATHER_LABELS[cur.weather_code] ?? 'Variable conditions',
      fetchedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
  }
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function fetchLiveNews(
  topic: string = '',
  language: 'hi' | 'en' = 'hi'
): Promise<NewsHeadline[]> {
  const hl = language === 'hi' ? 'hi' : 'en-IN';
  const ceid = language === 'hi' ? 'IN:hi' : 'IN:en';
  const cleanTopic = topic.trim();
  const rssUrl = cleanTopic
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(
        cleanTopic
      )}&hl=${hl}&gl=IN&ceid=${ceid}`
    : `https://news.google.com/rss?hl=${hl}&gl=IN&ceid=${ceid}`;

  const res = await fetch(rssUrl, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) {
    throw new Error(`News feed unavailable (${res.status})`);
  }
  const xml = await res.text();
  const items: NewsHeadline[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    if (items.length >= 6) break;
    const block = match[1];
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

    const rawTitle = decodeXmlEntities(titleMatch?.[1] ?? '');
    const link = decodeXmlEntities(linkMatch?.[1] ?? '');
    const source = decodeXmlEntities(sourceMatch?.[1] ?? 'Google News');
    const publishedAt = decodeXmlEntities(pubMatch?.[1] ?? '');

    if (rawTitle && link) {
      items.push({
        title: rawTitle,
        link,
        source,
        publishedAt,
      });
    }
  }

  return items;
}

export async function runGroundedWebSearch(
  question: string,
  apiKey: string
): Promise<GroundedAnswer> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastErr: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: question,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'Provide a concise, accurate, conversational answer grounded in current search results. Match Hindi/English if the question is in Hindi.',
        },
      });

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: Array<{ title: string; uri: string }> = [];
      for (const chunk of chunks) {
        const web = (chunk as { web?: { title?: string; uri?: string } }).web;
        if (web?.uri) {
          sources.push({
            title: web.title || web.uri,
            uri: web.uri,
          });
        }
      }

      return {
        id: `search_${Date.now()}`,
        question,
        answer: (response.text ?? 'No clear search result found.').trim(),
        sources: sources.slice(0, 4),
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      };
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr ?? new Error('Web search request failed.');
}

function isDisallowedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return true;
  }
  if (/^169\.254\./.test(host)) return true;
  const m172 = host.match(/^172\.(\d+)\./);
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) {
    return true;
  }
  return false;
}

export function fixWebsiteUrlServer(rawInput: string): string {
  let cleaned = rawInput.trim().replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('Website URL is required.');
  }
  cleaned = cleaned
    .replace(/^htps:\/\//i, 'https://')
    .replace(/^htp:\/\//i, 'http://')
    .replace(/^https\/\//i, 'https://')
    .replace(/^http\/\//i, 'http://')
    .replace(/^www\./i, 'https://www.');

  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error(`Invalid website address: "${rawInput}"`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// websites are supported.');
  }
  if (isDisallowedHostname(parsed.hostname)) {
    throw new Error('Private or loopback addresses cannot be inspected.');
  }
  return parsed.toString();
}

export async function inspectAndWorkWebsite(rawUrl: string): Promise<{
  fixedUrl: string;
  status: number;
  title: string;
  description: string;
  textPreview: string;
  links: Array<{ text: string; url: string }>;
  timestamp: string;
}> {
  const fixedUrl = fixWebsiteUrlServer(rawUrl);

  const res = await fetch(fixedUrl, {
    signal: AbortSignal.timeout(7000),
    headers: {
      'User-Agent': 'Swati-Assistant/1.0 (+https://ai.google.dev)',
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
  });

  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );

  const title = decodeXmlEntities(titleMatch?.[1] ?? fixedUrl);
  const description = decodeXmlEntities(descMatch?.[1] ?? '');

  // Extract clean readable links
  const links: Array<{ text: string; url: string }> = [];
  const linkMatches = html.matchAll(
    /<a\s+[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  );
  for (const m of linkMatches) {
    if (links.length >= 6) break;
    const href = m[1].trim();
    const label = decodeXmlEntities(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    if (!label || label.length < 2) continue;
    try {
      const resolved = new URL(href, res.url || fixedUrl).toString();
      if (/^https?:\/\//i.test(resolved)) {
        links.push({ text: label.slice(0, 60), url: resolved });
      }
    } catch {
      // ignore invalid relative link
    }
  }

  // Strip scripts, styles, and tags cleanly for plain-text summary
  const plainText = decodeXmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  ).slice(0, 900);

  return {
    fixedUrl: res.url || fixedUrl,
    status: res.status,
    title,
    description,
    textPreview: plainText,
    links,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

export async function dispatchAndroidBridge(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; responseText: string }> {
  const safeWebhook = fixWebsiteUrlServer(webhookUrl);
  const res = await fetch(safeWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(6000),
  });
  const responseText = (await res.text()).slice(0, 300);
  return { ok: res.ok, status: res.status, responseText };
}
