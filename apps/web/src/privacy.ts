import type { ProviderName } from '@platform2e/analytics';

const PROVIDER_LABEL: Record<ProviderName, string> = { plausible: 'Plausible', umami: 'Umami' };

/** The privacy note for the launcher. It describes what this build actually does with analytics. */
export function privacyNote(provider: ProviderName | null): string {
  const counting = provider
    ? `Visits and tool use are counted with ${PROVIDER_LABEL[provider]}, which records which pages and tools get used. ` +
      `It does not record names${provider === 'umami' ? ', session codes' : ''} or anything you type, ` +
      'and it respects Do Not Track and Global Privacy Control. '
    : 'This site does not count visits or tool use. ';
  return (
    counting +
    'Your characters, dungeons and encounters stay in your browser. Online tracker sessions are the exception: ' +
    "what the DM shares with players, such as names and initiative, goes to a server so everyone's devices can follow along."
  );
}
