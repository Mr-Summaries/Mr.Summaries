import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { databases, storage, APPWRITE_CONFIG } from '../lib/appwrite';
import { ArrowRight, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { NestedMarkdown } from '../components/NestedMarkdown';
import { SummaryModal } from '../components/SummaryModal';

export const Summary = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        id!
      );
      setSummary(res);

      if (res.fileID) {
        try {
          let urlToFetch = res.fileID;
          
          // If it's a short ID (legacy), construct the URL
          if (/^[a-zA-Z0-9_.-]+$/.test(res.fileID) && res.fileID.length < 50) {
            const fileUrl = storage.getFileDownload(APPWRITE_CONFIG.storageBucketId, res.fileID);
            urlToFetch = fileUrl.toString();
          }

          if (urlToFetch.startsWith('http')) {
            const fileRes = await fetch(urlToFetch);
            
            const isHtml = fileRes.headers.get('content-type')?.includes('text/html');
            
            if (fileRes.ok && !isHtml) {
              const text = await fileRes.text();
              setContent(text);
            } else {
              setContent(res.fileID);
            }
          } else {
            setContent(res.fileID);
          }
        } catch (e) {
          setContent(res.fileID);
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

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <div className="flex justify-between items-start mb-8">
        <div>
          {courseId ? (
            <Link to={`/course/${courseId}/summaries`} className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לסיכומים
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline mb-4">
              <ArrowRight className="w-4 h-4" />
              חזרה לדף הבית
            </Link>
          )}
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            {summary.name}
          </h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsSummaryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            ערוך סיכום
          </button>
        )}
      </div>

      <NestedMarkdown content={content} rightAlign={summary.rightAlign} />

      <SummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        onSave={fetchSummary} 
        summary={summary}
      />
    </div>
  );
};
