import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowRight, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { ExampleModal } from '../components/ExampleModal';
import { PdfTextRenderer } from '../components/PdfTextRenderer';

const Example = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [example, setExample] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);

  const fetchExample = useCallback(async () => {
    try {
      const res = await api.getExample(id!);
      setExample(res);

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
          console.error('Error fetching example content:', e);
          if (e.message === 'Failed to fetch') {
            setContent('שגיאת רשת (CORS). עליך להוסיף את כתובת האתר הנוכחית (App URL) ל-Web Platforms בפרויקט Appwrite שלך.');
          } else {
            setContent('שגיאה בטעינת התוכן מהשרת.');
          }
        }
      } else {
        setContent('לא נמצא תוכן לדוגמה זו.');
      }
    } catch (error: any) {
      if (error.code === 404) {
        setExample(null);
      } else {
        console.error('Error fetching example', error);
        setContent('שגיאה בטעינת התוכן.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExample();
  }, [fetchExample]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">טוען...</div>;
  }

  if (!example) {
    return <div className="text-center text-red-500">דוגמה לא נמצאה</div>;
  }

  const getCourseId = () => {
    if (!example?.courses) return '';
    if (typeof example.courses === 'string') return example.courses;
    if (Array.isArray(example.courses)) {
      return example.courses[0]?.$id || example.courses[0] || '';
    }
    return example.courses.$id || '';
  };

  const courseId = getCourseId();
  const courseNumber = example?.courses?.number || (Array.isArray(example?.courses) ? example.courses[0]?.number : '');

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="flex justify-between items-start mb-8">
        <div>
          {courseId ? (
            <Link to={`/course/${courseId}?tab=examples`} className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לדוגמאות
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לדף הבית
            </Link>
          )}
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {example.name}
          </h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsExampleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            ערוך דוגמה
          </button>
        )}
      </div>

      {pdfUrl ? (
        <PdfTextRenderer url={pdfUrl} rightAlign={example.rightAlign} />
      ) : (
        <NestedMarkdown 
          content={content} 
          rightAlign={example.rightAlign} 
        />
      )}

      <ExampleModal 
        isOpen={isExampleModalOpen} 
        onClose={() => setIsExampleModalOpen(false)} 
        onSave={fetchExample} 
        example={example}
        courseNumber={courseNumber}
      />
    </div>
  );
};

export default Example;
