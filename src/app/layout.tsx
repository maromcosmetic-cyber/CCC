import type { Metadata } from 'next';
import './globals.css';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'CCC eCommerce Command Center',
  description: 'Production-grade eCommerce control center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ProjectProvider>
          {children}
          <Toaster />
        </ProjectProvider>
      </body>
    </html>
  );
}
