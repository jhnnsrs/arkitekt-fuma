import type { Metadata } from 'next';
import { Atom, Heart } from 'lucide-react';
import { SectionBackground } from '@/components/marketing';
import { appName } from '@/lib/shared';

export const metadata: Metadata = {
  title: 'Shoulders of Giants',
  description: `The open-source projects that ${appName} is built on and grateful for.`,
};

type Giant = {
  name: string;
  href: string;
  description: string;
};

const giants: Giant[] = [
  {
    name: 'Zarr',
    href: 'https://zarr.dev',
    description:
      'Chunked, compressed, N-dimensional arrays — the storage backbone for streaming bioimage data.',
  },
  {
    name: 'Dask',
    href: 'https://www.dask.org',
    description:
      'Parallel computing in Python that lets analysis scale from a laptop to a cluster without a rewrite.',
  },
  {
    name: 'Apache Arrow',
    href: 'https://arrow.apache.org',
    description:
      'A language-agnostic columnar memory format for moving structured data between tools efficiently.',
  },
  {
    name: 'Strawberry GraphQL',
    href: 'https://strawberry.rocks',
    description:
      'A type-first GraphQL library that powers the real-time API at the heart of the datahub.',
  },
  {
    name: 'Django',
    href: 'https://www.djangoproject.com',
    description:
      'The batteries-included web framework underpinning the platform services and data model.',
  },
  {
    name: 'React',
    href: 'https://react.dev',
    description:
      'The component model behind the reactive, composable interfaces our users build on every day.',
  },
  {
    name: 'Next.js',
    href: 'https://nextjs.org',
    description:
      'The application framework that renders these docs and the apps surrounding the platform.',
  },
  {
    name: 'OME-NGFF',
    href: 'https://ngff.openmicroscopy.org',
    description:
      'The next-generation file format community standard for cloud-native bioimaging.',
  },
  {
    name: 'Fumadocs',
    href: 'https://fumadocs.dev',
    description:
      'The documentation framework powering the site you are reading right now.',
  },
];

export default function GiantsPage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <SectionBackground />

      <section className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-3 py-1 text-xs font-medium text-fd-muted-foreground backdrop-blur">
            <Atom className="size-3.5 text-fd-primary" />
            With gratitude
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Shoulders of Giants
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-fd-muted-foreground">
            &ldquo;If I have seen further it is by standing on the shoulders of
            giants.&rdquo; Arkitekt would not exist without the open-source
            projects and communities below — thank you.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {giants.map((giant) => (
            <a
              key={giant.name}
              href={giant.href}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative flex flex-col gap-2 rounded-xl border border-fd-border bg-fd-card/50 p-6 backdrop-blur transition-colors hover:border-fd-primary/50"
            >
              <h2 className="font-semibold tracking-tight transition-colors group-hover:text-fd-primary">
                {giant.name}
              </h2>
              <p className="text-sm text-fd-muted-foreground">
                {giant.description}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-fd-border bg-fd-card/50 px-8 py-12 text-center backdrop-blur">
          <Heart className="size-6 text-fd-primary" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built on open source
          </h2>
          <p className="max-w-xl text-fd-muted-foreground">
            We give back wherever we can. If you maintain a project we rely on
            and we&apos;ve missed you here, let us know — we&apos;d be glad to add
            you.
          </p>
        </div>
      </section>
    </main>
  );
}
