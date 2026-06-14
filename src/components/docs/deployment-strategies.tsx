'use client';

import React from 'react';

/**
 * DeploymentStrategies
 *
 * Tabbed topology figure (one strategy at a time, active tab persisted in the
 * URL as `?deploy=`). Layout rules that keep it tidy:
 *   • Top band = the public INTERNET only (community server / public servers).
 *   • Ground band = devices & local servers. The "outside app" is a device on
 *     another network, so it sits on the SAME row as the local apps — just to
 *     the left of, and outside, the lab box.
 *   • The lab box is your local network behind NAT (its top + left edges are
 *     the firewall boundary).
 *   • All connectors use orthogonal (right-angle) routing so lines never cross
 *     node boxes; the mesh tunnel is the one dashed exception.
 * Each strategy shows the happy local path and the non-happy path for the
 * outside device.
 */

const GREEN = '#7FC99B';
const AMBER = '#E8B96B';
const PURPLE = '#8B8AF7';
const RED = '#F2787F';
const MUTED = 'rgba(255,255,255,0.42)';
const INDIGO = '#9b9bff';
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISCOVERY_URL = '/docs/design/architecture/service-discovery';

// ── grid ────────────────────────────────────────────────────────────────
const NW = 190;
const NH = 80;
const COL = { OUT: 150, P: 430, Q: 670, R: 910 }; // P,Q,R live inside the lab
const NET = 96; // internet band — node center y
const GND = 320; // ground band — node center y
const NATY = 200; // lab top edge / internet boundary
const NATX = 300; // lab left edge / outside boundary
const LABW = 720;

type Owner = 'you' | 'community' | 'partner' | 'outside';
type Kind = 'outside' | 'central' | 'coordinator' | 'apps';

interface Pt {
  x: number;
  y: number;
}
interface Node {
  id: string;
  kind: Kind;
  cx: number;
  cy: number;
  title: string;
  sub: string;
  owner: Owner;
}
const mk = (id: string, kind: Kind, cx: number, cy: number, title: string, sub: string, owner: Owner): Node => ({ id, kind, cx, cy, title, sub, owner });
const top = (m: Node): Pt => ({ x: m.cx, y: m.cy - NH / 2 });
const bottom = (m: Node): Pt => ({ x: m.cx, y: m.cy + NH / 2 });
const lft = (m: Node): Pt => ({ x: m.cx - NW / 2, y: m.cy });
const rgt = (m: Node): Pt => ({ x: m.cx + NW / 2, y: m.cy });

type EdgeKind = 'data' | 'control' | 'blocked' | 'tunnel';
interface Edge {
  kind: EdgeKind;
  pts: Pt[];
  label?: string;
  lx?: number;
  ly?: number;
  anchor?: 'start' | 'middle' | 'end';
  lock?: Pt;
  help?: Pt;
}
interface Strategy {
  key: string;
  title: string;
  accent: string;
  readiness: string;
  story: string;
  nodes: Node[];
  edges: Edge[];
}

// ── strategies ──────────────────────────────────────────────────────────
// Data plane (green, solid) = workload data, app ↔ central server.
// Control plane (indigo, dotted) = auth & discovery, via the coordination server.
function buildPartner(): Strategy {
  const outside = mk('outside', 'outside', COL.OUT, GND, 'Outside app', 'another network', 'outside');
  const coord = mk('coord', 'coordinator', 430, NET, 'Coordination server', 'partner · public', 'partner');
  const central = mk('central', 'central', 700, NET, 'Central server', 'partner · public', 'partner');
  const apps = mk('apps', 'apps', 565, GND, 'Your apps', 'run anywhere', 'you');
  return {
    key: 'partner',
    title: 'Kommunity partner',
    accent: AMBER,
    readiness: 'Demo only',
    story:
      'Everything runs on the partner’s public cloud — no NAT to cross, so local apps and an app on another network connect the same easy way. Each app still does auth & discovery (control plane) against the coordination server before its data flows to the central server. The catch is trust, not reachability: your data lives on infrastructure you don’t own.',
    nodes: [outside, coord, central, apps],
    edges: [
      // data: apps → central
      { kind: 'data', pts: [{ x: 575, y: 280 }, { x: 575, y: 160 }, { x: 700, y: 160 }, { x: 700, y: 136 }], label: 'data', lx: 642, ly: 152, anchor: 'middle' },
      // auth & discovery: apps → coordination
      { kind: 'control', pts: [{ x: 555, y: 280 }, { x: 555, y: 182 }, { x: 430, y: 182 }, { x: 430, y: 136 }], label: 'auth & discovery', lx: 470, ly: 174, anchor: 'middle', help: { x: 430, y: 160 } },
      // data: outside app → central (public, works)
      { kind: 'data', pts: [{ x: 150, y: 280 }, { x: 150, y: 118 }, { x: 605, y: 118 }, { x: 605, y: 96 }], label: 'connect', lx: 320, ly: 110, anchor: 'middle' },
    ],
  };
}

