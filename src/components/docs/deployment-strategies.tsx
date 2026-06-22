'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Boxes, Globe, Laptop, Lock, Network, Server, ShieldCheck } from 'lucide-react';
import { useInView } from '@/components/marketing/reveal';
import { Logo } from '@/components/site/logo';

/* Deployment strategies, in the ProvenanceFlow visual language (theme-aware
   `--orbit-*` / `--brand-hue` OKLCH tokens).

   Layout is flexbox: a column of bands — PUBLIC INTERNET on top, then the
   ground floor holding two side-by-side network boxes (ANOTHER NETWORK and
   YOUR LOCAL NETWORK). Every box and node card is a flex child that sizes
   itself; nothing is hand-placed. The only absolutely-positioned layer is the
   SVG wire overlay, whose edges are routed from the *measured* positions of the
   node cards — so the diagram and its connectors always agree.

   One fixed point of view: your app always lives in your local network, and a
   remote app on another network always wants in. Across the three strategies
   only server placement changes — and with it which of your two planes crosses
   the NAT/firewall, and whether the remote app can reach in:
     • data  (green)   — your workload. Crossing it means your data leaves.
     • auth  (indigo)  — the auth & discovery handshake (every app needs it).
   The Data / Auth / Both switch isolates one plane. Nothing animates. */

const flow = (hue: number | string) => `oklch(var(--orbit-flow-l) var(--orbit-flow-c) ${hue})`;
const DATA = flow(150); // workload data — green
const AUTH = flow('var(--brand-hue)'); // auth & discovery — brand indigo
const RED = 'oklch(var(--orbit-flow-l) 0.21 28)'; // dropped at the firewall
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Plane = 'data' | 'auth';
type Variant = 'tunnel' | 'blocked';
type Net = 'mine' | 'other'; // undefined ⇒ lives in the public internet
type Kind = 'central' | 'coordinator' | 'apps' | 'outside';
type Route = 'sibling' | 'inrow' | 'up' | 'over' | 'blocked';

type Node = { id: string; kind: Kind; title: string; sub: string; net?: Net };
const mk = (id: string, kind: Kind, title: string, sub: string, net?: Net): Node => ({ id, kind, title, sub, net });

type Edge = { from: string; to?: string; plane: Plane; variant?: Variant; route: Route; lane?: number; label?: string; help?: boolean; info?: string };

type Strategy = { key: string; title: string; readiness: string; story: string; nodes: Node[]; edges: Edge[] };

const TAILSCALE = 'Air-gapped by default — but you’re of course free to bridge in with your own VPN, e.g. Tailscale or WireGuard.';

// ── the three strategies — node lists + semantic edges (geometry is measured) ──
const PARTNER: Strategy = {
  key: 'partner',
  title: 'Kommunity partner',
  readiness: 'Demo only',
  story:
    'Your app runs in your local network, but the servers live on the partner’s public cloud — so its data and auth calls cross the boundary out to the internet. An app on another network reaches those same public servers just as easily. The catch is trust, not reachability: your data lives on infrastructure you don’t own.',
  nodes: [
    mk('coord', 'coordinator', 'Coordination server', 'partner · public'),
    mk('central', 'central', 'Data-Server','partner · public'),
    mk('outside', 'outside', 'Remote app', 'another network', 'other'),
    mk('app', 'apps', 'Your app', 'local network', 'mine'),
  ],
  edges: [
    { from: 'app', to: 'coord', plane: 'auth', route: 'up', lane: 0, label: 'auth & discovery', help: true },
    { from: 'app', to: 'central', plane: 'data', route: 'up', lane: 1, label: 'data' },
    { from: 'outside', to: 'coord', plane: 'auth', route: 'up', lane: 2 },
    { from: 'outside', to: 'central', plane: 'data', route: 'up', lane: 3, label: 'connects' },
  ],
};

