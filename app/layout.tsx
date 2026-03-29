import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import { SkinProvider } from '@/components/providers/SkinProvider';
import { loadGlobalLcdTuningBootstrap } from '@/lib/lcd-tuning-repository';
import { DEFAULT_UI_SKIN, getUiSkinInitScript } from '@/lib/ui-skin';

export const metadata: Metadata = {
  title: 'Workout App',
  description: 'Minimal workout app starter',
  applicationName: 'Workout App',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Workout App'
  },
  other: {
    'mobile-web-app-capable': 'yes'
  }
};

export const viewport: Viewport = {
  themeColor: '#bcc777'
};

export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const initialLcdTuning = await loadGlobalLcdTuningBootstrap();

  return (
    <html lang="en" data-skin={DEFAULT_UI_SKIN} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getUiSkinInitScript({
              initialLcdTuning: initialLcdTuning.values,
              preferInitialLcdTuning: initialLcdTuning.isAuthoritative
            })
          }}
        />
      </head>
      <body>
        <SkinProvider
          initialLcdTuning={initialLcdTuning.values}
          preferInitialLcdTuning={initialLcdTuning.isAuthoritative}
        >
          {children}
        </SkinProvider>
      </body>
    </html>
  );
}
