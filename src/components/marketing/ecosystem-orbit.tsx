'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Aperture,
  Bot,
  Box,
  ChevronLeft,
  ChevronRight,
  Eye,
  LineChart,
  Layers,
  Network,
  Pause,
  Play,
  Plus,
  Share2,
  Split,
  User,
  Workflow,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useInView } from './reveal';
import { Logo } from '@/components/site/logo';

/* Authored in a fixed coordinate space and scaled to fit. Two concentric
   circles share the centre: the inner server donut (core services, uncoloured)
   and the outer app ring (coloured). Actions enter from the left, where the
   external Control panel lives. Two looping "runs" light up the edges with a
   glowing flow to show how every task is brokered by the server. */
const BASE_W = 1120;
const BASE_H = 820;
const CX = 560;
const CY = 405;
const RI = 100;
const RO = 172;
const R_APP = 345;
// app arc leaves a wedge on the LEFT (≈230°–310°) for the actions-in arrow.
const APP_FROM = 310;
const APP_TO = 230 + 360;

const rad = (deg: number) => (deg * Math.PI) / 180;
const px = (r: number, deg: number) => CX + r * Math.sin(rad(deg));
const py = (r: number, deg: number) => CY - r * Math.cos(rad(deg));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Node = {
  label: string;
  sub: string;
  icon: typeof Network;
  href: string; // docs page this node links to
  tech?: string; // tool/runtime shown as a small badge (e.g. Docker, Jupyter)
  hue?: number;
  bidi?: boolean;
  placeholder?: boolean;
};

const services: Node[] = [
  { label: 'Rekuest', sub: 'actions', icon: Network, href: '/docs/design/services/rekuest' },
  { label: 'Mikro', sub: 'images', icon: Layers, href: '/docs/design/services/mikro' },
  { label: 'Kraph', sub: 'graph', icon: Share2, href: '/docs/design/services' },
  { label: 'Kabinet', sub: 'registry', icon: Box, href: '/docs/design/services/next/kabinet' },
  { label: 'Yours?', sub: 'add a service', icon: Plus, placeholder: true, href: '/docs/developers/contribute' },
];

// The AI Agent is one of the apps (just another caller of actions).
const apps: Node[] = [
  { label: 'Acquire', sub: 'Capture from the scope', tech: 'µManager', icon: Aperture, hue: 195, href: '/docs/apps/standalones/mikro-manager' },
  { label: 'Process', sub: 'Prepare & clean data', tech: 'Python', icon: Workflow, hue: 92, href: '/docs/developers/python' },
  { label: 'Segment', sub: 'Find the objects', tech: 'Docker', icon: Box, hue: 250, href: '/docs/apps/plugins/segmentor' },
  { label: 'Analyze', sub: 'Quantify results', tech: 'Jupyter', icon: LineChart, hue: 40, href: '/docs/developers/python/classical' },
  { label: 'Visualize', sub: 'Inspect & validate', tech: 'napari', icon: Eye, hue: 320, href: '/docs/apps/standalones/mikro-napari' },
  { label: 'React', sub: 'Edge automation', tech: 'Raspberry Pi', icon: Zap, hue: 150, bidi: true, href: '/docs/apps' },
  { label: 'AI Agent', sub: 'Plans & runs workflows', tech: 'LLM', icon: Bot, hue: 292, href: '/docs/apps' },
  { label: 'Your app', sub: 'Bring your own', icon: Plus, placeholder: true, href: '/docs/developers/python/plugin' },
];

const N = apps.length;
const appAngle = (i: number) => APP_FROM + (i * (APP_TO - APP_FROM)) / (N - 1);
const appPt = (i: number) => ({ x: px(R_APP, appAngle(i)), y: py(R_APP, appAngle(i)) });
const findApp = (label: string) => apps.findIndex((a) => a.label === label);

const serverEdge = (deg: number) => ({ x: px(RO + 6, deg), y: py(RO + 6, deg) });
const spokeOuter = (i: number) => ({ x: px(R_APP - 52, appAngle(i)), y: py(R_APP - 52, appAngle(i)) });
const ENTRY = { x: 132, y: CY };

// Action & data flows are keyed to the brand AND the theme: lightness/chroma
// come from `--orbit-flow-*` (which flip between light/dark), the hue from the
// brand — so flows rotate with `--brand-hue` and re-tune per theme.
const CTRL = 'oklch(var(--orbit-flow-l) var(--orbit-flow-c) var(--brand-hue))';
const AGENT = 'oklch(var(--orbit-flow-l) var(--orbit-flow-c) calc(var(--brand-hue) + 30))';
const DATA = 'oklch(var(--orbit-flow-l) var(--orbit-flow-c) calc(var(--brand-hue) + 150))';
const appColor = (i: number) => `oklch(var(--orbit-flow-l) 0.17 ${apps[i].hue})`;

