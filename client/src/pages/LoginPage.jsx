import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import * as authApi from '../api/auth.api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { Trophy } from 'lucide-react';

const schema = z.object({
  phoneNumber: z.string().min(1, 'Phone required'),
  password: z.string().min(1, 'Password required'),
});

function BracketGraphic() {
  return (
    <svg
      className="mx-auto max-w-md opacity-40"
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="8" y="24" width="72" height="36" rx="6" stroke="#E8392A" strokeWidth="1.5" />
      <rect x="8" y="100" width="72" height="36" rx="6" stroke="#E8392A" strokeWidth="1.5" />
      <rect x="240" y="62" width="72" height="36" rx="6" stroke="#F97316" strokeWidth="1.5" />
      <path d="M80 42 H140 V80 H240" stroke="#242424" strokeWidth="1.5" />
      <path d="M80 118 H140 V80" stroke="#242424" strokeWidth="1.5" />
      <circle cx="160" cy="80" r="6" fill="#E8392A" opacity="0.6" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithResponse } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await authApi.login(data);
      loginWithResponse(res);
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-brand-bg px-8 py-16 shadow-glow-red">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(232,57,42,0.35), transparent 50%)',
          }}
        />
        <div className="noise-bg absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto max-w-md text-center md:text-left">
          <div className="mb-8 flex items-center justify-center gap-2 md:justify-start">
            <Trophy className="h-12 w-12 text-brand-red" />
            <span className="font-display text-3xl font-black text-brand-light">OGP</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-light">Elite mobile esports</h2>
          <p className="mt-3 text-brand-muted">Brackets, streams, and verified results — one platform.</p>
          <div className="mt-12 hidden md:block">
            <BracketGraphic />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-brand-surface px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-brand-light">Sign in</h1>
          <div className="mt-3 h-1 w-16 bg-brand-red" />
          <p className="mt-6 text-sm text-brand-muted">
            New here?{' '}
            <Link to="/register" className="font-semibold text-brand-orange hover:underline">
              Create account
            </Link>
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
            <Input label="Phone number" {...register('phoneNumber')} error={errors.phoneNumber?.message} />
            <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? <LoadingSpinner className="mx-auto !border-t-white" size="sm" /> : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
