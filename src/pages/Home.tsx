import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Plus } from 'lucide-react';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { CourseModal } from '../components/CourseModal';

export const Home = () => {
  const { user, isAdmin } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  const fetchCourses = async () => {
    try {
      setErrorMsg(null);
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId
      );
      // Sort alphabetically
      const sorted = res.documents.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setCourses(sorted);
    } catch (error: any) {
      console.error('Error fetching courses', error);
      
      let errorMessage = error?.message || 'Failed to fetch';
      
      // Check if it's a network/CORS error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network Error / CORS Blocked. Appwrite is rejecting the connection from this URL.';
      }
      
      setErrorMsg(errorMessage);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(c => 
    c.name.includes(search) || c.number.includes(search)
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as const;

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center pt-32" dir="rtl">
      <motion.div 
        initial={{ top: '40%', left: '50%', x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
        animate={{ top: '10%', left: '50%', x: '-50%', y: '-50%', scale: 0.8, opacity: 0 }}
        transition={{ delay: 1, duration: 0.8, ease: "easeInOut" }}
        className="fixed z-40 pointer-events-none"
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400 drop-shadow-sm whitespace-nowrap">
          Mr.Summaries
        </h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-3xl z-30 mt-12"
      >
        <div className="relative group">
          <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 mr-3" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-4 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl leading-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg transition-all shadow-sm group-hover:shadow-md"
            placeholder="חיפוש קורסים וסיכומים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-6 flex justify-end"
          >
            <button 
              onClick={() => setIsCourseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              הוסף קורס
            </button>
          </motion.div>
        )}

        <div className="mt-12 space-y-8 pb-32">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-md border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400"
            >
              <p className="font-bold mb-1">שגיאת התחברות ל-Appwrite:</p>
              <p className="font-mono text-sm" dir="ltr">{errorMsg}</p>
              <div className="mt-4 text-sm">
                <p>אם השגיאה היא <strong>Failed to fetch</strong>, עליך להוסיף את כתובת האתר כ-Web Platform ב-Appwrite:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>היכנס ל-Appwrite ולחץ על הפרויקט שלך</li>
                  <li>גלול מטה ל-<strong>Platforms</strong> ולחץ על <strong>Add Platform</strong> &gt; <strong>Web App</strong></li>
                  <li>ב-Hostname, הדבק בדיוק את הכתובת הבאה (ללא https://):</li>
                  <li className="font-mono bg-white/50 dark:bg-black/50 p-2 rounded mt-1 select-all" dir="ltr">
                    ais-dev-i6hevv7iipjk7f3pakdyhh-239663300019.europe-west1.run.app
                  </li>
                </ol>
              </div>
            </motion.div>
          )}

          {user && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                הקורסים שלי
              </h2>
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {courses.filter(c => localStorage.getItem(`enrolled_${c.$id}`)).length > 0 ? (
                  courses.filter(c => localStorage.getItem(`enrolled_${c.$id}`)).map((course) => (
                    <motion.div key={course.$id} variants={itemVariants}>
                      <Link 
                        to={`/course/${course.$id}`}
                        className="block group p-6 rounded-2xl bg-indigo-50/80 dark:bg-indigo-900/20 backdrop-blur-md border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                            {course.name}
                          </h3>
                          <span className="text-xs font-mono bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">
                            {course.number}
                          </span>
                        </div>
                        <p className="text-indigo-600/70 dark:text-indigo-300/70 text-sm line-clamp-2">
                          לחץ לצפייה בסילבוס, סיכומים, הגדרות ומשפטים.
                        </p>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-100/50 dark:border-slate-700/50 shadow-sm opacity-60 col-span-full">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">אין קורסים רשומים עדיין.</p>
                  </motion.div>
                )}
              </motion.div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-slate-400" />
              כל הקורסים
            </h2>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredCourses.map((course) => (
                <motion.div key={course.$id} variants={itemVariants}>
                  <Link 
                    to={`/course/${course.$id}`}
                    className="block group p-6 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-100/50 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {course.name}
                      </h3>
                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                        {course.number}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                      לחץ לצפייה בסילבוס, סיכומים, הגדרות ומשפטים.
                    </p>
                  </Link>
                </motion.div>
              ))}
              {filteredCourses.length === 0 && (
                <motion.div variants={itemVariants} className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
                  לא נמצאו קורסים התואמים את החיפוש.
                </motion.div>
              )}
            </motion.div>
          </section>
        </div>
      </motion.div>

      <CourseModal 
        isOpen={isCourseModalOpen} 
        onClose={() => setIsCourseModalOpen(false)} 
        onSave={fetchCourses} 
      />
    </div>
  );
};
