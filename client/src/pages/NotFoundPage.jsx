import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-black text-gradient">404</p>
      <h1 className="mt-4 font-display text-2xl font-black uppercase text-brand-light">Page not found</h1>
      <p className="mt-2 text-brand-muted">The page you’re looking for doesn’t exist or was moved.</p>
      <Link
        to="/"
        className="btn-primary mt-8 inline-flex items-center justify-center rounded-lg"
      >
        Back home
      </Link>
    </div>
  );
}
