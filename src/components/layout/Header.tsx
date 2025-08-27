import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, Settings, LogOut, Plus, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import ThemeToggle from '../theme/ThemeToggle';

export function Header() {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const initials = ((user as any)?.user_metadata?.full_name || user?.email || 'U')
    .split(' ')
    .map((p: string) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <header className="w-full border-b bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-gray-900/40">
      <div className="container flex h-14 items-center gap-3">
        {/* Left: Logo + Brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/Annes Quiz.png" alt="Anne's Quiz" className="h-7 w-7 rounded-sm object-contain" />
          <span className="font-semibold text-primary">Anne&apos;s Quiz</span>
        </Link>

        {/* Center: Primary Nav (desktop) */}
        <nav className="mx-auto hidden md:flex items-center gap-1 text-sm">
          <Link to="/" className="px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/console" className="px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2">
            <Settings className="h-4 w-4" /> Console
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Link to="/console" className="hidden sm:inline-flex px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800">
            <Plus className="mr-1 h-4 w-4" /> New Quiz
          </Link>

          {/* Mobile menu toggle */}
          <button type="button" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button type="button" className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label="Open account menu">
                <span className="text-xs font-bold">{initials}</span>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded border bg-white dark:bg-gray-900 shadow-lg z-40">
                  <div className="px-3 py-2 text-xs text-gray-500">{(user as any)?.user_metadata?.full_name || user.email}</div>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => { setIsMenuOpen(false); navigate('/'); }}>
                    <LayoutGrid className="h-4 w-4" /> Dashboard
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => { setIsMenuOpen(false); navigate('/console'); }}>
                    <Settings className="h-4 w-4" /> Console
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => { setIsMenuOpen(false); navigate('/account'); }}>
                    <User className="h-4 w-4" /> Account
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={async () => { setIsMenuOpen(false); try { const { supabase } = await import('../../lib/supabaseClient'); await supabase().auth.signOut({ scope: 'local' as any }); } catch {} }}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800">Sign in</Link>
              <Link to="/signup" className="hidden sm:inline-flex px-3 py-2 rounded bg-primary text-white hover:opacity-90">Sign up</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container py-2 grid gap-2">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded border inline-flex items-center gap-2"><LayoutGrid className="h-4 w-4"/> Dashboard</Link>
            <Link to="/console" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded border inline-flex items-center gap-2"><Settings className="h-4 w-4"/> Console</Link>
            {!user && (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded border">Sign in</Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded bg-primary text-white">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
