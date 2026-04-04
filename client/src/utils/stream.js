const VALID_STREAM_PREFIXES = [
  'https://youtube.com',
  'https://youtu.be',
  'https://www.youtube.com',
  'https://twitch.tv',
  'https://www.twitch.tv',
  'https://fb.gg',
  'https://www.facebook.com/gaming',
];

function parseUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

function isFacebookStreamUrl(parsed) {
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === 'fb.gg' || host.endsWith('.fb.gg')) return true;
  if (host.endsWith('facebook.com') && path.startsWith('/gaming')) return true;
  return false;
}

function isYoutubeHost(host) {
  return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
}

/**
 * Converts a watch URL to an embeddable iframe URL.
 * @param {string} url
 * @returns {string|null}
 */
export function convertToEmbedUrl(url) {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  if (isFacebookStreamUrl(parsed)) return null;

  const host = parsed.hostname.toLowerCase();

  if (isYoutubeHost(host)) {
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    const path = parsed.pathname;
    if (path === '/watch' || path.startsWith('/watch/')) {
      const v = parsed.searchParams.get('v');
      if (!v) return null;
      return `https://www.youtube.com/embed/${v}`;
    }

    if (path.startsWith('/live/')) {
      const id = path.slice('/live/'.length).split('/')[0];
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    return null;
  }

  if (host === 'twitch.tv' || host === 'www.twitch.tv') {
    const channel = parsed.pathname.split('/').filter(Boolean)[0];
    if (!channel) return null;
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=localhost`;
  }

  return null;
}

/**
 * @param {string} url
 * @returns {'youtube' | 'twitch' | 'facebook' | 'unknown'}
 */
export function detectPlatform(url) {
  const parsed = parseUrl(url);
  if (!parsed) return 'unknown';

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (host === 'fb.gg' || host.endsWith('.fb.gg')) return 'facebook';
  if (host.endsWith('facebook.com') && path.startsWith('/gaming')) return 'facebook';

  if (isYoutubeHost(host)) return 'youtube';

  if (host === 'twitch.tv' || host === 'www.twitch.tv') return 'twitch';

  return 'unknown';
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isValidStreamUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  return VALID_STREAM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
