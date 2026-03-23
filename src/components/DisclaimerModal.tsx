import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation } from 'react-router-dom';

export const DisclaimerModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();
  const isGuest = localStorage.getItem('isGuest') === 'true';

  useEffect(() => {
    const hasSeenDisclaimer = sessionStorage.getItem('hasSeenDisclaimer');
    const isAuthPage = location.pathname === '/login';
    
    if (!hasSeenDisclaimer && !isAuthPage && (user || isGuest)) {
      setIsOpen(true);
    }
  }, [user, isGuest, location.pathname]);

  const handleClose = () => {
    sessionStorage.setItem('hasSeenDisclaimer', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">שימו לב</h2>
              </div>
              
              <div className="space-y-4 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                <p className="font-medium text-lg">
                  בסיכומים עלול להופיע מידע לא מדוייק והשימוש בסיכומים הוא על אחריותכם בלבד.
                </p>
                <p>
                  במידה ומצאתם טעות או יש משהו שברצונכם להוסיף, מוזמנים לפנות אלי במייל{' '}
                  <a 
                    href="mailto:shaked.levnat@gmail.com" 
                    className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                  >
                    shaked.levnat@gmail.com
                  </a>.
                </p>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleClose}
                  className="w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-cyan-600/20 active:scale-[0.98]"
                >
                  הבנתי, המשך לאתר
                </button>
              </div>
            </div>
            
            <button 
              onClick={handleClose}
              className="absolute top-4 left-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
