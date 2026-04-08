import type { ExerciseLink } from '@/types/session';

export interface ExternalBookmarkPreview {
  href: string;
  title: string;
  subtitle?: string;
  hostname: string;
  thumbnailUrl?: string;
  providerLabel: string;
}

/** Returns a safe https URL string, or null if invalid or empty. */
export function normalizeExternalUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null;
    }
    return u.href;
  } catch {
    return null;
  }
}

/** YouTube video id from common URL shapes, or null. */
export function youtubeVideoIdFromUrl(href: string): string | null {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id && /^[a-zA-Z0-9_-]{6,32}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{6,32}$/.test(v)) {
        return v;
      }
      const shorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{6,32})/);
      if (shorts) {
        return shorts[1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** OS-specific deep link to prefer the YouTube app on phones; null if not applicable. */
export function youtubeAppLaunchUrl(videoId: string): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return `youtube://watch?v=${videoId}`;
  }
  if (/Android/i.test(ua)) {
    return `vnd.youtube:${videoId}`;
  }
  return null;
}

export function externalLinkDisplayLabel(link: ExerciseLink, resolvedHref: string): string {
  const fromLabel = link.label?.trim();
  if (fromLabel) {
    return fromLabel;
  }
  try {
    return new URL(resolvedHref).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function fallbackBookmarkPreview(link: ExerciseLink, href: string): ExternalBookmarkPreview {
  const videoId = youtubeVideoIdFromUrl(href);
  const hostname = externalLinkDisplayLabel({ ...link, label: undefined }, href);
  return {
    href,
    title: externalLinkDisplayLabel(link, href),
    subtitle: videoId ? 'YouTube video' : undefined,
    hostname,
    thumbnailUrl: videoId ? youtubeThumbnailUrl(videoId) : undefined,
    providerLabel: videoId ? 'YouTube' : hostname
  };
}

export async function fetchExternalBookmarkPreview(link: ExerciseLink): Promise<ExternalBookmarkPreview | null> {
  const href = normalizeExternalUrl(link.url);
  if (!href) {
    return null;
  }

  const videoId = youtubeVideoIdFromUrl(href);
  if (!videoId) {
    return fallbackBookmarkPreview(link, href);
  }

  const fallback = fallbackBookmarkPreview(link, href);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(href)}&format=json`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(2500)
      }
    );

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as {
      title?: string;
      author_name?: string;
      provider_name?: string;
      thumbnail_url?: string;
    };

    return {
      href,
      title: payload.title?.trim() || link.label?.trim() || fallback.title,
      subtitle: payload.author_name?.trim() || fallback.subtitle,
      hostname: fallback.hostname,
      thumbnailUrl: payload.thumbnail_url?.trim() || fallback.thumbnailUrl,
      providerLabel: payload.provider_name?.trim() || fallback.providerLabel
    };
  } catch {
    return fallback;
  }
}