function buildLocal(): Strategy {
  const outside = mk('outside', 'outside', COL.OUT, GND, 'Outside app', 'another network', 'outside');
  const coord = mk('coord', 'coordinator', 550, NET, 'Coordination server', 'Arkitekt-run', 'community');
  const central = mk('central', 'central', COL.Q, GND, 'Central server', 'in your lab', 'you');
  const apps = mk('apps', 'apps', COL.P, GND, 'Local apps', 'same network', 'you');
  return {
    key: 'local',
    title: 'Local + coordination',
    accent: GREEN,
    readiness: 'Recommended',
    story:
      'Local apps do auth & discovery (control plane) via the coordination server, then exchange data directly with the central server. An app on another network can’t reach the server directly — it’s behind NAT, so the direct data attempt is dropped at the firewall. After discovering through the coordination server, it gets in over an encrypted WireGuard mesh tunnel, peer-to-peer.',
    nodes: [outside, coord, central, apps],
    edges: [
      // data: apps → central
      { kind: 'data', pts: [{ x: 525, y: 320 }, { x: 575, y: 320 }], label: 'data', lx: 550, ly: 312, anchor: 'middle' },
      // auth & discovery: apps → coordination
      { kind: 'control', pts: [{ x: 430, y: 280 }, { x: 430, y: 165 }, { x: 520, y: 165 }, { x: 520, y: 136 }], label: 'auth & discovery', lx: 466, ly: 153, anchor: 'middle', help: { x: 548, y: 150 } },
      // central registers with coordination (control)
      { kind: 'control', pts: [{ x: 670, y: 280 }, { x: 670, y: 155 }, { x: 585, y: 155 }, { x: 585, y: 136 }], label: 'register', lx: 700, ly: 250, anchor: 'start' },
      // outside app discovers via coordination (control)
      { kind: 'control', pts: [{ x: 150, y: 280 }, { x: 150, y: 96 }, { x: 455, y: 96 }], label: 'discover', lx: 300, ly: 88, anchor: 'middle' },
      // outside app direct data → blocked
      { kind: 'blocked', pts: [{ x: 245, y: 320 }, { x: 300, y: 320 }], label: 'blocked', lx: 272, ly: 306, anchor: 'middle' },
      // outside app data via mesh tunnel
      { kind: 'tunnel', pts: [{ x: 168, y: 360 }, { x: 168, y: 408 }, { x: 670, y: 408 }, { x: 670, y: 360 }], label: 'WireGuard mesh — data', lx: 480, ly: 424, anchor: 'middle', lock: { x: NATX, y: 408 } },
    ],
  };
}

