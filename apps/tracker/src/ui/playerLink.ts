/**
 * The address players open to join a session. It is resolved against the page the DM is on, so it
 * stays correct wherever the tracker is hosted (at the site root, or under a sub-path like /tracker/).
 */
export function playerLink(code: string, currentUrl: string = location.href): string {
  const url = new URL('play.html', currentUrl);
  url.searchParams.set('code', code);
  return url.toString();
}
