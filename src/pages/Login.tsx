import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, UserPlus } from 'lucide-react';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || (isLogin ? 'שגיאה בהתחברות' : 'שגיאה בהרשמה'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-100/50 dark:border-slate-800/50 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            {isLogin ? 'ברוכים הבאים' : 'יצירת משתמש חדש'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isLogin ? 'התחברו כדי לשמור קורסים ולערוך סיכומים' : 'הירשמו כדי לשמור קורסים ולערוך סיכומים'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm text-center border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">שם מלא</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 mr-3" />
                </div>
                <input
                  type="text"
                  required={!isLogin}
                  className="block w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all text-slate-900 dark:text-slate-50"
                  placeholder="ישראל ישראלי"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">אימייל</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400 mr-3" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all text-slate-900 dark:text-slate-50"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">סיסמה</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 mr-3" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all text-slate-900 dark:text-slate-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (isLogin ? 'מתחבר...' : 'נרשם...') : (isLogin ? 'התחברות' : 'הרשמה')}
            {isLogin ? <ArrowRight className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
          >
            {isLogin ? 'אין לכם חשבון? הירשמו כאן' : 'כבר יש לכם חשבון? התחברו כאן'}
          </button>
        </div>

        <div className="mt-8 text-center pt-6 border-t border-slate-200 dark:border-slate-800">
          <button 
            type="button"
            onClick={() => {
              localStorage.setItem('isGuest', 'true');
              navigate('/');
            }}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            המשך כאורח
          </button>
        </div>
      </div>
    </div>
  );
};
