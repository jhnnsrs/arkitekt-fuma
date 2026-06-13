import type { Metadata } from 'next';
import { Explorer } from '@/components/explorer-client';
import { appName } from '@/lib/shared';

export const metadata: Metadata = {
  title: 'API Explorer',
  description: `Interactively explore and query the GraphQL APIs of your ${appName} instance.`,
};

export default function ExplorerPage() {
  // Fill the viewport below the (sticky, h-14) home navbar.
  return (
    <main className="h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      <Explorer />
    </main>
  );
}
