import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  GitFork,
  Microscope,
  Network,
  Workflow,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gitConfig } from '@/lib/shared';

const features = [
  {
    icon: Network,
    title: 'The middleman',
    description:
      'A central datahub that sits between you and your analysis tools, brokering data and compute across your lab.',
  },
  {
    icon: Workflow,
    title: 'Visual workflows',
    description:
      'Compose nodes into reactive pipelines and orchestrate complex analysis without writing glue code.',
  },
  {
    icon: Microscope,
    title: 'Built for microscopy',
    description:
      'First-class support for bioimage data, metadata and the formats your instruments already produce.',
  },
  {
    icon: Boxes,
    title: 'Apps, not scripts',
    description:
      'Package tools as installable apps that anyone in your group can discover, run and share.',
  },
];

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-fd-primary/20 opacity-60 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[28rem] w-[28rem] rounded-full bg-fd-primary/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.25] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-fd-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-fd-border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* hero */}
      <section className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-3 py-1 text-xs font-medium text-fd-muted-foreground backdrop-blur">
            <Zap className="size-3.5 text-fd-primary" />
            Open-source bioimage analysis platform
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Streaming analysis
            <br />
            for{' '}
            <span className="bg-gradient-to-r from-fd-primary to-fd-primary/50 bg-clip-text text-transparent">
              microscopy
            </span>
          </h1>

          <p className="mt-6 max-w-md text-lg text-fd-muted-foreground">
            Arkitekt is the middleman between your data, your tools and your
            team — a datahub that turns scattered scripts into shareable,
            reactive analysis apps.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg">
              <Link href="/docs/introduction/installation" className="text-white">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/docs">Read the docs</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a
                href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <GitFork className="size-4" />
                GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* illustration */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-fd-primary/10 blur-3xl" />
          <img
            src="/img/middleman.svg"
            alt="Arkitekt acts as a middleman between users, tools and data"
            className="w-full max-w-xl drop-shadow-2xl"
          />
        </div>
      </section>

      {/* features */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-fd-border bg-fd-card/50 p-6 backdrop-blur transition-colors hover:border-fd-primary/50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* closing CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-fd-border bg-fd-card/50 px-8 py-12 text-center backdrop-blur">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to build better bioimage apps?
          </h2>
          <p className="max-w-xl text-fd-muted-foreground">
            Install the platform, walk through the tutorial, and connect your
            first tool in minutes.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/docs/introduction/first_steps" className="text-white">
              Start the tutorial
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
