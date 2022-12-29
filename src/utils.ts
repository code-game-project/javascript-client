/**
 * Removes the protocol and trailing forward slash from the URL.
 * @param url The URL to trim.
 * @returns trimmed URL.
 */
export function trimURL(url: string) {
  url = url.replace(/.*\:\/\//, '');
  if (url.slice(-1) === '/') url = url.slice(0, -1);
  return url;
}
