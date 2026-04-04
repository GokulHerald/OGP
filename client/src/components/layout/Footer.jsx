import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-brand-border bg-brand-card/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p className="text-sm text-brand-muted">© {new Date().getFullYear()} Online Gaming Platform</p>
        <div className="flex gap-6 text-sm text-brand-muted">
          <Link to="/tournaments" className="hover:text-brand-light">
            Tournaments
          </Link>
          <Link to="/login" className="hover:text-brand-light">
            Account
          </Link>
        </div>
      </div>
    </footer>
  );
}
