import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './Sidebar.jsx';

const AUTH_PATHS = ['/login', '/register'];

export function Layout() {
  const { pathname } = useLocation();
  const authOnly = AUTH_PATHS.some((p) => pathname === p);

  if (authOnly) {
    return (
      <>
        <Outlet />
        <Toaster
          position="top-center"
          toastOptions={{
            className: '!bg-brand-card !text-brand-light !border !border-brand-border',
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar />
      <div className="min-h-screen pb-20 md:ml-[72px] md:pb-0">
        <Outlet />
      </div>
      <Toaster
        position="top-center"
        toastOptions={{
          className: '!bg-brand-card !text-brand-light !border !border-brand-border',
        }}
      />
    </div>
  );
}
