import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { User, Mail, Shield, BookOpen, Trash2, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export const Profile = () => {
  const { user, isAdmin, updateName, updateEmail } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState(''); // Needed for email update
  
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.coursesCollectionId
        );
        const enrolled = res.documents.filter(c => localStorage.getItem(`enrolled_${c.$id}`));
        setEnrolledCourses(enrolled);
      } catch (error) {
        console.error('Error fetching courses', error);
      }
    };
    fetchCourses();
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingName(true);
    setMessage({ text: '', type: '' });
    try {
      await updateName(name);
      setMessage({ text: 'השם עודכן בהצלחה', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'שגיאה בעדכון השם', type: 'error' });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setMessage({ text: 'יש להזין סיסמה כדי לעדכן אימייל', type: 'error' });
      return;
    }
    setIsUpdatingEmail(true);
    setMessage({ text: '', type: '' });
    try {
      await updateEmail(email, password);
      setMessage({ text: 'האימייל עודכן בהצלחה', type: 'success' });
      setPassword('');
    } catch (error: any) {
      setMessage({ text: error.message || 'שגיאה בעדכון האימייל', type: 'error' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const removeCourse = (courseId: string) => {
    localStorage.removeItem(`enrolled_${courseId}`);
    setEnrolledCourses(prev => prev.filter(c => c.$id !== courseId));
  };

  if (!user) {
    return <div className="text-center py-12">יש להתחבר כדי לצפות בפרופיל.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">הפרופיל שלי</h1>
          <div className="flex items-center gap-2 mt-2">
            <Shield className={`w-4 h-4 ${isAdmin ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span className={`text-sm font-medium ${isAdmin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              סטטוס: {isAdmin ? 'מנהל מערכת' : 'משתמש רגיל'}
            </span>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Update Name */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            עדכון פרטים
          </h2>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם מלא</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingName || name === user.name}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {isUpdatingName ? 'שומר...' : 'שמור שם'}
            </button>
          </form>
        </motion.div>

        {/* Update Email */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            עדכון אימייל
          </h2>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">אימייל חדש</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">סיסמה נוכחית (לאימות)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingEmail || !password || email === user.email}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {isUpdatingEmail ? 'שומר...' : 'שמור אימייל'}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Manage Courses */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm"
      >
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          ניהול קורסים
        </h2>
        
        {enrolledCourses.length > 0 ? (
          <div className="space-y-4">
            {enrolledCourses.map(course => (
              <div key={course.$id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div>
                  <Link to={`/course/${course.$id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {course.name}
                  </Link>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{course.number}</div>
                </div>
                <button
                  onClick={() => removeCourse(course.$id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="הסר קורס"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">לא נרשמת לאף קורס עדיין.</p>
        )}
      </motion.div>
    </div>
  );
};
