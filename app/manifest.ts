import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Workout App',
    short_name: 'Workout',
    description: 'Minimal workout app starter',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    background_color: '#bcc777',
    theme_color: '#bcc777',
    icons: [
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  };
}
