import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { databases, storage, APPWRITE_CONFIG } from '../lib/appwrite';
import { BookOpen, FileText, List, Bookmark, Edit2, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { CourseModal } from '../components/CourseModal';
import { SummaryModal } from '../components/SummaryModal';

export const Course = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAdmin } = useAuthStore();
  const [course, setCourse] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';

  const fetchCourse = async () => {
    try {
      const res = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        id!
      );
      setCourse(res);

      // Check if enrolled (mock implementation)
      const enrolled = localStorage.getItem(`enrolled_${id}`);
      if (enrolled) setIsEnrolled(true);

      let fileIdToFetch = '';
      if (currentTab === 'overview' && res.overviewID) fileIdToFetch = res.overviewID;
      if (currentTab === 'definitions' && res.definitionsID) fileIdToFetch = res.definitionsID;
      if (currentTab === 'claims' && res.claimsID) fileIdToFetch = res.claimsID;

      if (fileIdToFetch) {
        try {
          let urlToFetch = fileIdToFetch;
          
          // If it's a short ID (legacy), construct the URL
          if (/^[a-zA-Z0-9_.-]+$/.test(fileIdToFetch) && fileIdToFetch.length < 50) {
            const fileUrl = storage.getFileDownload(APPWRITE_CONFIG.storageBucketId, fileIdToFetch);
            urlToFetch = fileUrl.toString();
          }

          if (urlToFetch.startsWith('http')) {
            const fileRes = await fetch(urlToFetch);
            
            // If it's an HTML response, it's likely a fallback page (like Vite's index.html) or an error page
            const isHtml = fileRes.headers.get('content-type')?.includes('text/html');
            
            if (fileRes.ok && !isHtml) {
              const text = await fileRes.text();
              setContent(text);
            } else {
              setContent(fileIdToFetch);
            }
          } else {
            setContent(fileIdToFetch);
          }
        } catch (e) {
          setContent(fileIdToFetch);
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
  };

  useEffect(() => {
    if (id === 'summaries') {
      // Handle the case where a broken link led here
      setLoading(false);
      return;
    }

    fetchCourse();
  }, [id, currentTab]);

  const toggleEnrollment = () => {
    if (isEnrolled) {
      localStorage.removeItem(`enrolled_${id}`);
      setIsEnrolled(false);
    } else {
      localStorage.setItem(`enrolled_${id}`, 'true');
      setIsEnrolled(true);
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
    { id: 'summaries', label: 'סיכומים', icon: FileText, show: true, isLink: true },
    { id: 'definitions', label: 'הגדרות', icon: List, show: !!course.definitionsID },
    { id: 'claims', label: 'משפטים', icon: Bookmark, show: !!course.claimsID },
  ];

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            {course.name}
          </h1>
          <span className="inline-block bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-mono font-medium">
            {course.number}
          </span>
        </div>
        <div className="flex gap-3">
          {user && (
            <button 
              onClick={toggleEnrollment}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isEnrolled 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' 
                  : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
              }`}
            >
              {isEnrolled ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              {isEnrolled ? 'רשום לקורס' : 'הירשם לקורס'}
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setIsCourseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              ערוך קורס
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        {tabs.filter(t => t.show).map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          if (tab.isLink) {
            return (
              <Link
                key={tab.id}
                to={`/course/${id}/summaries`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          }

          return (
            <Link
              key={tab.id}
              to={`/course/${id}?tab=${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <NestedMarkdown content={content} rightAlign={course.rightAlign} />

      <CourseModal 
        isOpen={isCourseModalOpen} 
        onClose={() => setIsCourseModalOpen(false)} 
        onSave={fetchCourse} 
        course={course}
      />

      <SummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        onSave={() => {}} 
        courseId={id}
      />
    </div>
  );
};
