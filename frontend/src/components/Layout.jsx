import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

// Sidebar na may hamburger button para sa maliit na screen.
// Idagdag dito ang link ng bagong page sa listahang ito.
const links = [
  { to: '/browse', label: 'Browse equipment' },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <button className="hamburger" aria-label="Menu" onClick={() => setOpen(!open)}>
          &#9776;
        </button>
        <span className="brand">AGRILEASE</span>
      </header>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">AGRILEASE</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
