import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto py-3 bg-white border-top text-center text-muted small">
      <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <ShieldCheck size={18} className="text-success" />
          <span>NACOS Electoral Commission &bull; Official Electronic Ballot System</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <span>&copy; {currentYear} Nigeria Association of Computing Students.</span>
        </div>
      </div>
    </footer>
  );
}
