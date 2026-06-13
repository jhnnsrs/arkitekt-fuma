import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Atom, BookOpen, Network, Newspaper, Sparkles } from 'lucide-react';
import { BrandColorPicker } from '@/components/brand-color';
import { Logo } from '@/components/logo';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: (
        <>
          <Logo className="size-6" />
          <span className="font-semibold">{appName}</span>
        </>
      ),
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
        icon: <BookOpen />,
      },
      {
        text: 'Blog',
        url: '/blog',
        active: 'nested-url',
        icon: <Newspaper />,
      },
      {
        text: 'Explorer',
        url: '/explorer',
        active: 'nested-url',
        icon: <Network />,
      },
      {
        text: 'Showcase',
        url: '/showcase',
        active: 'nested-url',
        icon: <Sparkles />,
      },
      {
        text: 'Shoulders of Giants',
        url: '/giants',
        active: 'nested-url',
        icon: <Atom />,
      },
      {
        type: 'custom',
        secondary: true,
        children: <BrandColorPicker />,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