function buildSelfhost(): Strategy {
  const outside = mk('outside', 'outside', COL.OUT, GND, 'Outside app', 'another network', 'outside');
  const apps = mk('apps', 'apps', COL.P, GND, 'Local apps', 'same network', 'you');
  const central = mk('central', 'central', COL.Q, GND, 'Central server', 'in your lab', 'you');
  const coord = mk('coord', 'coordinator', COL.R, GND, 'Coordination server', 'your own', 'you');
  return {
    key: 'selfhost',
    title: 'Fully self-hosted',
    accent: PURPLE,
    readiness: 'Advanced',
    story:
      'You run the central server and your own coordination server, both inside your network. Local apps do auth & discovery (control plane) against your coordinator, then exchange data with the central server. By default there is no path in from outside — the firewall drops it and there is no shared broker. That isolation is the point (air-gapped / CI); reaching in is then your problem to solve.',
    nodes: [outside, apps, central, coord],
    edges: [
      // data: apps → central
      { kind: 'data', pts: [{ x: 525, y: 320 }, { x: 575, y: 320 }], label: 'data', lx: 550, ly: 312, anchor: 'middle' },
      // auth & discovery: apps → coordination (routed above the row)
      { kind: 'control', pts: [{ x: 430, y: 280 }, { x: 430, y: 248 }, { x: 910, y: 248 }, { x: 910, y: 280 }], label: 'auth & discovery', lx: 666, ly: 240, anchor: 'middle', help: { x: 748, y: 240 } },
      // central registers with coordination (control)
      { kind: 'control', pts: [{ x: 765, y: 320 }, { x: 815, y: 320 }], label: 'register', lx: 790, ly: 312, anchor: 'middle' },
      // outside app direct data → blocked
      { kind: 'blocked', pts: [{ x: 245, y: 320 }, { x: 300, y: 320 }], label: 'blocked', lx: 272, ly: 306, anchor: 'middle' },
    ],
  };
}

const STRATEGIES: Strategy[] = [buildPartner(), buildLocal(), buildSelfhost()];

// ── glyphs ────────────────────────────────────────────────────────────────
function Glyph({ kind, color }: { kind: Kind; color: string }) {
  switch (kind) {
    case 'outside':
      return (
        <g stroke={color} fill="none" strokeWidth="2">
          <rect x="0" y="0" width="28" height="19" rx="3" />
          <rect x="-5" y="22" width="38" height="3.5" rx="1.75" fill={color} stroke="none" />
        </g>
      );
    case 'central':
      return (
        <g stroke={color} strokeWidth="2" fill="none">
          <rect x="0" y="0" width="26" height="34" rx="4" />
          <line x1="6" y1="9" x2="20" y2="9" />
          <line x1="6" y1="17" x2="20" y2="17" />
          <circle cx="8" cy="26" r="1.7" fill={color} stroke="none" />
        </g>
      );
    case 'coordinator':
      return (
        <g stroke={color} fill={color}>
          <line x1="13" y1="26" x2="0" y2="9" strokeWidth="2" />
          <line x1="13" y1="26" x2="26" y2="9" strokeWidth="2" />
          <line x1="0" y1="9" x2="26" y2="9" strokeWidth="2" />
          <circle cx="13" cy="26" r="4.5" />
          <circle cx="0" cy="9" r="4" />
          <circle cx="26" cy="9" r="4" />
        </g>
      );
    case 'apps':
      return (
        <g stroke={color} fill="none" strokeWidth="2">
          <rect x="0" y="8" width="17" height="17" rx="3" />
          <rect x="11" y="0" width="17" height="17" rx="3" fill="#0d0d15" />
        </g>
      );
  }
}

const OWNER_LABEL: Record<Owner, string> = {
  you: 'you',
  community: 'Arkitekt community',
  partner: 'partner',
  outside: 'outside your network',
};

function NodeBox({ m, accent }: { m: Node; accent: string }) {
  const isYou = m.owner === 'you';
  const isOutside = m.kind === 'outside';
  const stroke = isOutside ? 'rgba(255,255,255,0.5)' : accent;
  const rx = m.cx - NW / 2;
  const ry = m.cy - NH / 2;
  const glyphColor = isOutside ? 'rgba(255,255,255,0.7)' : accent;
  return (
    <g>
      <text x={rx + NW - 2} y={ry - 7} textAnchor="end" fontFamily={SANS} fontSize="9.5" fontWeight="600" fill={isYou ? accent : MUTED}>
        {OWNER_LABEL[m.owner]}
      </text>
      <rect x={rx} y={ry} width={NW} height={NH} rx="14" fill="rgba(15,15,22,0.92)" stroke={stroke} strokeWidth={isYou ? 2 : 1.5} strokeDasharray={isYou || isOutside ? undefined : '6 5'} />
      <rect x={rx + 16} y={m.cy - 19} width="38" height="38" rx="10" fill={isOutside ? 'rgba(255,255,255,0.08)' : `${accent}26`} />
      <g transform={`translate(${rx + 21}, ${m.cy - (m.kind === 'central' ? 17 : 13)})`}>
        <Glyph kind={m.kind} color={glyphColor} />
      </g>
      <text x={rx + 64} y={m.cy - 3} fontFamily={SANS} fontSize="12.5" fontWeight="700" fill="rgba(255,255,255,0.92)">
        {m.title}
      </text>
      <text x={rx + 64} y={m.cy + 15} fontFamily={SANS} fontSize="10.5" fill="rgba(255,255,255,0.55)">
        {m.sub}
      </text>
    </g>
  );
}

