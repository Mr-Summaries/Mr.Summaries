import { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { databases, storage, APPWRITE_CONFIG, ID, Query } from '../lib/appwrite';
import { BookOpen, FileText, List, Bookmark, Edit2, BookmarkPlus, BookmarkCheck, Search, Plus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { CourseModal } from '../components/CourseModal';
import { SummaryModal } from '../components/SummaryModal';
import { TableOfContents } from '../components/TableOfContents';

export const Course = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAdmin } = useAuthStore();
  const [course, setCourse] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';

  const [tocItems, setTocItems] = useState<{ id: string, title: string, level: number }[]>([]);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        id!
      );
      setCourse(res);
      
      // Check if enrolled in database
      if (user) {
        try {
          const enrollmentRes = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.enrollmentsCollectionId,
            [
              Query.equal('userID', user.$id),
              Query.equal('courseID', id!)
            ]
          );
          if (enrollmentRes.total > 0) {
            setIsEnrolled(true);
            setEnrollmentId(enrollmentRes.documents[0].$id);
          } else {
            setIsEnrolled(false);
            setEnrollmentId(null);
          }
        } catch (e) {
          console.error('Error checking enrollment', e);
        }
      } else {
        setIsEnrolled(false);
        setEnrollmentId(null);
      }

      let fileIdToFetch = '';
      if (currentTab === 'overview' && res.overviewID) fileIdToFetch = res.overviewID;
      if (currentTab === 'definitions' && res.definitionsID) fileIdToFetch = res.definitionsID;
      if (currentTab === 'claims' && res.claimsID) fileIdToFetch = res.claimsID;

      if (fileIdToFetch) {
        try {
          let urlToFetch = fileIdToFetch;
          
          // If it's a short ID (legacy or our new predictable IDs), construct the URL
          if (/^[a-zA-Z0-9_.-]+$/.test(fileIdToFetch) && fileIdToFetch.length < 100) {
            const fileUrl = storage.getFileView(APPWRITE_CONFIG.storageBucketId, fileIdToFetch);
            urlToFetch = fileUrl.toString();
          }

          if (urlToFetch.startsWith('http')) {
            const fileRes = await fetch(urlToFetch, {
              credentials: 'include'
            });
            
            // If it's an HTML response, it's likely a fallback page (like Vite's index.html) or an error page
            const contentType = fileRes.headers.get('content-type');
            const isHtml = contentType?.includes('text/html');
            
            if (fileRes.ok && !isHtml) {
              const text = await fileRes.text();
              setContent(text);
            } else {
              console.error('Fetch failed or returned HTML:', fileRes.status, contentType);
              setContent('לא ניתן לטעון את התוכן. ייתכן שאין הרשאות מתאימות.');
            }
          } else {
            setContent(fileIdToFetch);
          }
        } catch (e) {
          console.error('Error fetching file content:', e);
          setContent('שגיאה בטעינת התוכן מהשרת.');
        }
      } else {
        setContent('לא נמצא תוכן.');
      }
    } catch (error) {
      console.error('Error fetching course', error);
      setContent('שגיאה בטעינת התוכן.');
    } finally {
      setLoading(false);
    }
  }, [id, currentTab]);

  const fetchSummaries = useCallback(async () => {
    try {
      const summariesRes = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        [Query.equal('courseID', id!)]
      );
      setSummaries(summariesRes.documents);
    } catch (error) {
      console.error('Error fetching summaries', error);
    }
  }, [id]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => 
      s.name.includes(deferredSearch)
    );
  }, [summaries, deferredSearch]);

  useEffect(() => {
    if (id === 'summaries') {
      // Handle the case where a broken link led here
      setLoading(false);
      return;
    }

    fetchCourse();
    fetchSummaries();
  }, [fetchCourse, fetchSummaries, id]);

  const toggleEnrollment = async () => {
    if (!user) return;

    try {
      if (isEnrolled && enrollmentId) {
        await databases.deleteDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.enrollmentsCollectionId,
          enrollmentId
        );
        setIsEnrolled(false);
        setEnrollmentId(null);
      } else {
        const res = await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.enrollmentsCollectionId,
          ID.unique(),
          {
            userID: user.$id,
            courseID: id!
          }
        );
        setIsEnrolled(true);
        setEnrollmentId(res.$id);
      }
    } catch (error) {
      console.error('Error toggling enrollment', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">טוען...</div>;
  }

  if (!course) {
    return <div className="text-center text-red-500">קורס לא נמצא</div>;
  }

  const tabs = [
    { id: 'overview', label: 'סקירה', icon: BookOpen, show: true },
    { id: 'summaries', label: 'סיכומים', icon: FileText, show: true },
    { id: 'definitions', label: 'הגדרות', icon: List, show: !!course.definitionsID },
    { id: 'claims', label: 'משפטים', icon: Bookmark, show: !!course.claimsID },
  ];

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {course.name}
          </h1>
          <span className="inline-block bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-300 px-3 py-1 rounded-full text-sm font-mono font-medium">
            {course.number}
          </span>
        </div>
        <div className="flex gap-3">
          {user && (
            <button 
              onClick={toggleEnrollment}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isEnrolled 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' 
                  : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50'
              }`}
            >
              {isEnrolled ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              {isEnrolled ? 'רשום לקורס' : 'הירשם לקורס'}
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setIsCourseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              ערוך קורס
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        {tabs.filter(t => t.show).map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <Link
              key={tab.id}
              to={`/course/${id}?tab=${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-grow max-w-5xl">
          {currentTab === 'summaries' ? (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative w-full max-w-md">
                  <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-400 mr-3" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-12 py-3 border border-zinc-200 dark:border-zinc-700/50 rounded-xl leading-5 bg-zinc-200/80 dark:bg-zinc-800/40 backdrop-blur-xl placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-sm text-zinc-900 dark:text-zinc-100"
                    placeholder="חיפוש סיכומים..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {isAdmin && (
                  <button 
                    onClick={() => setIsSummaryModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5" />
                    הוסף סיכום
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSummaries.map((summary) => (
                  <Link 
                    key={summary.$id} 
                    to={`/summary/${summary.$id}`}
                    className="group p-6 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all flex flex-col items-start gap-4"
                  >
                    <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {summary.name}
                    </h3>
                  </Link>
                ))}
                {filteredSummaries.length === 0 && (
                  <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-200/60 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800/50">
                    לא נמצאו סיכומים התואמים את החיפוש.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <NestedMarkdown 
              content={content} 
              rightAlign={course.rightAlign} 
              onTOCChange={setTocItems}
            />
          )}
        </div>

        {currentTab !== 'summaries' && <TableOfContents items={tocItems} />}
      </div>

      <CourseModal 
        isOpen={isCourseModalOpen} 
        onClose={() => setIsCourseModalOpen(false)} 
        onSave={fetchCourse} 
        course={course}
      />

      <SummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        onSave={fetchSummaries} 
        courseId={id}
        courseNumber={course.number}
      />
    </div>
  );
};
