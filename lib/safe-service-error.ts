/** Avoid surfacing HTML error pages (e.g. wrong Supabase URL) as user-facing validation text. */
export function safeServiceErrorMessage(message: string | undefined | null): string {
  const m = message?.trim() ?? '';
  if (!m) {
    return '';
  }
  if (m.startsWith('<!DOCTYPE') || m.includes('</html>') || m.length > 800) {
    return (
      'Could not reach Supabase. Set NEXT_PUBLIC_SUPABASE_URL to your project API URL ' +
      '(https://YOUR_PROJECT_REF.supabase.co from Project Settings -> API), not a supabase.com/dashboard link.'
    );
  }
  return m;
}
