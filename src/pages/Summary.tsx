import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowRight, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { SummaryModal } from '../components/SummaryModal';
import { TableOfContents } from '../components/TableOfContents';
import { PdfTextRenderer } from '../components/PdfTextRenderer';

const Summary = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [tocItems, setTocItems] = useState<{ id: string, title: string, level: number }[]>([]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.getSummary(id!);
      setSummary(res);

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
          console.error('Error fetching summary content:', e);
          if (e.message === 'Failed to fetch') {
            setContent('שגיאת רשת (CORS). עליך להוסיף את כתובת האתר הנוכחית (App URL) ל-Web Platforms בפרויקט Appwrite שלך.');
          } else {
            setContent('שגיאה בטעינת התוכן מהשרת.');
          }
        }
      } else {
        setContent('לא נמצא תוכן לסיכום זה.');
      }
    } catch (error) {
      console.error('Error fetching summary', error);
      setContent('שגיאה בטעינת התוכן.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">טוען...</div>;
  }

  if (!summary) {
    return <div className="text-center text-red-500">סיכום לא נמצא</div>;
  }

  const getCourseId = () => {
    if (!summary?.courses) return '';
    if (typeof summary.courses === 'string') return summary.courses;
    if (Array.isArray(summary.courses)) {
      return summary.courses[0]?.$id || summary.courses[0] || '';
    }
    return summary.courses.$id || '';
  };

  const courseId = getCourseId();
  const courseNumber = summary?.courses?.number || (Array.isArray(summary?.courses) ? summary.courses[0]?.number : '');

  return (
    <div className="max-w-7xl mx-auto px-4" dir="rtl">
      <div className="flex flex-col lg:flex-row gap-8 justify-center">
        <div className="flex-grow max-w-5xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              {courseId ? (
                <Link to={`/course/${courseId}?tab=summaries`} className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
                  <ArrowRight className="w-4 h-4" />
                  חזרה לסיכומים
                </Link>
              ) : (
                <Link to="/" className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
                  <ArrowRight className="w-4 h-4" />
                  חזרה לדף הבית
                </Link>
              )}
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {summary.name}
              </h1>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsSummaryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                ערוך סיכום
              </button>
            )}
          </div>

          {pdfUrl ? (
            <PdfTextRenderer url={pdfUrl} rightAlign={summary.rightAlign} />
          ) : (
            <NestedMarkdown 
              content={content} 
              rightAlign={summary.rightAlign} 
              onTOCChange={setTocItems}
            />
          )}
        </div>

        {!pdfUrl && <TableOfContents items={tocItems} />}
      </div>

      <SummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        onSave={fetchSummary} 
        summary={summary}
        courseNumber={courseNumber}
      />
    </div>
  );
};

export default Summary;
