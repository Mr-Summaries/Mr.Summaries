import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Moon, Sun, LogOut, User, Mail, AlertTriangle } from 'lucide-react';
import { InteractiveBackground } from './InteractiveBackground';
import { AnimatePresence, motion } from 'motion/react';
import { DisclaimerModal } from './DisclaimerModal';

export const Layout = () => {
  const { user, logout, isLoading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Ensure DOM is synced with store on mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (!isLoading && !user && !localStorage.getItem('isGuest') && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">טוען...</div>;
  }

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative flex flex-col" dir="rtl">
      <InteractiveBackground />
      <DisclaimerModal />
      <header className="fixed top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-200/80 dark:bg-zinc-950/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-500 to-emerald-400 bg-clip-text text-transparent">
              Mr.Summaries
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-800/50 transition-colors">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-800/50 transition-colors">
                  <User className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-medium hidden sm:inline-block">{user.name || user.email}</span>
                </Link>
                <button onClick={logout} className="p-2 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-800/50 transition-colors text-red-500" title="התנתקות">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors text-sm font-medium shadow-lg shadow-cyan-600/20">
                <User className="w-4 h-4" />
                התחברות
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 pt-24 pb-20 relative flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative border-t border-zinc-200 dark:border-zinc-800/50 bg-zinc-200/50 dark:bg-black/40 backdrop-blur-md py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="flex justify-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              בסיכומים עלול להופיע מידע לא מדוייק והשימוש בסיכומים הוא על אחריותכם בלבד.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <p>במידה ומצאתם טעות או יש משהו שברצונכם להוסיף, מוזמנים לפנות אלי במייל:</p>
              <a 
                href="mailto:shaked.levnat@gmail.com" 
                className="flex items-center gap-1 text-cyan-400 font-semibold hover:underline"
              >
                <Mail className="w-3 h-3" />
                shaked.levnat@gmail.com
              </a>
            </div>
            <div className="pt-4">
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
