/**
 * YouTube Video Transcript Extraction (Reliable)
 *
 * Strategy 1: Captions via `youtube-transcript` package (fast, free if captions exist)
 * Strategy 2: Whisper fallback via external Railway worker (yt-dlp + Whisper) (reliable)
 *
 * Notes:
 * - This file runs server-side (Node runtime).
 * - Whisper fallback requires env var: YOUTUBE_WHISPER_WORKER_URL
 *   Example: https://youtube-whisper-worker-production.up.railway.app
 */

import { YoutubeTranscript } from "youtube-transcript";

/**
 * Optional debug toggles (string "1" to enable)
 * - YT_FORCE_CAPTIONS_ONLY=1  -> only run Strategy 1
 * - YT_FORCE_WHISPER_ONLY=1   -> only run Strategy 2
 */
function envFlag(name: string): boolean {
  return (process.env[name] || "").trim() === "1";
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

/**
 * Normalize YouTube URL - remove incomplete parameters and clean up
 */
export function normalizeYouTubeUrl(url: string): string {
  try {
    let normalized = url.trim();

    // Remove trailing incomplete parameters like &t= (with no value)
    normalized = normalized.replace(/[&?]t=\s*$/i, "");

    // If it's a valid URL, return as-is
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _urlObj = new URL(normalized);
      return normalized;
    } catch {
      // If URL parsing fails, try regex extraction to get video ID
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      ];

      for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match && match[1]) {
          return `https://www.youtube.com/watch?v=${match[1]}`;
        }
      }

      return normalized;
    }
  } catch (error) {
    console.error("[YouTube Transcript] Error normalizing YouTube URL:", error);
    return url;
  }
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const normalized = normalizeYouTubeUrl(url);
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) return match[1];
    }

    return null;
  } catch (error) {
    console.error("[YouTube Transcript] Error extracting YouTube video ID:", error);
    return null;
  }
}

/**
 * Strategy 1: captions via `youtube-transcript`
 */
async function fetchTranscriptViaYoutubeTranscript(
  videoUrl: string,
  onProgress?: (message: string) => void
): Promise<string | null> {
  try {
    onProgress?.("Fetching captions from YouTube (Strategy 1)...");
    console.log("[YouTube Transcript] Using youtube-transcript for:", videoUrl);

    const segments = await YoutubeTranscript.fetchTranscript(videoUrl);

    if (!Array.isArray(segments) || segments.length === 0) {
      console.log("[YouTube Transcript] youtube-transcript returned no segments");
      return null;
    }

    const text = segments
      .map((s: any) => (typeof s?.text === "string" ? s.text : ""))
      .map((t: string) => t.trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!text || text.length < 10) {
      console.log("[YouTube Transcript] youtube-transcript transcript too short/empty");
      return null;
    }

    console.log("[YouTube Transcript] youtube-transcript success, length:", text.length);
    return text;
  } catch (error: any) {
    console.warn("[YouTube Transcript] youtube-transcript failed:", error?.message || String(error));
    return null;
  }
}

/**
 * Strategy 2: Whisper fallback via Railway worker
 *
 * IMPORTANT:
 * - Your Python worker expects JSON: { "videoUrl": "<full youtube url>" }
 *   NOT { "videoId": "..." }
 */
async function fetchTranscriptViaWhisperWorker(
  videoUrl: string,
  onProgress?: (message: string) => void
): Promise<string | null> {
  try {
    const workerUrl = (process.env.YOUTUBE_WHISPER_WORKER_URL || "").trim();
    if (!workerUrl) {
      console.error("[YouTube Transcript] YOUTUBE_WHISPER_WORKER_URL is not configured");
      return null;
    }

    onProgress?.("Captions not available — using Whisper fallback (Strategy 2)...");
    console.log("[YouTube Transcript] Using Whisper worker:", workerUrl);

    const endpoint = `${workerUrl.replace(/\/+$/, "")}/transcribe`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoUrl }), // <-- correct payload for your Python worker
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log("[YouTube Transcript] Whisper worker response not ok:", res.status, res.statusText, body);
      return null;
    }

    const data: any = await res.json().catch(() => null);
    const transcript = typeof data?.transcript === "string" ? data.transcript.trim() : "";

    if (!transcript || transcript.length < 10) {
      console.log("[YouTube Transcript] Whisper worker returned empty/too short transcript");
      return null;
    }

    console.log("[YouTube Transcript] Whisper worker success, length:", transcript.length);
    return transcript;
  } catch (error: any) {
    console.error("[YouTube Transcript] Whisper worker error:", error?.message || String(error));
    return null;
  }
}

/**
 * Main: try captions first, then Whisper worker (unless forced)
 */
async function fetchYouTubeTranscript(
  videoUrl: string,
  onProgress?: (message: string) => void
): Promise<string | null> {
  const FORCE_CAPTIONS_ONLY = envFlag("YT_FORCE_CAPTIONS_ONLY");
  const FORCE_WHISPER_ONLY = envFlag("YT_FORCE_WHISPER_ONLY");

  console.log("[YouTube Transcript] Starting fetch for:", videoUrl, {
    FORCE_CAPTIONS_ONLY,
    FORCE_WHISPER_ONLY,
  });

  if (FORCE_CAPTIONS_ONLY) {
    onProgress?.("[YT TEST] Strategy 1 ONLY (captions)");
    return await fetchTranscriptViaYoutubeTranscript(videoUrl, onProgress);
  }

  if (FORCE_WHISPER_ONLY) {
    onProgress?.("[YT TEST] Strategy 2 ONLY (whisper worker)");
    return await fetchTranscriptViaWhisperWorker(videoUrl, onProgress);
  }

  // Strategy 1: captions
  const captions = await fetchTranscriptViaYoutubeTranscript(videoUrl, onProgress);
  if (captions) return captions;

  // Strategy 2: Whisper fallback (worker)
  const whisper = await fetchTranscriptViaWhisperWorker(videoUrl, onProgress);
  if (whisper) return whisper;

  console.log("[YouTube Transcript] All strategies failed - transcript not available");
  return null;
}

/**
 * Public API used by your app
 */
export async function transcribeYouTubeVideo(
  videoUrl: string,
  onProgress?: (message: string) => void
): Promise<string> {
  console.log("[YT PIPELINE] ✅ Using lib/youtube-transcript.ts (captions + railway fallback)");
  console.log("[YT PIPELINE] Worker URL =", process.env.YOUTUBE_WHISPER_WORKER_URL || "(missing)");

  const normalizedUrl = normalizeYouTubeUrl(videoUrl);

  const videoId = extractYouTubeVideoId(normalizedUrl);
  if (!videoId) throw new Error("Invalid YouTube URL. Could not extract video ID.");

  console.log("[YouTube Transcript] Processing video:", {
    originalUrl: videoUrl,
    normalizedUrl,
    videoId,
  });

  onProgress?.("Checking for available transcript...");
  const transcript = await fetchYouTubeTranscript(normalizedUrl, onProgress);

  if (transcript && transcript.length > 0) return transcript;

  throw new Error(
    "Transcript is not available for this video. " +
      "Captions may be disabled, or YouTube blocked transcript requests. " +
      "If Whisper fallback is not configured, set YOUTUBE_WHISPER_WORKER_URL."
  );
}
