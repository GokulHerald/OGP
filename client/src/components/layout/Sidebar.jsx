import { NavLink, Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  House,
  Trophy,
  BarChart2,
  User,
  Settings2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

const mainNav = [
  { to: '/', icon: House, label: 'Home', end: true },
  { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { to: '/leaderboard', icon: BarChart2, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile' },
];

function DesktopNavLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex h-11 w-full items-center gap-3 rounded-lg px-3 transition-colors',
          isActive ? 'bg-brand-subtle text-brand-light' : 'text-brand-muted hover:bg-brand-subtle/60 hover:text-brand-light'
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[160px] group-hover:opacity-100">
        {label}
      </span>
    </NavLink>
  );
}

function MobileNavLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium',
          isActive ? 'text-brand-red' : 'text-brand-muted'
        )
      }
    >
      <Icon className="h-6 w-6" strokeWidth={1.75} />
      <span className="truncate px-0.5">{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const { user, isAuthenticated, isOrganizer, logout } = useAuth();

  return (
    <>
      <aside
        className={clsx(
          'group fixed left-0 top-0 z-40 hidden h-full w-[72px] flex-col border-r border-[#1A1A1A] bg-[#0A0A0A] transition-[width] duration-300 ease-out hover:w-[220px] md:flex'
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-[#1A1A1A] px-3">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <Trophy className="h-8 w-8 shrink-0 text-brand-red" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap font-display text-xl font-black tracking-tight text-brand-light opacity-0 transition-all duration-300 group-hover:max-w-[100px] group-hover:opacity-100">
              OGP
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 pt-4">
          {mainNav.map((item) => (
            <DesktopNavLink key={item.to} {...item} />
          ))}
          {isOrganizer ? (
            <DesktopNavLink to="/dashboard" icon={Settings2} label="Dashboard" />
          ) : null}
        </nav>

        <div className="shrink-0 border-t border-[#1A1A1A] p-2">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-hidden rounded-lg px-1 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-red to-brand-orange text-xs font-bold text-white">
                  {(user?.username || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100">
                  <p className="truncate text-sm font-medium text-brand-light">{user?.username}</p>
                  <p className="truncate text-xs capitalize text-brand-muted">{user?.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-brand-muted transition-colors hover:bg-brand-subtle hover:text-brand-light"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[100px] group-hover:opacity-100">
                  Log out
                </span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-brand-red hover:bg-brand-subtle"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-[#1A1A1A] bg-[#0A0A0A]/95 backdrop-blur-md md:hidden">
        {mainNav.map((item) => (
          <MobileNavLink key={item.to} {...item} />
        ))}
        {isOrganizer ? <MobileNavLink to="/dashboard" icon={Settings2} label="Dash" /> : null}
      </nav>
    </>
  );
}
