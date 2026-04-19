import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowRight, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { ContentModal } from '../components/ContentModal';
import { PdfTextRenderer } from '../components/PdfTextRenderer';

const Practice = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [practice, setPractice] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPractice = useCallback(async () => {
    try {
      const res = await api.getPractice(id!);
      setPractice(res);

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
        } catch (e: any) {
          console.error('Error fetching practice content:', e);
          if (e.message === 'Failed to fetch') {
            setContent('שגיאת רשת (CORS). עליך להוסיף את כתובת האתר הנוכחית (App URL) ל-Web Platforms בפרויקט Appwrite שלך.');
          } else {
            setContent('שגיאה בטעינת התוכן מהשרת.');
          }
        }
      } else {
        setContent('לא נמצא תוכן לתרגול זה.');
      }
    } catch (error: any) {
      if (error.code === 404) {
        setPractice(null);
      } else {
        console.error('Error fetching practice', error);
        setContent('שגיאה בטעינת התוכן.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPractice();
  }, [fetchPractice]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">טוען...</div>;
  }

  if (!practice) {
    return <div className="text-center text-red-500">תרגול לא נמצא</div>;
  }

  const getCourseId = () => {
    if (!practice?.courses) return '';
    if (typeof practice.courses === 'string') return practice.courses;
    if (Array.isArray(practice.courses)) {
      return practice.courses[0]?.$id || practice.courses[0] || '';
    }
    return practice.courses.$id || '';
  };

  const courseId = getCourseId();
  const courseNumber = practice?.courses?.number || (Array.isArray(practice?.courses) ? practice.courses[0]?.number : '');

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="flex justify-between items-start mb-8">
        <div>
          {courseId ? (
            <Link to={`/course/${courseId}?tab=practices`} className="inline-flex items-center gap-2 text-cyan-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לתרגולים
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לדף הבית
            </Link>
          )}
          <h1 className="text-4xl font-bold text-zinc-50 mb-2">
            {practice.name}
          </h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            ערוך תרגול
          </button>
        )}
      </div>

      {pdfUrl ? (
        <PdfTextRenderer url={pdfUrl} rightAlign={practice.rightAlign} />
      ) : (
        <NestedMarkdown 
          content={content} 
          rightAlign={practice.rightAlign} 
        />
      )}

      <ContentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchPractice} 
        item={practice}
        courseNumber={courseNumber}
        type="practice"
      />
    </div>
  );
};

export default Practice;
