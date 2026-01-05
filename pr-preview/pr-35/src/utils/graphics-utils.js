
/**
 * Cache-busting utility for asset URLs.
 * Appends a timestamp to the URL query string to prevent stale cache.
 * @param {string} u - The URL to cache-bust.
 * @returns {string} - The URL with the cb query parameter.
 */
export const cb = (u) => {
    if (typeof u !== 'string') return u;
    if (u.startsWith('http')) return u;
    const separator = u.includes('?') ? '&' : '?';
    return `${u}${separator}cb=${Date.now()}`;
};
