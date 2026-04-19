import { useEffect, useState, useMemo, useDeferredValue, useCallback } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Plus, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { CourseModal } from '../components/CourseModal';

const Home = () => {
  const { user, isAdmin } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setErrorMsg(null);
      const res = await api.getCourses();
      // Sort alphabetically
      const sorted = res.documents.sort((a: any, b: any) => a.name.localeCompare(b.name, 'he'));
      setCourses(sorted);

      // Fetch enrollments if user is logged in
      if (user) {
        try {
          const enrollRes = await api.getEnrollments(user.$id);
          const ids = enrollRes.documents.map((e: any) => e.courseID);
          const map: Record<string, string> = {};
          enrollRes.documents.forEach((e: any) => {
            map[e.courseID] = e.$id;
          });
          setEnrolledCourseIds(ids);
          setEnrollments(map);
        } catch (e: any) {
          console.error('Error fetching enrollments', e);
          // If it's a 404 or index error, show a more helpful message in console
          if (e.code === 404) {
            console.warn('Collection "enrollments" not found. Check your collection ID.');
          } else if (e.message?.includes('index')) {
            console.warn('Missing index for "userID" in "enrollments" collection. Create it in Appwrite Console.');
          }
          setEnrolledCourseIds([]);
          setEnrollments({});
        }
      } else {
        setEnrolledCourseIds([]);
        setEnrollments({});
      }
    } catch (error: any) {
      console.error('Error fetching courses', error);
      if (error.message === 'Failed to fetch') {
        setErrorMsg('שגיאת רשת (CORS). עליך להוסיף את כתובת האתר הנוכחית (App URL) ל-Web Platforms בפרויקט Appwrite שלך: כנס ל-Appwrite -> הפרויקט שלך -> Add Platform -> Web App -> הכנס את הכתובת ללא לוכסן בסוף.');
      } else {
        setErrorMsg(error.message || 'Failed to fetch');
      }
    }
  }, [user]);

  const toggleEnrollment = async (courseId: string, enrollmentId: string | null) => {
    if (!user) return;

    try {
      if (enrollmentId) {
        await api.deleteEnrollment(enrollmentId);
        setEnrolledCourseIds(prev => prev.filter(id => id !== courseId));
        setEnrollments(prev => {
          const next = { ...prev };
          delete next[courseId];
          return next;
        });
      } else {
        const res = await api.createEnrollment(user.$id, courseId);
        setEnrolledCourseIds(prev => [...prev, courseId]);
        setEnrollments(prev => ({ ...prev, [courseId]: res.$id }));
      }
      fetchCourses();
    } catch (error) {
      console.error('Error toggling enrollment', error);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses, user]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      (c.name.includes(deferredSearch) || c.number.includes(deferredSearch)) &&
      !enrolledCourseIds.includes(c.$id)
    );
  }, [courses, deferredSearch, enrolledCourseIds]);

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
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-cyan-500 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm whitespace-nowrap">
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
            <Search className="h-5 w-5 text-zinc-400 mr-3" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-4 border border-zinc-700/50 rounded-2xl leading-5 bg-zinc-800/40 backdrop-blur-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-lg transition-all shadow-sm group-hover:shadow-md text-zinc-100"
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
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors shadow-sm"
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
              className="p-4 bg-red-900/30 backdrop-blur-md border border-red-800 rounded-xl text-red-400"
            >
              <p className="font-bold mb-1">שגיאת התחברות ל-Appwrite:</p>
              <p className="font-mono text-sm" dir="ltr">{errorMsg}</p>
            </motion.div>
          )}

          {user && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-cyan-500" />
                הקורסים שלי
              </h2>
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {courses.filter(c => enrolledCourseIds.includes(c.$id)).length > 0 ? (
                  courses.filter(c => enrolledCourseIds.includes(c.$id)).map((course) => (
                    <motion.div key={course.$id} variants={itemVariants}>
                      <div 
                        className="block group p-6 rounded-2xl bg-zinc-800/40 backdrop-blur-md border border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Link to={`/course/${course.$id}`}>
                            <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                              {course.name}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-md">
                              {course.number}
                            </span>
                            <button onClick={() => toggleEnrollment(course.$id, enrollments[course.$id] || null)} className="text-emerald-500 hover:text-emerald-600">
                              <BookmarkCheck className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        {(course.year || course.semester) && (
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {course.year && (
                              <span className="text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-md">
                                {course.year}
                              </span>
                            )}
                            {course.semester && (
                              <span className="text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-md">
                                סמסטר {course.semester}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-cyan-300/70 text-sm line-clamp-2">
                          לחץ לצפייה בסילבוס, סיכומים, הגדרות ומשפטים.
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-zinc-800/40 backdrop-blur-md border border-zinc-700/50 shadow-sm opacity-60 col-span-full">
                    <p className="text-zinc-400 text-sm">אין קורסים רשומים עדיין.</p>
                  </motion.div>
                )}
              </motion.div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold mb-6 text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-zinc-500" />
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
                  <div 
                    className="block group p-6 rounded-2xl bg-zinc-800/40 backdrop-blur-md border border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Link to={`/course/${course.$id}`}>
                        <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                          {course.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">
                          {course.number}
                        </span>
                        <button onClick={() => toggleEnrollment(course.$id, null)} className="text-cyan-500 hover:text-cyan-600">
                          <BookmarkPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {(course.year || course.semester) && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {course.year && (
                          <span className="text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-md">
                            {course.year}
                          </span>
                        )}
                        {course.semester && (
                          <span className="text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-md">
                            סמסטר {course.semester}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-zinc-400 text-sm line-clamp-2">
                      לחץ לצפייה בסילבוס, סיכומים, הגדרות ומשפטים.
                    </p>
                  </div>
                </motion.div>
              ))}
              {filteredCourses.length === 0 && (
                <motion.div variants={itemVariants} className="col-span-full text-center py-12 text-zinc-500">
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

export default Home;
