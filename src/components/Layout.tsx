import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import { InteractiveBackground } from './InteractiveBackground';
import { AnimatePresence, motion } from 'motion/react';

export const Layout = () => {
  const { user, logout, isLoading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user && !localStorage.getItem('isGuest') && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">טוען...</div>;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-300 relative overflow-hidden" dir="rtl">
      <InteractiveBackground />
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              Mr.Summaries
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium hidden sm:inline-block">{user.name || user.email}</span>
                </Link>
                <button onClick={logout} className="p-2 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-red-500" title="התנתקות">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium shadow-lg shadow-indigo-600/20">
                <User className="w-4 h-4" />
                התחברות
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 relative z-10">
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
    </div>
  );
};
