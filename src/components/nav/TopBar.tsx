import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthProvider';

type UserLike = { email?: string; user_metadata?: Record<string, any> } | null;

export default function TopBar() {
  const { user, loading } = useAuth() as { user: UserLike, loading: boolean };

  const firstName = useMemo(() => {
    const meta = user?.user_metadata || {};
    const full = (meta.full_name || meta.name || '').trim();
    const first = meta.first_name || (full ? full.split(' ')[0] : '');
    if (first) return first;
    const email = user?.email || '';
    return email ? (email.split('@')[0] || 'there') : '';
  }, [user]);

  const rawLogo = 'Annes Quiz.png';
  const logoSrc = `${import.meta.env.BASE_URL}${encodeURIComponent(rawLogo)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-900/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="relative inline-grid place-items-center">
            <img
              src={logoSrc}
              alt="Anne's Quiz"
              className="w-7 h-7 object-contain"
              onError={(e)=>{(e.currentTarget.style.display='none'); const n=e.currentTarget.nextElementSibling as HTMLElement|null; if(n) n.style.display='grid';}}
            />
            <span style={{display:'none'}} className="w-7 h-7 rounded-md bg-pink-600 text-white text-xs font-bold place-items-center">AQ</span>
          </span>
          <span className="text-lg font-semibold text-pink-200">Anne&apos;s Quiz</span>
        </Link>
        <div className="flex items-center gap-3">
          <a href="/console" className="px-3 py-1.5 rounded-lg border text-sm hover:bg-white/10">Console</a>
          <span className="hidden sm:inline text-sm text-pink-200/90">{user ? `Welcome ${firstName}` : ''}</span>
          {loading ? (
            <span className="inline-block h-[30px] w-[110px] rounded-lg bg-white/10 animate-pulse" />
          ) : (
            <Link to={user ? '/dashboard' : '/login'} className="px-3 py-1.5 rounded-lg bg-pink-600 text-white text-sm hover:bg-pink-700">
              {user ? 'My dashboard' : 'Sign in'}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