function pointsStr(pts: Pt[]) {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

/** Clickable help marker linking to the Service Discovery page (native SVG tooltip on hover). */
function HelpDot({ x, y }: { x: number; y: number }) {
  return (
    <a href={DISCOVERY_URL} style={{ cursor: 'pointer' }} aria-label="How apps discover the server — read about Service Discovery">
      <title>Each app runs a discovery handshake with the server — learn more about Service Discovery</title>
      <circle cx={x} cy={y} r="9" fill="rgba(125,125,234,0.2)" stroke={INDIGO} strokeWidth="1.4" />
      <text x={x} y={y + 3.4} textAnchor="middle" fontFamily={SANS} fontSize="11.5" fontWeight="700" fill={INDIGO}>
        ?
      </text>
    </a>
  );
}

function EdgeLine({ e }: { e: Edge }) {
  const color = e.kind === 'blocked' ? RED : e.kind === 'control' ? INDIGO : GREEN;
  const last = e.pts[e.pts.length - 1];
  const label = e.label ? (
    <text x={e.lx} y={e.ly} fontFamily={SANS} fontSize="10.5" fontWeight="600" textAnchor={e.anchor ?? 'middle'} fill={color}>
      {e.label}
    </text>
  ) : null;
  const helpDot = e.help ? <HelpDot x={e.help.x} y={e.help.y} /> : null;

  if (e.kind === 'data')
    return (
      <g>
        <polyline points={pointsStr(e.pts)} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinejoin="round" markerEnd="url(#arrowGreen)" />
        {label}
        {helpDot}
      </g>
    );
  if (e.kind === 'control')
    return (
      <g>
        <polyline points={pointsStr(e.pts)} fill="none" stroke={INDIGO} strokeOpacity="0.85" strokeWidth="2" strokeDasharray="2 6" strokeLinejoin="round" markerEnd="url(#arrowIndigo)" />
        {label}
        {helpDot}
      </g>
    );
  if (e.kind === 'blocked')
    return (
      <g>
        <polyline points={pointsStr(e.pts)} fill="none" stroke={RED} strokeWidth="2.5" strokeDasharray="7 6" strokeLinecap="round" strokeLinejoin="round" />
        <g transform={`translate(${last.x}, ${last.y})`} stroke={RED} strokeWidth="3" strokeLinecap="round">
          <line x1="-7" y1="-7" x2="7" y2="7" />
          <line x1="-7" y1="7" x2="7" y2="-7" />
        </g>
        {label}
      </g>
    );
  // tunnel
  return (
    <g>
      <polyline points={pointsStr(e.pts)} fill="none" stroke={GREEN} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity="0.35" filter="url(#wgGlow)" />
      <polyline points={pointsStr(e.pts)} fill="none" stroke={GREEN} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="11 8" />
      {e.lock && (
        <g transform={`translate(${e.lock.x}, ${e.lock.y})`}>
          <circle r="14" fill="#0d0d15" stroke={GREEN} strokeWidth="2" />
          <rect x="-6" y="-1" width="12" height="9" rx="2" fill={GREEN} />
          <path d="M-3.5 -1 V-4 a3.5 3.5 0 0 1 7 0 V-1" fill="none" stroke={GREEN} strokeWidth="1.7" />
        </g>
      )}
      {label}
    </g>
  );
}

function Topology({ s }: { s: Strategy }) {
  return (
    <svg viewBox="0 0 1040 470" className="h-auto w-full min-w-[760px]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="wgGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L7 4 L0 8 z" fill={GREEN} />
        </marker>
        <marker id="arrowIndigo" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L7 4 L0 8 z" fill={INDIGO} />
        </marker>
      </defs>

      {/* internet band (top, public only) */}
      <text x="40" y="40" fontFamily={SANS} fontSize="11" fontWeight="700" letterSpacing="2" fill={MUTED}>
        INTERNET · PUBLIC
      </text>

      {/* local network zone behind NAT */}
      <rect x={NATX} y={NATY} width={LABW} height="240" rx="18" fill="rgba(127,201,155,0.05)" stroke={GREEN} strokeOpacity="0.4" strokeWidth="1.5" />
      <text x={NATX + 18} y={NATY + 26} fontFamily={SANS} fontSize="11" fontWeight="700" letterSpacing="2" fill="rgba(255,255,255,0.5)">
        YOUR LAB · LOCAL NETWORK
      </text>

      {/* NAT tag on the lab's top edge */}
      <g transform={`translate(${NATX + LABW / 2 - 58}, ${NATY})`}>
        <rect x="0" y="-11" width="116" height="22" rx="11" fill="#0d0d15" stroke="rgba(255,255,255,0.16)" />
        <g transform="translate(14,0)" stroke="rgba(255,255,255,0.55)" fill="none" strokeWidth="1.6">
          <rect x="-1" y="-3.5" width="9" height="7" rx="1.5" fill="rgba(255,255,255,0.55)" stroke="none" />
          <path d="M1 -3.5 V-6 a2.5 2.5 0 0 1 5 0 V-3.5" />
        </g>
        <text x="28" y="4" fontFamily={SANS} fontSize="9" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,0.55)">
          NAT / FIREWALL
        </text>
      </g>

      {/* edges under nodes */}
      {s.edges.map((e, i) => (
        <EdgeLine key={i} e={e} />
      ))}
      {s.nodes.map((m) => (
        <NodeBox key={m.id} m={m} accent={s.accent} />
      ))}
    </svg>
  );
}

