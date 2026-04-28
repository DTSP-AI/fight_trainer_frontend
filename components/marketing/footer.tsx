import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:px-8">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{BRAND.name}</span>
          <span>·</span>
          <span>{BRAND.domain}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/auth/login" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