// App/node card styling, driven by theme tokens (`--orbit-card-*`).
const cardStyle = (hue: number | string, isHot: boolean): CSSProperties => ({
  borderColor: isHot ? `oklch(var(--orbit-card-border-hot-l) 0.15 ${hue})` : `oklch(var(--orbit-card-border-l) 0.1 ${hue} / 0.55)`,
  backgroundImage: `linear-gradient(180deg, oklch(var(--orbit-card-l1) var(--orbit-card-c) ${hue}), oklch(var(--orbit-card-l2) var(--orbit-card-c) ${hue}))`,
  boxShadow: isHot
    ? `0 0 0 1.5px oklch(var(--orbit-card-border-hot-l) 0.15 ${hue}), 0 0 36px -8px oklch(0.6 0.2 ${hue} / 0.6)`
    : `0 10px 30px -18px oklch(0.55 0.15 ${hue} / 0.55)`,
  transform: isHot ? 'scale(1.06)' : 'scale(1)',
  transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
});
const iconBox = (hue: number | string): CSSProperties => ({
  borderColor: `oklch(var(--orbit-card-border-l) 0.11 ${hue} / 0.5)`,
  backgroundColor: `oklch(var(--orbit-card-iconbg-l) 0.08 ${hue} / 0.45)`,
});
const iconColor = (hue: number | string) => `oklch(var(--orbit-card-fg-l) 0.16 ${hue})`;