const LOCAL: Strategy = {
  key: 'local',
  title: 'Local + coordination',
  readiness: 'Recommended',
  story:
    'Your app and the central server both sit in your local network, so your workload data never leaves it — only the lightweight auth & discovery handshake crosses the firewall to the Arkitekt-run coordination server. An app on another network can still reach in, over an experimental, encrypted WireGuard mesh tunnel.',
  nodes: [
    mk('coord', 'coordinator', 'Coordination server', 'Arkitekt-run'),
    mk('outside', 'outside', 'Remote app', 'another network', 'other'),
    mk('app', 'apps', 'Your app', 'local network', 'mine'),
    mk('central', 'central', 'Data-Server','in your lab', 'mine'),
  ],
  edges: [
    { from: 'app', to: 'central', plane: 'data', route: 'sibling', label: 'data · stays local' },
    { from: 'app', to: 'coord', plane: 'auth', route: 'up', lane: 0, label: 'auth & discovery', help: true },
    { from: 'outside', to: 'coord', plane: 'auth', route: 'up', lane: 1 },
    { from: 'outside', to: 'central', plane: 'data', variant: 'tunnel', route: 'over', lane: 2, label: 'experimental WireGuard' },
  ],
};

const SELFHOST: Strategy = {
  key: 'selfhost',
  title: 'Fully self-hosted',
  readiness: 'Advanced',
  story:
    'Everything — your app, the central server, and your own coordination server — runs inside your local network, so neither data nor auth ever crosses the boundary. By the same token there is no way in for an app on another network: the firewall drops it. That isolation is the point (air-gapped / CI).',
  nodes: [
    mk('outside', 'outside', 'Remote app', 'another network', 'other'),
    mk('app', 'apps', 'Your app', 'local network', 'mine'),
    mk('central', 'central', 'Data-Server','in your lab', 'mine'),
    mk('coord', 'coordinator', 'Coordination server', 'your own', 'mine'),
  ],
  edges: [
    { from: 'app', to: 'central', plane: 'data', route: 'sibling', label: 'data' },
    { from: 'app', to: 'coord', plane: 'auth', route: 'inrow', label: 'auth & discovery · in-network', help: true },
    { from: 'outside', plane: 'auth', variant: 'blocked', route: 'blocked', lane: 0, label: 'no way in', info: TAILSCALE },
  ],
};

const STRATEGIES: Strategy[] = [PARTNER, LOCAL, SELFHOST];

const ICON: Record<Kind, typeof Server> = { central: Server, coordinator: Network, apps: Boxes, outside: Laptop };
const colorOf = (e: Edge) => (e.variant === 'blocked' ? RED : e.plane === 'data' ? DATA : AUTH);
const DISCOVERY_URL = '/docs/design/architecture/service-discovery';

const PARAM = 'deploy';
const DEFAULT = Math.max(0, STRATEGIES.findIndex((s) => s.key === 'local'));
type Show = 'both' | 'data' | 'auth';

