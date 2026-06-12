import type { Metadata } from 'next';
import NavBar from './NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'BorderPass Content Studio',
  description: 'Automated content creation for BorderPass — powered by Claude',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <NavBar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