function wedge(a0: number, a1: number, ri: number, ro: number) {
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M${px(ro, a0)} ${py(ro, a0)}`,
    `A${ro} ${ro} 0 ${large} 1 ${px(ro, a1)} ${py(ro, a1)}`,
    `L${px(ri, a1)} ${py(ri, a1)}`,
    `A${ri} ${ri} 0 ${large} 0 ${px(ri, a0)} ${py(ri, a0)}`,
    'Z',
  ].join(' ');
}

// Selectable "user stories" — pick whose perspective to watch.
const STORIES = [
  { id: 'manual', title: 'I run it myself', blurb: 'Trigger an action from the UI.', icon: User },
  { id: 'agent', title: 'An AI agent runs it', blurb: 'An agent orchestrates the workflow.', icon: Bot },
  { id: 'parallel', title: 'Two tasks at once', blurb: 'Kick off parallel tasks in one go.', icon: Split },
  { id: 'reactive', title: 'The instrument reacts', blurb: 'A device streams data & steers acquisition.', icon: Zap },
] as const;
type StoryId = (typeof STORIES)[number]['id'];

type Pt = { x: number; y: number };
type Flow = { id: number; from: Pt; to: Pt; color: string; progress: number };

/* ─── Step graph ────────────────────────────────────────────────────────────
   Each story is a reproducible list of declarative Steps. A step describes the
   resting state (desc, highlights, bubbles) plus an optional enter animation
   (a glowing edge `edge` and/or an app progress bar `fill`). A player walks the
   list — auto-advancing or under user control. */
type Bubble = { label: string; text: string; progress: number };
type Edge = { from: Pt; to: Pt; color: string };
type Step = {
  title: string;
  desc: string;
  hot?: string[];
  bubbles?: Bubble[];
  edge?: Edge; // a single glowing flow…
  edges?: Edge[]; // …or several at once (parallel)
  fill?: string; // an app whose progress bar fills 0→1 during the enter phase…
  fills?: string[]; // …or several at once (parallel)
  user?: string; // a command the User node speaks during this step
  dur?: number; // enter-animation length (ms)
  hold?: number; // pause after settling before auto-advancing (ms)
};

// One brokered task: in → Rekuest routes → dispatch → work → upload → Mikro
// saves → finished. The service steps (Rekuest routing, Mikro saving) make the
// core's role explicit; "finished" deliberately comes after the save.
function brokerSteps(title: string, srcPt: Pt, srcDeg: number, t: number, inColor: string, descIn: string, descRun: string): Step[] {
  const label = apps[t].label;
  const ang = appAngle(t);
  return [
    { title, desc: descIn, hot: ['server'], edge: { from: srcPt, to: serverEdge(srcDeg), color: inColor }, dur: 540, hold: 220 },
    { title, desc: 'Rekuest routes the request to the right app.', hot: ['Rekuest', 'server'], hold: 650 },
    { title, desc: descRun, hot: [label], edge: { from: serverEdge(ang), to: spokeOuter(t), color: appColor(t) }, bubbles: [{ label, text: 'Action received — starting…', progress: 0 }], dur: 540, hold: 450 },
    { title, desc: `${label} is running…`, hot: [label], bubbles: [{ label, text: 'Running…', progress: 1 }], fill: label, dur: 1100, hold: 250 },
    { title, desc: `${label} uploads its results to the server…`, hot: [label, 'server'], edge: { from: spokeOuter(t), to: serverEdge(ang), color: DATA }, bubbles: [{ label, text: 'Uploading data…', progress: 1 }], dur: 600, hold: 250 },
    { title, desc: 'Mikro saves the results to the database.', hot: ['Mikro', 'server'], bubbles: [{ label, text: 'Saving…', progress: 1 }], hold: 650 },
    { title, desc: `Data stored — ${label} finished ✓`, hot: [label, 'Mikro', 'server'], bubbles: [{ label, text: 'Finished ✓ · stored', progress: 1 }], hold: 700 },
  ];
}

// Final beat of a user-driven story: the server hands the results back to the user.
function deliverStep(title: string): Step {
  return {
    title,
    desc: 'Your results are delivered straight back to you.',
    hot: ['server'],
    edge: { from: serverEdge(270), to: { x: ENTRY.x + 34, y: ENTRY.y }, color: DATA },
    user: 'here they are :)',
    dur: 620,
    hold: 1900,
  };
}

function manualSteps(): Step[] {
  const T = 'Run · user-driven';
  return [
    { title: T, desc: 'The user issues an action from the UI.', hot: [], user: 'do this task', hold: 1000 },
    ...brokerSteps(T, ENTRY, 270, findApp('Process'), CTRL, 'The action travels to the Arkitekt server.', 'The server dispatches it to the Process app.'),
    deliverStep(T),
  ];
}

function agentSteps(): Step[] {
  const T = 'Run · agent-driven';
  const ag = findApp('AI Agent');
  const agA = appAngle(ag);
  const targets = ['Acquire', 'Segment', 'Visualize'];
  const steps: Step[] = [
    { title: T, desc: 'The user instructs the AI agent to run a workflow.', hot: [], user: 'agent, run this workflow', hold: 1000 },
    { title: T, desc: 'The request is brokered by the server to the AI agent.', hot: ['server'], edge: { from: ENTRY, to: serverEdge(270), color: CTRL }, dur: 540, hold: 220 },
    { title: T, desc: 'The server hands the request to the agent.', hot: ['AI Agent'], edge: { from: serverEdge(agA), to: spokeOuter(ag), color: AGENT }, bubbles: [{ label: 'AI Agent', text: 'Request received', progress: 0 }], dur: 540, hold: 400 },
    { title: T, desc: 'The agent plans the workflow…', hot: ['AI Agent'], bubbles: [{ label: 'AI Agent', text: 'Planning the workflow…', progress: 1 }], fill: 'AI Agent', dur: 1100, hold: 300 },
    { title: T, desc: 'Plan ready — the agent calls each app via the server.', hot: ['AI Agent'], bubbles: [{ label: 'AI Agent', text: 'Plan ready ✓', progress: 1 }], hold: 600 },
  ];
  targets.forEach((label, k) => {
    const sub = brokerSteps(T, spokeOuter(ag), agA, findApp(label), AGENT, `The agent calls ${label} through the server.`, `${label} runs and returns its data.`);
    for (const s of sub) steps.push({ ...s, bubbles: [...(s.bubbles ?? []), { label: 'AI Agent', text: `Calling ${label}… (${k + 1}/${targets.length})`, progress: (k + 0.5) / targets.length }] });
    // the server reports the finished result back to the agent
    steps.push({
      title: T,
      desc: `${label} finished — the result is reported back to the agent.`,
      hot: ['AI Agent', 'server'],
      edge: { from: serverEdge(agA), to: spokeOuter(ag), color: AGENT },
      bubbles: [{ label: 'AI Agent', text: `${label} done ✓ (${k + 1}/${targets.length})`, progress: (k + 1) / targets.length }],
      dur: 480,
      hold: 350,
    });
  });
  steps.push({ title: T, desc: 'All steps reported back — workflow complete.', hot: ['AI Agent'], bubbles: [{ label: 'AI Agent', text: 'Workflow complete ✓', progress: 1 }], hold: 1000 });
  steps.push(deliverStep(T));
  return steps;
}

function reactiveSteps(): Step[] {
  const T = 'Run · reactive instrument';
  const rx = findApp('React');
  const acq = findApp('Acquire');
  return [
    { title: T, desc: 'A reactive device (Raspberry Pi) is streaming data.', hot: ['React'], bubbles: [{ label: 'React', text: 'Streaming data…', progress: 1 }], fill: 'React', dur: 1000, hold: 250 },
    { title: T, desc: 'The device uploads its data to the server.', hot: ['React', 'Mikro', 'server'], edge: { from: spokeOuter(rx), to: serverEdge(appAngle(rx)), color: DATA }, bubbles: [{ label: 'React', text: 'Uploading data…', progress: 1 }], dur: 600, hold: 250 },
    { title: T, desc: 'Data stored ✓ — the server reacts.', hot: ['Mikro', 'server'], bubbles: [{ label: 'React', text: 'Sent ✓', progress: 1 }], hold: 600 },
    { title: T, desc: 'The server triggers the next acquisition.', hot: ['Acquire'], edge: { from: serverEdge(appAngle(acq)), to: spokeOuter(acq), color: appColor(acq) }, bubbles: [{ label: 'Acquire', text: 'Action received — acquiring…', progress: 0 }], dur: 560, hold: 400 },
    { title: T, desc: 'The microscope acquires the next image…', hot: ['Acquire'], bubbles: [{ label: 'Acquire', text: 'Acquiring…', progress: 1 }], fill: 'Acquire', dur: 1100, hold: 300 },
    { title: T, desc: 'Captured ✓ — a closed loop steers the next experiment.', hot: ['Acquire'], bubbles: [{ label: 'Acquire', text: 'Captured ✓', progress: 1 }], hold: 1200 },
  ];
}

function parallelSteps(): Step[] {
  const T = 'Run · parallel';
  const a = findApp('Process');
  const b = findApp('Segment');
  const aA = appAngle(a);
  const bA = appAngle(b);
  const la = apps[a].label;
  const lb = apps[b].label;
  return [
    { title: T, desc: 'The user kicks off two tasks at once.', hot: [], user: 'do both, in parallel', hold: 1000 },
    { title: T, desc: 'Both actions travel to the server.', hot: ['server'], edge: { from: ENTRY, to: serverEdge(270), color: CTRL }, dur: 560, hold: 250 },
    {
      title: T,
      desc: 'The server dispatches both apps in parallel.',
      hot: [la, lb],
      edges: [
        { from: serverEdge(aA), to: spokeOuter(a), color: appColor(a) },
        { from: serverEdge(bA), to: spokeOuter(b), color: appColor(b) },
      ],
      bubbles: [
        { label: la, text: 'Action received…', progress: 0 },
        { label: lb, text: 'Action received…', progress: 0 },
      ],
      dur: 560,
      hold: 450,
    },
    {
      title: T,
      desc: 'Both apps run concurrently…',
      hot: [la, lb],
      bubbles: [
        { label: la, text: 'Running…', progress: 1 },
        { label: lb, text: 'Running…', progress: 1 },
      ],
      fills: [la, lb],
      dur: 1300,
      hold: 300,
    },
    {
      title: T,
      desc: 'Both upload their results to the server…',
      hot: [la, lb, 'server'],
      edges: [
        { from: spokeOuter(a), to: serverEdge(aA), color: DATA },
        { from: spokeOuter(b), to: serverEdge(bA), color: DATA },
      ],
      bubbles: [
        { label: la, text: 'Uploading data…', progress: 1 },
        { label: lb, text: 'Uploading data…', progress: 1 },
      ],
      dur: 620,
      hold: 300,
    },
    {
      title: T,
      desc: 'Mikro saves both results to the database.',
      hot: ['Mikro', 'server'],
      bubbles: [
        { label: la, text: 'Saving…', progress: 1 },
        { label: lb, text: 'Saving…', progress: 1 },
      ],
      hold: 650,
    },
    {
      title: T,
      desc: 'Both finished — data stored ✓',
      hot: [la, lb, 'Mikro', 'server'],
      bubbles: [
        { label: la, text: 'Finished ✓ · stored', progress: 1 },
        { label: lb, text: 'Finished ✓ · stored', progress: 1 },
      ],
      hold: 1000,
    },
    deliverStep(T),
  ];
}

function buildSteps(story: StoryId): Step[] {
  if (story === 'agent') return agentSteps();
  if (story === 'parallel') return parallelSteps();
  if (story === 'reactive') return reactiveSteps();
  return manualSteps();
}

export function EcosystemOrbit() {
  const { ref: revealRef, inView } = useInView<HTMLDivElement>(0.1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const [flows, setFlows] = useState<Flow[]>([]);
  const [hot, setHot] = useState<Set<string>>(new Set());
  const [desc, setDesc] = useState('Watch how a request flows through the platform.');
  const [runTitle, setRunTitle] = useState('');
  const [status, setStatus] = useState<Record<string, { text: string; progress: number }>>({});
  const [story, setStory] = useState<StoryId>('manual');
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const steps = useMemo(() => buildSteps(story), [story]);
  const log = Object.entries(status);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / BASE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // restart the graph at step 0 when the story changes — but keep the user's
  // play/pause choice (once paused into manual mode, stay there).
  useEffect(() => {
    setCur(0);
  }, [story]);

  // play the current step: run its enter animation, settle, then (if playing) advance
  useEffect(() => {
    if (!inView) return;
    const step = steps[cur];
    if (!step) return;
    let cancelled = false;
    const rafs = new Set<number>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const edges = [...(step.edge ? [step.edge] : []), ...(step.edges ?? [])];
    const fills = new Set([...(step.fill ? [step.fill] : []), ...(step.fills ?? [])]);

    const snapshot = (t: number) => {
      const m: Record<string, { text: string; progress: number }> = {};
      for (const b of step.bubbles ?? []) {
        m[b.label] = { text: b.text, progress: fills.has(b.label) ? t : b.progress };
      }
      return m;
    };

    setRunTitle(step.title);
    setDesc(step.desc);
    setHot(new Set(step.hot ?? []));
    setUserMsg(step.user ?? null);
    setStatus(snapshot(fills.size ? 0 : 1));
    setFlows([]);

    const dur = step.dur ?? 480;
    const enter = () =>
      new Promise<void>((resolve) => {
        if (!edges.length && !fills.size) return resolve();
        let start: number | null = null;
        const tick = (ts: number) => {
          if (cancelled) return resolve();
          if (start == null) start = ts;
          const p = Math.min(1, (ts - start) / dur);
          if (edges.length) setFlows(edges.map((e, i) => ({ id: i + 1, from: e.from, to: e.to, color: e.color, progress: p })));
          if (fills.size) setStatus(snapshot(p));
          if (p < 1) rafs.add(requestAnimationFrame(tick));
          else resolve();
        };
        rafs.add(requestAnimationFrame(tick));
      });

    (async () => {
      await enter();
      if (cancelled) return;
      setFlows([]);
      setStatus(snapshot(1));
      if (playing) {
        timer = setTimeout(() => setCur((c) => (c + 1) % steps.length), step.hold ?? 800);
      }
    })();

    return () => {
      cancelled = true;
      rafs.forEach(cancelAnimationFrame);
      if (timer) clearTimeout(timer);
    };
  }, [cur, steps, inView, playing]);

  const goTo = (i: number) => {
    setPlaying(false);
    setCur(((i % steps.length) + steps.length) % steps.length);
  };

  // ← / → step through the graph and stop live (auto-play) mode
  useEffect(() => {
    if (!inView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPlaying(false);
        setCur((c) => (c - 1 + steps.length) % steps.length);
      } else if (e.key === 'ArrowRight') {
        setPlaying(false);
        setCur((c) => (c + 1) % steps.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inView, steps.length]);

  return (
    <section className="w-full pb-16">
      <div
        ref={revealRef}
        className="relative isolate overflow-hidden rounded-3xl border border-fd-border bg-[var(--orbit-surface)] px-6 py-12 text-fd-foreground sm:px-10 lg:px-14"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[26%] h-[34rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--orbit-grid)_1px,transparent_0)] [background-size:36px_36px]" />
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] text-primary/80">APPS TO HELP YOU OUT</div>
            <h2 className="mt-3 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
              You control the workflow, Arkitekts orchestrates it.
            </h2>
          </div>
        </div>

        {/* control on the left (lg) or bottom (smaller) */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <ControlPanel
            desc={desc}
            runTitle={runTitle}
            story={story}
            onSelect={setStory}
            step={cur}
            total={steps.length}
            playing={playing}
            onPrev={() => goTo(cur - 1)}
            onNext={() => goTo(cur + 1)}
            onToggle={() => setPlaying((p) => !p)}
            className="order-2 lg:order-1 lg:w-[320px] lg:shrink-0"
          />

          <div className="order-1 w-full lg:order-2 lg:flex-1">
            <div ref={wrapRef} className="relative w-full" style={{ height: BASE_H * scale }}>
              <div className="absolute left-0 top-0 origin-top-left" style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})` }}>
                <Diagram inView={inView} flows={flows} hot={hot} status={status} userMsg={userMsg} desc={desc} compact={scale < 0.5} />
              </div>
            </div>

            {/* live log — part of the diagram, borderless */}
            <div className="mt-2 px-1 font-mono">
              <div className="text-[10px] tracking-[0.16em] text-primary/70">LIVE LOG</div>
              <div className="mt-1.5 flex min-h-[2.75rem] flex-col gap-1">
                {log.length === 0 ? (
                  <span className="text-[11px] text-fd-muted-foreground">Idle — waiting for the next step…</span>
                ) : (
                  log.map(([label, s]) => (
                    <div key={label} className="flex items-center gap-2 text-[11px]">
                      <span className="shrink-0 font-semibold text-fd-foreground">{label}</span>
                      <span className="truncate text-fd-muted-foreground">{s.text}</span>
                      <span className="ml-auto shrink-0 text-fd-muted-foreground">{Math.round(s.progress * 100)}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlPanel({
  desc,
  runTitle,
  story,
  onSelect,
  step,
  total,
  playing,
  onPrev,
  onNext,
  onToggle,
  className,
}: {
  desc: string;
  runTitle: string;
  story: StoryId;
  onSelect: (id: StoryId) => void;
  step: number;
  total: number;
  playing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="rounded-2xl border border-fd-border bg-fd-muted/30 p-6 sm:p-7">
        {/* TEMPORAL CONTROL — narration + stepper (above the story picker) */}
        <div className="min-h-[5rem]">
          <div className="font-mono text-[10px] tracking-[0.16em] text-primary/70">{runTitle || 'LIVE'}</div>
          <p key={desc} className="animate-pop-in mt-2.5 text-[15px] leading-relaxed text-fd-foreground/90">{desc}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onPrev} aria-label="Previous step" className="grid size-9 place-items-center rounded-lg border border-fd-border bg-fd-muted/30 text-fd-muted-foreground transition-colors hover:bg-fd-muted/60 hover:text-fd-foreground">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'} className="grid size-9 place-items-center rounded-lg border border-primary/40 bg-primary/15 text-primary transition-colors hover:bg-primary/25">
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button type="button" onClick={onNext} aria-label="Next step" className="grid size-9 place-items-center rounded-lg border border-fd-border bg-fd-muted/30 text-fd-muted-foreground transition-colors hover:bg-fd-muted/60 hover:text-fd-foreground">
            <ChevronRight className="size-4" />
          </button>
          <span className="ml-auto font-mono text-[11px] text-fd-muted-foreground">
            Step {step + 1} / {total}
          </span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-fd-border">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${total ? ((step + 1) / total) * 100 : 0}%` }} />
        </div>

        <div className="my-5 h-px bg-fd-border" />

        {/* STORY SELECTOR — below the temporal control */}
        <div className="font-mono text-[11px] tracking-[0.18em] text-primary/80">PICK A STORY</div>
        <div className="mt-3 flex flex-col gap-2">
          {STORIES.map((s) => {
            const active = story === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-fd-border bg-fd-muted/30 hover:border-fd-border hover:bg-fd-muted/60'
                }`}
              >
                <s.icon className={`mt-0.5 size-4 shrink-0 ${active ? 'text-primary' : 'text-fd-muted-foreground'}`} />
                <span>
                  <span className={`block text-[13px] font-semibold ${active ? 'text-primary' : 'text-fd-foreground'}`}>{s.title}</span>
                  <span className="mt-0.5 block font-mono text-[10.5px] text-fd-muted-foreground">{s.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-fd-border pt-4 font-mono text-[11px] text-fd-muted-foreground">
          <span className="flex items-center gap-2.5"><span className="h-1.5 w-5 rounded-full" style={{ background: CTRL }} /> Action · issued to the server</span>
          <span className="flex items-center gap-2.5"><span className="h-1.5 w-5 rounded-full" style={{ background: DATA }} /> Data · stored back on the server</span>
        </div>
      </div>
    </div>
  );
}

function Diagram({ inView, flows, hot, status, userMsg, desc, compact }: { inView: boolean; flows: Flow[]; hot: Set<string>; status: Record<string, { text: string; progress: number }>; userMsg: string | null; desc: string; compact: boolean }) {
  const bloom = (delay: number): CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? 'scale(1)' : 'scale(0.84)',
    transition: 'opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)',
    transitionDelay: `${delay}ms`,
  });

  return (
    <div className="absolute inset-0">
      <svg width={BASE_W} height={BASE_H} viewBox={`0 0 ${BASE_W} ${BASE_H}`} fill="none" className="absolute inset-0">
        <circle cx={CX} cy={CY} r={R_APP} stroke="rgba(76, 76, 76, 0.07)" strokeWidth="1" strokeDasharray="2 9" />
        <circle cx={CX} cy={CY} r={RO + 22} style={{ fill: 'oklch(0.5 0.15 var(--brand-hue) / 0.05)' }} />

        {/* spokes → apps */}
        {apps.map((app, i) => {
          const ang = appAngle(i);
          const dx = Math.sin(rad(ang));
          const dy = -Math.cos(rad(ang));
          const x1 = CX + dx * (RO + 8);
          const y1 = CY + dy * (RO + 8);
          const x2 = CX + dx * (R_APP - 60);
          const y2 = CY + dy * (R_APP - 60);
          if (app.bidi) {
            return <line key={app.label} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2" style={{ stroke: `oklch(var(--orbit-flow-l) 0.16 150)`, opacity: inView ? 1 : 0, transition: 'opacity .6s ease', transitionDelay: '500ms' }} />;
          }
          return (
            <line
              key={app.label}
              x1={x1} y1={y1} x2={x2} y2={y2}
              strokeWidth="1.4"
              strokeDasharray={app.placeholder ? '4 5' : undefined}
              style={{ stroke: app.placeholder ? 'var(--orbit-spoke)' : `oklch(var(--orbit-card-border-l) 0.12 ${app.hue} / 0.7)`, opacity: inView ? 1 : 0, transition: 'opacity .6s ease', transitionDelay: `${300 + i * 70}ms` }}
            />
          );
        })}

        {/* inner donut: five equal continuous segments — uncoloured */}
        {services.map((s, i) => {
          const a0 = -36 + i * 72;
          const d = wedge(a0, a0 + 72, RI, RO);
          if (s.placeholder) {
            return <path key={s.label} d={d} className="orbit-pulse" style={{ fill: 'var(--orbit-seg)', stroke: 'var(--orbit-seg-stroke-hot)', strokeWidth: 1.2, strokeDasharray: '5 5' }} />;
          }
          const isHot = hot.has(s.label);
          return (
            <path
              key={s.label}
              d={d}
              style={{
                fill: isHot ? 'var(--orbit-seg-hot)' : 'var(--orbit-seg)',
                stroke: isHot ? 'var(--orbit-seg-stroke-hot)' : 'var(--orbit-seg-stroke)',
                strokeWidth: isHot ? 1.6 : 1,
                opacity: inView ? 1 : 0,
                transition: 'opacity .5s ease, fill .25s ease, stroke .25s ease',
                transitionDelay: `${i * 70}ms`,
              }}
            />
          );
        })}
        <circle cx={CX} cy={CY} r={RI} style={{ fill: 'var(--orbit-hole)' }} />
        <circle cx={CX} cy={CY} r={RO + 2} fill="none" style={{ stroke: 'oklch(0.6 0.12 var(--brand-hue) / .4)', strokeWidth: 1.2 }} />
        <circle cx={CX} cy={CY} r={RO + 8} fill="none" style={{ stroke: 'oklch(var(--orbit-flow-l) 0.16 var(--brand-hue))', strokeWidth: 2, opacity: hot.has('server') ? 0.85 : 0, transition: 'opacity .25s ease' }} />

        {/* actions-in arrow (from the User node toward the server) */}
        <line x1={ENTRY.x + 34} y1={ENTRY.y} x2={px(RO + 4, 270)} y2={py(RO + 4, 270)} strokeWidth="2.6" style={{ stroke: 'oklch(var(--orbit-flow-l) var(--orbit-flow-c) var(--brand-hue))', opacity: inView ? 1 : 0, transition: 'opacity .6s ease', transitionDelay: '650ms' }} />
        <text x={(ENTRY.x + 34 + CX - RO) / 2} y={ENTRY.y - 14} fontFamily="var(--font-mono, monospace)" fontSize="11" fontWeight="500" letterSpacing="1.6" textAnchor="middle" style={{ fill: 'oklch(var(--orbit-flow-l) 0.13 var(--brand-hue))' }}>
          ISSUE ACTIONS
        </text>

        {/* glowing flows along the edges */}
        {flows.map((f) => {
          const hp = f.progress;
          const tp = Math.max(0, f.progress - 0.34);
          const hx = lerp(f.from.x, f.to.x, hp);
          const hy = lerp(f.from.y, f.to.y, hp);
          const tx = lerp(f.from.x, f.to.x, tp);
          const ty = lerp(f.from.y, f.to.y, tp);
          return (
            <g key={f.id}>
              <line x1={tx} y1={ty} x2={hx} y2={hy} strokeWidth="9" strokeLinecap="round" style={{ stroke: f.color, opacity: 0.22, filter: 'blur(4px)' }} />
              <line x1={tx} y1={ty} x2={hx} y2={hy} strokeWidth="3" strokeLinecap="round" style={{ stroke: f.color, filter: `drop-shadow(0 0 5px ${f.color})` }} />
            </g>
          );
        })}
      </svg>

      {/* User node (origin of actions) + its initial command bubble */}
      <Centered x={ENTRY.x} y={ENTRY.y}>
        <div className="relative flex flex-col items-center" style={bloom(250)}>
          {userMsg && (
            <div className="absolute bottom-full mb-3 whitespace-nowrap rounded-xl border border-primary/40 bg-primary/15 px-3 py-1.5 font-mono text-[12px] text-primary backdrop-blur">
              “{userMsg}”
              <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-primary/40 bg-primary/15" />
            </div>
          )}
          <span className="grid size-11 place-items-center rounded-2xl border" style={iconBox('var(--brand-hue)')}>
            <User className="size-6" style={{ color: iconColor('var(--brand-hue)') }} />
          </span>
          {!compact && <div className="mt-1.5 font-mono text-[11px] text-fd-muted-foreground">You</div>}
        </div>
      </Centered>

      {/* center hub — shows the live server message while the server works,
          otherwise the Arkitekt mark */}
      <Centered x={CX} y={CY}>
        <div className="grid place-items-center rounded-full">
          {hot.has('server') ? (
            <div key={desc} className="animate-pop-in w-[160px] text-center">
              <div className="font-mono text-[9px] tracking-[0.18em] text-primary/80">SERVER</div>
              <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-fd-foreground">{desc}</p>
            </div>
          ) : (
            <div className="text-center">
              <Logo className="mx-auto size-[80px]" />
              <div className="mt-1.5 text-[15px] font-bold tracking-tight">Arkitekt</div>
            </div>
          )}
        </div>
      </Centered>

      {/* core-service labels — neutral; hidden when the diagram is small */}
      {!compact &&
        services.map((s, i) => {
          const ang = i * 72;
          return (
            <Centered key={s.label} x={px((RI + RO) / 2, ang)} y={py((RI + RO) / 2, ang)}>
              <Link
                href={s.href}
                title={s.placeholder ? 'Add your own service' : `Open ${s.label} docs`}
                className={`flex w-[92px] cursor-pointer flex-col items-center text-center transition-colors hover:text-primary ${s.placeholder ? 'orbit-pulse' : ''}`}
                style={s.placeholder ? undefined : bloom(i * 70)}
              >
                <s.icon className="mb-1 size-[16px]" style={{ color: 'var(--orbit-icon)' }} />
                <div className={`text-[12.5px] font-bold tracking-tight ${s.placeholder ? 'text-fd-muted-foreground' : ''}`}>{s.label}</div>
              </Link>
            </Centered>
          );
        })}

      {/* app cards */}
      {apps.map((app, i) => {
        const { x, y } = appPt(i);
        const isHot = hot.has(app.label);
        const st = status[app.label];
        return (
          <Centered key={app.label} x={x} y={y}>
            <div style={bloom(300 + i * 70)}>
              <Link
                href={app.href}
                title={app.placeholder ? 'Create your own app' : `Open ${app.label} docs`}
                className="block cursor-pointer transition-transform duration-200 hover:scale-[1.04]"
              >
              {app.placeholder ? (
                <div
                  className={`orbit-pulse flex items-center justify-center rounded-2xl border border-dashed ${compact ? 'size-[104px]' : 'h-[68px] w-[208px] justify-start gap-3 px-4'}`}
                  style={{ borderColor: 'var(--orbit-seg-stroke-hot)', backgroundColor: 'var(--orbit-seg)' }}
                >
                  {compact ? (
                    <app.icon className="size-10" style={{ color: 'var(--orbit-icon)' }} />
                  ) : (
                    <>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-dashed" style={{ borderColor: 'var(--orbit-seg-stroke-hot)', color: 'var(--orbit-icon)' }}><app.icon className="size-[20px]" /></span>
                      <div className="leading-tight">
                        <div className="text-[14px] font-bold tracking-tight text-fd-foreground">{app.label}</div>
                        <div className="mt-1 font-mono text-[10px] text-fd-muted-foreground">{app.sub}</div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div
                  className={`relative flex items-center rounded-2xl border ${compact ? 'size-[104px] justify-center' : 'h-[68px] w-[208px] justify-start gap-3 px-4'}`}
                  style={cardStyle(app.hue!, isHot)}
                >
                  {compact ? (
                    <>
                      <app.icon className="size-10" style={{ color: iconColor(app.hue!) }} />
                      {st && (
                        <div className="absolute inset-x-3 bottom-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--orbit-seg-hot)' }}>
                          <div className="h-full rounded-full" style={{ width: `${st.progress * 100}%`, background: iconColor(app.hue!), transition: 'width .12s linear' }} />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border" style={iconBox(app.hue!)}>
                        <app.icon className="size-[20px]" style={{ color: iconColor(app.hue!) }} />
                      </span>
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[14px] font-bold tracking-tight text-fd-foreground">{app.label}</span>
                          {app.tech && (
                            <span
                              className="shrink-0 rounded border px-1 py-px font-mono text-[9px] leading-none"
                              style={{
                                borderColor: `oklch(var(--orbit-card-border-l) 0.1 ${app.hue} / 0.5)`,
                                backgroundColor: `oklch(var(--orbit-card-iconbg-l) 0.07 ${app.hue} / 0.55)`,
                                color: iconColor(app.hue!),
                              }}
                            >
                              {app.tech}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-fd-muted-foreground">{app.sub}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
              </Link>
            </div>
          </Centered>
        );
      })}

      {/* per-app status bubbles with progress */}
      {!compact &&
        apps.map((app, i) => {
          const st = status[app.label];
          if (!st || app.placeholder) return null;
          const { x, y } = appPt(i);
          const by = y >= CY ? y - 60 : y + 60; // sit toward the centre, away from edges
          const hue = app.hue ?? 272;
          return (
            <Centered key={`st-${app.label}`} x={x} y={by}>
              <div
                className="animate-pop-in w-[164px] rounded-xl border px-3 py-2 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)] backdrop-blur"
                style={{ borderColor: `oklch(0.6 0.13 ${hue} / 0.6)`, background: 'var(--orbit-bubble-bg)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-tight text-fd-foreground">{app.label}</span>
                  <span className="font-mono text-[10px] text-fd-muted-foreground">{Math.round(st.progress * 100)}%</span>
                </div>
                <div className="mt-1 font-mono text-[10px] leading-snug text-fd-muted-foreground">{st.text}</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fd-border">
                  <div className="h-full rounded-full" style={{ width: `${st.progress * 100}%`, background: `oklch(var(--orbit-flow-l) 0.16 ${hue})`, transition: 'width .12s linear' }} />
                </div>
              </div>
            </Centered>
          );
        })}

      {/* legend */}
      <div className="absolute right-2 top-1 flex flex-col gap-2.5 font-mono text-[11px] text-fd-muted-foreground" style={bloom(150)}>
        <div className="flex items-center gap-2.5"><span className="size-[15px] rounded-full border-[2.5px] border-primary bg-primary/15" /> Server <span className="text-fd-muted-foreground/60">· services combined</span></div>
        <div className="flex items-center gap-2.5"><span className="h-[10px] w-[15px] rounded border-[1.6px] border-fd-muted-foreground/50" /> Apps <span className="text-fd-muted-foreground/60">· outer layer</span></div>
      </div>
    </div>
  );
}

/** Absolutely position children centred on (x, y) in the base coordinate space. */
function Centered({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className="absolute" style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
      {children}
    </div>
  );
}
