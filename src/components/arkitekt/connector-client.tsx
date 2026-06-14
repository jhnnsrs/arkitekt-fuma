'use client';
import dynamic from 'next/dynamic';

// Client-only: the Connector touches localStorage and builds Apollo/ws clients
// on mount, so it must never run during the static prerender.
export const Connector = dynamic(
  () => import('@/components/arkitekt/connector').then((m) => m.Connector),
  { ssr: false, loading: () => null },
);
