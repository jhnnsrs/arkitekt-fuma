'use client';

import type { ComponentProps } from 'react';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { Connector } from '@/components/arkitekt/connector-client';

// Drop-in replacement for Fumadocs' `themeSwitch` slot that renders the
// Arkitekt connector (login / account) right next to the GitHub icon and the
// theme toggle in the sidebar's bottom control row.
export function ThemeSwitchWithConnector({
  className,
  ...props
}: ComponentProps<typeof ThemeSwitch>) {
  return (
    <div className="ms-auto flex items-center gap-0.5">
      <Connector />
      <ThemeSwitch className={className} {...props} />
    </div>
  );
}