const PARAM = 'deploy';
const DEFAULT = Math.max(0, STRATEGIES.findIndex((s) => s.key === 'local'));

export function DeploymentStrategies() {
  const [active, setActive] = React.useState(DEFAULT);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = new URLSearchParams(window.location.search).get(PARAM);
    const idx = STRATEGIES.findIndex((s) => s.key === key);
    if (idx >= 0) setActive(idx);
  }, []);

  const select = React.useCallback((idx: number) => {
    setActive(idx);
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM, STRATEGIES[idx].key);
      window.history.replaceState({}, '', url);
    } catch {
      /* ignore */
    }
  }, []);

  const s = STRATEGIES[active];

  return (
    <figure className="not-prose my-8">
      <div
        className="rounded-3xl p-4 sm:p-6"
        style={{
          background: 'radial-gradient(120% 120% at 50% 0%, #14141f 0%, #08080c 70%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Deployment strategies">
          {STRATEGIES.map((st, i) => {
            const on = i === active;
            return (
              <button
                key={st.key}
                role="tab"
                aria-selected={on}
                onClick={() => select(i)}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors"
                style={{
                  border: `1.5px solid ${on ? st.accent : 'rgba(255,255,255,0.12)'}`,
                  background: on ? `${st.accent}1f` : 'transparent',
                  color: on ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
              >
                <span className="size-2.5 rounded-full" style={{ background: st.accent }} />
                {st.title}
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${st.accent}22`, color: st.accent }}>
                  {st.readiness}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <Topology s={s} />
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-[13px] leading-relaxed text-white/65">{s.story}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-white/50">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-6 border-t-[3px] border-solid" style={{ borderColor: GREEN }} /> data plane (workload)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-6 border-t-2 border-dotted" style={{ borderColor: INDIGO }} /> control plane · auth &amp; discovery
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-6 border-t-[3px] border-dashed" style={{ borderColor: RED }} /> blocked (non-happy path)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-6 border-t-[3px] border-dashed" style={{ borderColor: GREEN }} /> WireGuard mesh tunnel (data)
          </span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-fd-muted-foreground">
        Pick a strategy. The top band is the public internet; your lab sits behind NAT. The outside
        app is a device on another network — watch what reaches it and what doesn’t.
      </figcaption>
    </figure>
  );
}
