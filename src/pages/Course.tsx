import { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { BookOpen, FileText, List, Bookmark, Edit2, BookmarkPlus, BookmarkCheck, Search, Plus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { CourseModal } from '../components/CourseModal';
import { SummaryModal } from '../components/SummaryModal';
import { LectureModal } from '../components/LectureModal';
import { ExampleModal } from '../components/ExampleModal';
import { AddPageModal } from '../components/AddPageModal';
import { PdfTextRenderer } from '../components/PdfTextRenderer';

export const Course = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAdmin } = useAuthStore();
  const [course, setCourse] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [examples, setExamples] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';

  const fetchCourse = useCallback(async () => {
    try {
      const res = await api.getCourse(id!);
      setCourse(res);
      
      // Check if enrolled in database
      if (user) {
        try {
          const enrollment = await api.getEnrollment(user.$id, id!);
          if (enrollment) {
            setIsEnrolled(true);
            setEnrollmentId(enrollment.$id);
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
          const file = await api.getFile(fileIdToFetch);
          
          if (file.mimeType === 'application/pdf') {
            setPdfUrl(await api.getFileView(fileIdToFetch));
            setContent('');
          } else {
            setPdfUrl(null);
            const urlToFetch = await api.getFileView(fileIdToFetch);

            const fileRes = await fetch(urlToFetch, {
              credentials: 'include'
            });
            
            const contentType = fileRes.headers.get('content-type');
            const isHtml = contentType?.includes('text/html');
            
            if (fileRes.ok && !isHtml) {
              const text = await fileRes.text();
              setContent(text);
            } else {
              console.error('Fetch failed or returned HTML:', fileRes.status, contentType);
              setContent('לא ניתן לטעון את התוכן. ייתכן שאין הרשאות מתאימות.');
            }
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
  }, [id, currentTab, user]);

  const fetchSummaries = useCallback(async () => {
    try {
      const res = await api.getSummaries(id!);
      setSummaries(res.documents);
    } catch (error) {
      console.error('Error fetching summaries', error);
    }
  }, [id]);

  const fetchLectures = useCallback(async () => {
    try {
      const res = await api.getLectures(id!);
      setLectures(res.documents);
    } catch (error) {
      console.error('Error fetching lectures', error);
    }
  }, [id]);

  const fetchExamples = useCallback(async () => {
    try {
      const res = await api.getExamples(id!);
      setExamples(res.documents);
    } catch (error) {
      console.error('Error fetching examples', error);
    }
  }, [id]);

  const filteredSummaries = useMemo(() => {
    const uniqueSummaries = Array.from(new Map(summaries.map(s => [s.$id, s])).values());
    return uniqueSummaries.filter(s => 
      s.name.includes(deferredSearch)
    );
  }, [summaries, deferredSearch]);

  const filteredLectures = useMemo(() => {
    const uniqueLectures = Array.from(new Map(lectures.map(l => [l.$id, l])).values());
    return uniqueLectures.filter(l => 
      l.name.includes(deferredSearch)
    );
  }, [lectures, deferredSearch]);

  const filteredExamples = useMemo(() => {
    const uniqueExamples = Array.from(new Map(examples.map(e => [e.$id, e])).values());
    return uniqueExamples.filter(e => 
      e.name.includes(deferredSearch)
    );
  }, [examples, deferredSearch]);

  useEffect(() => {
    if (id === 'summaries') {
      // Handle the case where a broken link led here
      setLoading(false);
      return;
    }

    fetchCourse();
    fetchSummaries();
    fetchLectures();
    fetchExamples();
  }, [fetchCourse, fetchSummaries, fetchLectures, fetchExamples, id]);

  const toggleEnrollment = async () => {
    if (!user) return;

    try {
      if (isEnrolled && enrollmentId) {
        await api.deleteEnrollment(enrollmentId);
        setIsEnrolled(false);
        setEnrollmentId(null);
      } else {
        const res = await api.createEnrollment(user.$id, id!);
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
    { id: 'overview', label: 'סילבוס', icon: BookOpen, show: true },
    { id: 'summaries', label: 'סיכומים', icon: FileText, show: summaries.length > 0 },
    { id: 'lectures', label: 'הרצאות', icon: List, show: lectures.length > 0 },
    { id: 'examples', label: 'דוגמאות', icon: List, show: examples.length > 0 },
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
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddPageModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                הוסף דף
              </button>
              <button 
                onClick={() => setIsCourseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                ערוך קורס
              </button>
            </div>
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
      ) : currentTab === 'lectures' ? (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-400 mr-3" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-12 py-3 border border-zinc-200 dark:border-zinc-700/50 rounded-xl leading-5 bg-zinc-200/80 dark:bg-zinc-800/40 backdrop-blur-xl placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-sm text-zinc-900 dark:text-zinc-100"
                placeholder="חיפוש הרצאות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLectures.map((lecture) => (
              <Link 
                key={lecture.$id} 
                to={`/lecture/${lecture.$id}`}
                className="group p-6 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all flex flex-col items-start gap-4"
              >
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <List className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {lecture.name}
                </h3>
              </Link>
            ))}
            {filteredLectures.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-200/60 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800/50">
                לא נמצאו הרצאות התואמים את החיפוש.
              </div>
            )}
          </div>
        </div>
      ) : currentTab === 'examples' ? (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-400 mr-3" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-12 py-3 border border-zinc-200 dark:border-zinc-700/50 rounded-xl leading-5 bg-zinc-200/80 dark:bg-zinc-800/40 backdrop-blur-xl placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-sm text-zinc-900 dark:text-zinc-100"
                placeholder="חיפוש דוגמאות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExamples.map((example) => (
              <Link 
                key={example.$id} 
                to={`/example/${example.$id}`}
                className="group p-6 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all flex flex-col items-start gap-4"
              >
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <List className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {example.name}
                </h3>
              </Link>
            ))}
            {filteredExamples.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-200/60 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800/50">
                לא נמצאו דוגמאות התואמים את החיפוש.
              </div>
            )}
          </div>
        </div>
      ) : pdfUrl ? (
        <PdfTextRenderer url={pdfUrl} rightAlign={course.rightAlign} />
      ) : (
        <NestedMarkdown content={content} rightAlign={course.rightAlign} />
      )}

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

      <LectureModal 
        isOpen={isLectureModalOpen} 
        onClose={() => setIsLectureModalOpen(false)} 
        onSave={fetchLectures} 
        courseId={id}
        courseNumber={course.number}
      />

      <ExampleModal 
        isOpen={isExampleModalOpen} 
        onClose={() => setIsExampleModalOpen(false)} 
        onSave={fetchExamples} 
        courseId={id}
        courseNumber={course.number}
      />

      <AddPageModal 
        isOpen={isAddPageModalOpen} 
        onClose={() => setIsAddPageModalOpen(false)} 
        onSelect={(type) => {
          setIsAddPageModalOpen(false);
          if (type === 'summary') setIsSummaryModalOpen(true);
          if (type === 'lecture') setIsLectureModalOpen(true);
          if (type === 'example') setIsExampleModalOpen(true);
        }}
      />
    </div>
  );
};
