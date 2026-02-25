import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TopNav() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUser(data.admin || null);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const links = [
    { label: 'Home', href: '/', show: () => true },
    { label: 'Submit story', href: '/submit', show: () => true },
    {
      label: 'Admin dashboard',
      href: '/admin/dashboard',
      show: () => user && (user.role === 'admin' || user.role === 'moderator'),
    },
    {
      label: 'Admin setup',
      href: '/admin/setup',
      show: () => user && user.role === 'admin',
    },
    {
      label: 'Admin login',
      href: '/admin/login',
      show: () => !user,
    },
  ];

  // Avoid layout shift: render nav even before check finishes
  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        {links
          .filter((link) => link.show())
          .map((link) => (
            <Link key={link.href} href={link.href} className="top-nav-link">
              {link.label}
            </Link>
          ))}
      </div>
    </nav>
  );
}

