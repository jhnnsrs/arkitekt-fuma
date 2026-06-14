import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Terminal } from '@/components/docs/terminal';
import { BentoCard, BentoGrid, ScreenshotSlot } from './primitives';
import { AsyncApiCard } from './async-api-card';
import { ProvenanceCard } from './provenance-card';

/** The main home-page bento grid. */
export function HomeBento() {
  return (
    <section className="w-full pb-16">
      <BentoGrid>
        {/* (async) API — everything is a controllable, progress-yielding task */}
        <AsyncApiCard />

        {/* wide media — the Orkestrator managing microscopy data */}
        <BentoCard className="p-2 sm:col-span-2">
          <ScreenshotSlot
            src="/img/image.png"
            alt="The Orkestrator app managing uploaded microscopy data"
            className="min-h-52 sm:min-h-60"
            imgClassName="rounded-2xl"
          />
        </BentoCard>

        {/* facilities statement + showcase CTA */}
        <BentoCard className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Used in imaging facilities.
            </h2>
            <p className="mt-3 max-w-md text-sm text-fd-muted-foreground">
              Imaging facilities and research groups use Arkitekt to broker data
              and compute across the tools they already run.
            </p>
          </div>
          <Button asChild className="w-fit rounded-full">
            <Link href="/showcase">
              Showcase
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </BentoCard>

        {/* product screenshot */}
        <BentoCard glow>
          <div className="h-full overflow-hidden rounded-2xl bg-[#0a0a0c] p-2">
            <ScreenshotSlot
              src="/docs/core.png"
              alt="The Arkitekt platform interface"
              className="h-full min-h-52"
              imgClassName="h-full rounded-xl object-cover"
            />
          </div>
        </BentoCard>

        {/* provenance — everything is audited & recorded */}
        <ProvenanceCard />

        {/* customizability copy + install CTA */}
        <BentoCard className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Composable from top to bottom.
            </h2>
            <p className="mt-3 max-w-md text-sm text-fd-muted-foreground">
              Open-source and modular — swap the pieces you need and connect the
              tools you already use. Spin up the whole platform with a single
              command.
            </p>
          </div>
          <Button asChild className="w-fit rounded-full">
            <Link href="/docs/introduction/installation">
              Install Arkitekt
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </BentoCard>

        {/* live install recording */}
        <BentoCard className="flex items-center justify-center p-4 sm:col-span-2 sm:p-6">
          <Terminal src="/casts/arkitekt-init.cast" autoPlay loop speed={1.5} />
        </BentoCard>
      </BentoGrid>
    </section>
  );
}
