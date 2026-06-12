'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/', label: 'Intelligence', num: 1 },
  { href: '/topics', label: 'Topics', num: 2 },
];

export default function NavBar() {
  const pathname = usePathname();

  const activeStep =
    pathname.startsWith('/topic/') ? 3
    : pathname === '/topics' ? 2
    : 1;

  return (
    <header className="app-header">
      <Link href="/" className="app-header-brand">
        <img
          src="/logos/borderpass_logo_horizontal_light.svg"
          alt="BorderPass"
          style={{ height: 26, width: 'auto' }}
        />
        <span className="app-header-badge">Content Studio</span>
      </Link>

      <nav className="app-flow-nav">
        {STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className={`app-flow-step ${activeStep === step.num ? 'active' : ''} ${activeStep > step.num ? 'done' : ''}`}
          >
            <span className="app-flow-num">{step.num}</span>
            {step.label}
          </Link>
        ))}
        <span className={`app-flow-step ${activeStep === 3 ? 'active' : ''}`} style={{ cursor: 'default' }}>
          <span className="app-flow-num">3</span>
          Content Studio
        </span>
      </nav>

      <div className="app-header-right" />
    </header>
  );
}
