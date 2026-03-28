import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '@/app/globals.css';
import type { Metadata } from 'next';
import { SkinProvider } from '@/components/providers/SkinProvider';
import { DEFAULT_UI_SKIN, getUiSkinInitScript } from '@/lib/ui-skin';

export const metadata: Metadata = {
  title: 'Workout App',
  description: 'Minimal workout app starter'
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" data-skin={DEFAULT_UI_SKIN} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getUiSkinInitScript() }} />
      </head>
      <body>
        <SkinProvider>{children}</SkinProvider>
      </body>
    </html>
  );
}
