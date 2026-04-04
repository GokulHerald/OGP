import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as authApi from '../api/auth.api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { User } from 'lucide-react';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('profilePicture', file);
    setUploading(true);
    try {
      await authApi.updateProfilePicture(fd);
      toast.success('Profile picture updated');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-3xl font-black uppercase tracking-tight text-brand-light">Profile</h1>
      <div className="card-surface mt-8 flex flex-col items-center p-8 text-center">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-brand-border bg-brand-subtle">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12 text-brand-muted" />
          )}
        </div>
        <p className="mt-4 font-display text-xl font-semibold text-brand-light">{user?.username}</p>
        <p className="text-sm text-brand-muted">{user?.phoneNumber}</p>
        <Badge variant={user?.role === 'organizer' ? 'orange' : 'green'} className="mt-2 capitalize">
          {user?.role || 'player'}
        </Badge>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <LoadingSpinner className="mx-auto !border-t-white" size="sm" /> : 'Change photo'}
        </Button>
      </div>
    </div>
  );
}
