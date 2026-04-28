import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { BRAND } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