export function DeploymentStrategies() {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  const [active, setActive] = useState(DEFAULT);
  const [show, setShow] = useState<Show>('both');

  // restore the tab from ?deploy= after mount (keeps SSG markup hydration-safe)
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get(PARAM);
    const idx = STRATEGIES.findIndex((x) => x.key === key);
    if (idx >= 0) setActive(idx);
  }, []);

  const s = STRATEGIES[active];

  const select = (idx: number) => {
    setActive(idx);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM, STRATEGIES[idx].key);
      window.history.replaceState({}, '', url);
    } catch {
      /* ignore */
    }
  };

  return (
    <figure className="not-prose my-8">
      <div ref={ref} className="relative isolate overflow-hidden rounded-3xl border border-fd-border bg-[var(--orbit-surface)] text-fd-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[8%] h-[22rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--orbit-grid)_1px,transparent_0)] [background-size:36px_36px]" />
        </div>

        {/* strategy tabs — part of the card, divided by the same border */}
        <div role="tablist" aria-label="Deployment strategies" className="flex border-b border-fd-border">
          {STRATEGIES.map((st, i) => {
            const on = i === active;
            return (
              <button
                key={st.key}
                role="tab"
                aria-selected={on}
                onClick={() => select(i)}
                className={`-mb-px flex-1 border-b-2 px-3 py-3 text-[13.5px] font-semibold transition-colors ${
                  on ? 'border-primary text-fd-foreground' : 'border-transparent text-fd-muted-foreground hover:text-fd-foreground'
                }`}
              >
                {st.title}
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-5 pt-4 sm:px-6">
          {/* plane switch + readiness */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-fd-muted-foreground">{s.readiness}</span>
            <div className="inline-flex rounded-lg border border-fd-border p-0.5 text-[12px]" role="group" aria-label="Which plane to show">
              {(['both', 'data', 'auth'] as Show[]).map((opt) => {
                const on = show === opt;
                const tint = opt === 'data' ? DATA : opt === 'auth' ? AUTH : undefined;
                return (
                  <button
                    key={opt}
                    onClick={() => setShow(opt)}
                    aria-pressed={on}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium capitalize transition-colors"
                    style={{ background: on ? 'var(--color-fd-muted)' : 'transparent', color: on ? 'var(--color-fd-foreground)' : 'var(--color-fd-muted-foreground)' }}
                  >
                    {tint && <span className="size-2 rounded-full" style={{ background: tint }} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Diagram s={s} show={show} inView={inView} />
          </div>

          <p key={s.key + show} className="animate-pop-in mx-auto mt-3 max-w-2xl text-center text-[14px] leading-relaxed text-fd-foreground/85">
            {s.story}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] text-fd-muted-foreground">
            <span className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full" style={{ background: DATA }} /> data · your workload</span>
            <span className="flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dotted" style={{ borderColor: AUTH }} /> auth &amp; discovery</span>
            <span className="flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: DATA }} /> WireGuard mesh · experimental</span>
            <span className="flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: RED }} /> blocked at the firewall</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-fd-muted-foreground">
        <strong>Your app always stays in your local network.</strong> What changes between strategies
        is where the servers live — and therefore which of your connections cross the NAT/firewall
        boundary, and whether an app on another network can reach in at all.
      </figcaption>
    </figure>
  );
}

// ── measured geometry ───────────────────────────────────────────────────────
type Anchor = { cx: number; cy: number; top: number; bottom: number; left: number; right: number };
type Box = { x: number; y: number; w: number; h: number };
type Geo = { anchors: Record<string, Anchor>; mine?: Box; other?: Box; firewallY: number; serverBottom: number; lanes: number; W: number; H: number };

function laneY(i: number, g: Geo) {
  return lerp(g.serverBottom + 14, g.firewallY - 12, (i + 1) / (g.lanes + 1));
}

type Built = { pts: { x: number; y: number }[]; labelPt?: { x: number; y: number }; helpPt?: { x: number; y: number }; infoPt?: { x: number; y: number } };

function buildEdge(e: Edge, g: Geo): Built | null {
  const a = g.anchors[e.from];
  if (!a) return null;
  const t = e.to ? g.anchors[e.to] : undefined;
  const fw = g.firewallY;
  let pts: { x: number; y: number }[];

  if (e.route === 'sibling') {
    if (!t) return null;
    pts = [{ x: a.right, y: a.cy }, { x: t.left, y: t.cy }];
    return { pts, labelPt: { x: (a.right + t.left) / 2, y: a.cy - 10 } };
  }
  if (e.route === 'inrow') {
    if (!t) return null;
    const y = fw + 18;
    pts = [{ x: a.cx, y: a.top }, { x: a.cx, y }, { x: t.cx, y }, { x: t.cx, y: t.top }];
  } else if (e.route === 'up') {
    if (!t) return null;
    const y = laneY(e.lane ?? 0, g);
    pts = [{ x: a.cx, y: a.top }, { x: a.cx, y }, { x: t.cx, y }, { x: t.cx, y: t.bottom }];
  } else if (e.route === 'over') {
    if (!t) return null;
    const y = laneY(e.lane ?? 0, g);
    pts = [{ x: a.cx, y: a.top }, { x: a.cx, y }, { x: t.cx, y }, { x: t.cx, y: t.top }];
  } else {
    // blocked — head toward your network, dropped at the firewall
    const tx = g.mine ? g.mine.x + 34 : a.cx;
    const y = laneY(e.lane ?? 0, g);
    pts = [{ x: a.cx, y: a.top }, { x: a.cx, y }, { x: tx, y }, { x: tx, y: fw }];
    const last = pts[pts.length - 1];
    return { pts, labelPt: { x: (pts[1].x + pts[2].x) / 2, y: pts[1].y - 7 }, infoPt: { x: last.x + 22, y: last.y - 20 } };
  }

  const segMid = { x: (pts[1].x + pts[2].x) / 2, y: pts[1].y };
  return { pts, labelPt: { x: segMid.x, y: segMid.y - 7 }, helpPt: { x: segMid.x + 34, y: segMid.y + 13 } };
}

function crossings(pts: { x: number; y: number }[], y: number) {
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if ((a.y - y) * (b.y - y) < 0) out.push({ x: a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y)), y });
  }
  return out;
}

function Diagram({ s, show, inView }: { s: Strategy; show: Show; inView: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mineRef = useRef<HTMLDivElement>(null);
  const otherRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  const publicNodes = s.nodes.filter((n) => !n.net);
  const otherNodes = s.nodes.filter((n) => n.net === 'other');
  const mineNodes = s.nodes.filter((n) => n.net === 'mine');
  const lanes = Math.max(1, ...s.edges.map((e) => (e.lane ?? -1) + 1));

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const anchors: Record<string, Anchor> = {};
    let serverBottom = 0;
    for (const n of s.nodes) {
      const el = nodeRefs.current.get(n.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      anchors[n.id] = { cx: r.left - w.left + r.width / 2, cy: r.top - w.top + r.height / 2, top: r.top - w.top, bottom: r.bottom - w.top, left: r.left - w.left, right: r.right - w.left };
      if (!n.net) serverBottom = Math.max(serverBottom, r.bottom - w.top);
    }
    const boxOf = (el: HTMLDivElement | null): Box | undefined => (el ? { x: el.getBoundingClientRect().left - w.left, y: el.getBoundingClientRect().top - w.top, w: el.offsetWidth, h: el.offsetHeight } : undefined);
    const mine = boxOf(mineRef.current);
    const other = boxOf(otherRef.current);
    const firewallY = mine?.y ?? other?.y ?? w.height * 0.5;
    setGeo({ anchors, mine, other, firewallY, serverBottom: serverBottom || firewallY * 0.4, lanes, W: w.width, H: w.height });
  }, [s, lanes]);

  useLayoutEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure]);

  const setNode = (id: string) => (el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  };

  const bloom: CSSProperties = { opacity: inView ? 1 : 0, transition: 'opacity .3s ease' };
  const visible = s.edges.filter((e) => show === 'both' || e.plane === show);

  return (
    <div ref={wrapRef} className="relative mx-auto min-w-[700px] max-w-[880px]">
      {/* wire overlay — the only absolutely-positioned layer */}
      {geo && (
        <svg className="absolute inset-0 z-0 h-full w-full" viewBox={`0 0 ${geo.W} ${geo.H}`} preserveAspectRatio="none" fill="none" aria-hidden style={bloom}>
          <defs>
            <marker id="dsData" markerWidth="6" markerHeight="6" refX="4.4" refY="3" orient="auto"><path d="M0 0 L5 3 L0 6 z" fill={DATA} /></marker>
            <marker id="dsAuth" markerWidth="6" markerHeight="6" refX="4.4" refY="3" orient="auto"><path d="M0 0 L5 3 L0 6 z" fill={AUTH} /></marker>
          </defs>

          {/* network enclosures (drawn behind the transparent flex boxes) */}
          {geo.mine && <rect x={geo.mine.x} y={geo.mine.y} width={geo.mine.w} height={geo.mine.h} rx="18" fill="var(--color-fd-primary)" fillOpacity="0.05" stroke="var(--color-fd-primary)" strokeOpacity="0.34" strokeWidth="1.5" />}
          {geo.other && <rect x={geo.other.x} y={geo.other.y} width={geo.other.w} height={geo.other.h} rx="18" fill="var(--color-fd-muted)" fillOpacity="0.4" stroke="var(--color-fd-border)" strokeWidth="1.5" strokeDasharray="5 5" />}
          {/* the firewall line — both networks hang their top edge off it */}
          <line x1="6" y1={geo.firewallY} x2={geo.W - 6} y2={geo.firewallY} stroke="var(--color-fd-primary)" strokeOpacity="0.5" strokeWidth="2.5" strokeDasharray="1 9" strokeLinecap="round" />

          {visible.map((e, i) => {
            const b = buildEdge(e, geo);
            if (!b) return null;
            const color = colorOf(e);
            const points = b.pts.map((p) => `${p.x},${p.y}`).join(' ');
            const dash = e.variant === 'tunnel' ? '10 8' : e.variant === 'blocked' ? '7 6' : e.plane === 'auth' ? '2 7' : undefined;
            return (
              <g key={i}>
                {e.variant === 'tunnel' && <polyline points={points} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity="0.22" style={{ filter: 'blur(4px)' }} />}
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={e.plane === 'data' && !e.variant ? 2.6 : 2.2}
                  strokeDasharray={dash}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  markerEnd={e.variant === 'blocked' ? undefined : e.plane === 'auth' ? 'url(#dsAuth)' : 'url(#dsData)'}
                  style={{ opacity: 0.95 }}
                />
                {e.label && b.labelPt && (
                  <text x={b.labelPt.x} y={b.labelPt.y} fontFamily="var(--font-mono, monospace)" fontSize="10.5" fontWeight="600" textAnchor="middle" style={{ fill: color }}>
                    {e.label}
                  </text>
                )}
                {e.help && b.helpPt && <HelpDot x={b.helpPt.x} y={b.helpPt.y} />}
                {e.info && b.infoPt && <InfoDot x={b.infoPt.x} y={b.infoPt.y} tip={e.info} />}
              </g>
            );
          })}

          {/* firewall markers: open port for an allowed crossing, lock for a tunnel, X for blocked */}
          {visible.flatMap((e, i) => {
            const b = buildEdge(e, geo);
            if (!b) return [];
            const color = colorOf(e);
            if (e.variant === 'blocked') {
              const last = b.pts[b.pts.length - 1];
              return [
                <g key={`x${i}`} transform={`translate(${last.x}, ${last.y})`} stroke={RED} strokeWidth="3" strokeLinecap="round">
                  <line x1="-7" y1="-7" x2="7" y2="7" />
                  <line x1="-7" y1="7" x2="7" y2="-7" />
                </g>,
              ];
            }
            return crossings(b.pts, geo.firewallY).map((c, j) => (
              <g key={`m${i}-${j}`} transform={`translate(${c.x}, ${c.y})`}>
                <rect x="-9" y="-7" width="18" height="14" rx="4" fill="var(--orbit-surface)" stroke={color} strokeWidth="1.8" />
                {e.variant === 'tunnel' ? (
                  <>
                    <rect x="-4.5" y="-1" width="9" height="6.5" rx="1.5" fill={color} />
                    <path d="M-2.6 -1 V-3.4 a2.6 2.6 0 0 1 5.2 0 V-1" fill="none" stroke={color} strokeWidth="1.4" />
                  </>
                ) : (
                  <circle r="2.6" fill={color} />
                )}
              </g>
            ));
          })}
        </svg>
      )}

      {/* the flex layout */}
      <div className="relative z-10 flex flex-col" style={bloom}>
        {/* public internet band */}
        <div className="flex min-h-[160px] flex-col gap-2 px-4 pt-2">
          <BandLabel icon={<Globe className="size-3.5" />}>PUBLIC INTERNET</BandLabel>
          <div className="flex flex-1 items-start justify-center gap-6">
            {publicNodes.length ? (
              publicNodes.map((n) => <NodeCard key={n.id} n={n} innerRef={setNode(n.id)} />)
            ) : (
              <div className="m-auto flex flex-col items-center gap-1 text-center">
                <span className="flex items-center gap-1.5 rounded-full border border-dashed border-fd-border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fd-muted-foreground">
                  <Globe className="size-3" /> fully air-gapped
                </span>
                <span className="font-mono text-[10px] text-fd-muted-foreground/80">nothing of yours reaches the public internet</span>
              </div>
            )}
          </div>
        </div>

        {/* ground floor — two networks side by side, behind the NAT/firewall */}
        <div className="relative flex min-h-[176px] items-stretch gap-5 px-4 pb-2">
          {/* NAT chip sits on the firewall line (top edge of the ground floor) */}
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
            <span className="flex items-center gap-1.5 rounded-full border border-fd-border bg-[var(--orbit-surface)] px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-fd-muted-foreground">
              <Lock className="size-2.5" /> NAT / firewall
            </span>
          </div>

          {otherNodes.length > 0 && (
            <div ref={otherRef} className="relative flex shrink flex-col gap-2 rounded-2xl p-3">
              <BandLabel icon={<Laptop className="size-3" />} small>ANOTHER NETWORK</BandLabel>
              <div className="flex flex-1 items-center justify-center">
                {otherNodes.map((n) => <NodeCard key={n.id} n={n} innerRef={setNode(n.id)} />)}
              </div>
            </div>
          )}

          <div ref={mineRef} className="relative flex grow flex-col gap-2 rounded-2xl p-3">
            <BandLabel icon={<ShieldCheck className="size-3.5" />}>YOUR LOCAL NETWORK</BandLabel>
            <div className="flex flex-1 items-center justify-center gap-5">
              {mineNodes.map((n) => <NodeCard key={n.id} n={n} innerRef={setNode(n.id)} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BandLabel({ icon, small, children }: { icon: ReactNode; small?: boolean; children: ReactNode }) {
  return (
    <span className={`flex items-center gap-1.5 self-start font-mono font-bold uppercase text-fd-muted-foreground ${small ? 'text-[8.5px] tracking-[0.12em]' : 'text-[10.5px] tracking-[0.18em]'}`}>
      {icon}
      {children}
    </span>
  );
}

/** “?” marker linking to Service Discovery (native SVG tooltip on hover). */
function HelpDot({ x, y }: { x: number; y: number }) {
  return (
    <a href={DISCOVERY_URL} style={{ cursor: 'pointer' }} aria-label="How apps discover the server — read about Service Discovery">
      <title>Each app runs a discovery handshake with the server — learn more about Service Discovery</title>
      <circle cx={x} cy={y} r="9" fill="color-mix(in oklch, var(--color-fd-primary) 22%, transparent)" stroke="var(--color-fd-primary)" strokeWidth="1.4" />
      <text x={x} y={y + 3.4} textAnchor="middle" fontFamily="var(--font-mono, monospace)" fontSize="11.5" fontWeight="700" fill="var(--color-fd-primary)">?</text>
    </a>
  );
}

/** A plain “?” marker with a hover tooltip (no link) — for asides like “bring your own VPN”. */
function InfoDot({ x, y, tip }: { x: number; y: number; tip: string }) {
  return (
    <g style={{ cursor: 'help' }} aria-label={tip}>
      <title>{tip}</title>
      <circle cx={x} cy={y} r="9" fill="var(--orbit-surface)" stroke="var(--color-fd-muted-foreground)" strokeWidth="1.4" />
      <text x={x} y={y + 3.4} textAnchor="middle" fontFamily="var(--font-mono, monospace)" fontSize="11.5" fontWeight="700" fill="var(--color-fd-muted-foreground)">?</text>
    </g>
  );
}

function NodeCard({ n, innerRef }: { n: Node; innerRef: (el: HTMLDivElement | null) => void }) {
  const Icon = ICON[n.kind];
  const mine = n.net === 'mine';
  const hue = 'var(--brand-hue)';
  const style: CSSProperties = mine
    ? {
        borderColor: `oklch(var(--orbit-card-border-hot-l) 0.12 ${hue})`,
        borderWidth: 2,
        backgroundImage: `linear-gradient(180deg, oklch(var(--orbit-card-l1) var(--orbit-card-c) ${hue}), oklch(var(--orbit-card-l2) var(--orbit-card-c) ${hue}))`,
      }
    : { borderColor: 'var(--color-fd-border)', borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'var(--color-fd-card)' };
  const iconColor = mine ? `oklch(var(--orbit-card-fg-l) 0.16 ${hue})` : 'var(--color-fd-muted-foreground)';
  const iconBox: CSSProperties = mine
    ? { borderColor: `oklch(var(--orbit-card-border-l) 0.11 ${hue} / 0.5)`, backgroundColor: `oklch(var(--orbit-card-iconbg-l) 0.08 ${hue} / 0.45)` }
    : { borderColor: 'var(--color-fd-border)', backgroundColor: 'var(--color-fd-muted)' };

  // the Arkitekt services carry the mark itself; the coordination server's is muted
  const logo = n.kind === 'central' || n.kind === 'coordinator';

  return (
    <div ref={innerRef} className="flex w-[150px] shrink-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5" style={style}>
      {logo ? (
        <Logo className={`size-8 shrink-0 ${n.kind === 'coordinator' ? 'opacity-45 grayscale' : ''}`} />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border" style={iconBox}>
          <Icon className="size-[18px]" style={{ color: iconColor }} />
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[13px] font-bold tracking-tight text-fd-foreground">{n.title}</div>
        <div className="mt-0.5 truncate font-mono text-[10px] text-fd-muted-foreground">{n.sub}</div>
      </div>
    </div>
  );
}
