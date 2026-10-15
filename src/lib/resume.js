// Where the résumé link points and whether it opens in the popup viewer.
// An uploaded PDF is served by /files/resume.pdf; a plain same-site .pdf link also uses the popup.
export const RESUME_PATH = '/files/resume.pdf';

export function resumeLink(profile) {
  if (profile.resumeFile) return { href: RESUME_PATH, download: `${RESUME_PATH}?download=1`, viewer: true };
  const href = profile.resume || '';
  if (!href) return null;
  const local = href.startsWith('/') && !href.startsWith('//') && /\.pdf(\?|#|$)/i.test(href);
  return { href, download: href, viewer: local };
}
