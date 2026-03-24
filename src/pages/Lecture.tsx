import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowRight, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { LectureModal } from '../components/LectureModal';
import { PdfTextRenderer } from '../components/PdfTextRenderer';

const Lecture = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [lecture, setLecture] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);

  const fetchLecture = useCallback(async () => {
    try {
      const res = await api.getLecture(id!);
      setLecture(res);

      if (res.fileID) {
        try {
          const file = await api.getFile(res.fileID);
          
          if (file.mimeType === 'application/pdf') {
            setPdfUrl(await api.getFileView(res.fileID));
            setContent('');
          } else {
            setPdfUrl(null);
            const urlToFetch = await api.getFileView(res.fileID);

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
          console.error('Error fetching lecture content:', e);
          setContent('שגיאה בטעינת התוכן מהשרת.');
        }
      } else {
        setContent('לא נמצא תוכן להרצאה זו.');
      }
    } catch (error) {
      console.error('Error fetching lecture', error);
      setContent('שגיאה בטעינת התוכן.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLecture();
  }, [fetchLecture]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">טוען...</div>;
  }

  if (!lecture) {
    return <div className="text-center text-red-500">הרצאה לא נמצאה</div>;
  }

  const getCourseId = () => {
    if (!lecture?.courses) return '';
    if (typeof lecture.courses === 'string') return lecture.courses;
    if (Array.isArray(lecture.courses)) {
      return lecture.courses[0]?.$id || lecture.courses[0] || '';
    }
    return lecture.courses.$id || '';
  };

  const courseId = getCourseId();
  const courseNumber = lecture?.courses?.number || (Array.isArray(lecture?.courses) ? lecture.courses[0]?.number : '');

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="flex justify-between items-start mb-8">
        <div>
          {courseId ? (
            <Link to={`/course/${courseId}?tab=lectures`} className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה להרצאות
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לדף הבית
            </Link>
          )}
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {lecture.name}
          </h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsLectureModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            ערוך הרצאה
          </button>
        )}
      </div>

      {pdfUrl ? (
        <PdfTextRenderer url={pdfUrl} rightAlign={lecture.rightAlign} />
      ) : (
        <NestedMarkdown 
          content={content} 
          rightAlign={lecture.rightAlign} 
        />
      )}

      <LectureModal 
        isOpen={isLectureModalOpen} 
        onClose={() => setIsLectureModalOpen(false)} 
        onSave={fetchLecture} 
        lecture={lecture}
        courseNumber={courseNumber}
      />
    </div>
  );
};

export default Lecture;
