import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'MachinaMind 16:9 Studio',
  description: 'Long-form 16:9 documentary video studio for schema v7 JSON synchronization, artwork matching, custom subtitles, FFmpeg MP4 export, and YouTube publishing metadata.',
  openGraph: {
    title: 'MachinaMind 16:9 Studio',
    description: 'Long-form 16:9 documentary video studio for schema v7 JSON synchronization, artwork matching, custom subtitles, FFmpeg MP4 export, and YouTube publishing metadata.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MachinaMind 16:9 Studio',
    description: 'Long-form 16:9 documentary video studio for schema v7 JSON synchronization, artwork matching, custom subtitles, FFmpeg MP4 export, and YouTube publishing metadata.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
