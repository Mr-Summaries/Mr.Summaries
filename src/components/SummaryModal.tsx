import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Eye, Edit3 } from 'lucide-react';
import { databases, storage, APPWRITE_CONFIG, ID } from '../lib/appwrite';
import { NestedMarkdown } from './NestedMarkdown';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  summary?: any; // If provided, we are editing
  courseId?: string; // If creating new, we need the course ID
}

const fetchFileContent = async (fileId: string) => {
  if (!fileId) return '';
  try {
    let url = fileId;
    if (/^[a-zA-Z0-9_.-]+$/.test(fileId) && fileId.length < 50) {
      const fileUrl = storage.getFileDownload(APPWRITE_CONFIG.storageBucketId, fileId);
      url = fileUrl.toString();
    }
    if (url.startsWith('http')) {
      const res = await fetch(url);
      const isHtml = res.headers.get('content-type')?.includes('text/html');
      if (res.ok && !isHtml) {
        return await res.text();
      }
    }
    return fileId;
  } catch (e) {
    return fileId;
  }
};

const uploadContent = async (content: string, filename: string) => {
  if (!content.trim()) return '';
  const file = new File([content], filename, { type: 'text/markdown' });
  const res = await storage.createFile(APPWRITE_CONFIG.storageBucketId, ID.unique(), file);
  return res.$id;
};

export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, onSave, summary, courseId }) => {
  const [name, setName] = useState('');
  const [rightAlign, setRightAlign] = useState(false);
  const [content, setContent] = useState('');
  const [origContent, setOrigContent] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (summary) {
        setName(summary.name || '');
        setRightAlign(summary.rightAlign || false);
        
        const loadContent = async () => {
          setIsLoadingContent(true);
          const text = await fetchFileContent(summary.fileID);
          setContent(text);
          setOrigContent(text);
          setIsLoadingContent(false);
        };
        loadContent();
      } else {
        setName('');
        setRightAlign(false);
        setContent('');
        setOrigContent('');
      }
    }
  }, [summary, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      let finalFileId = summary?.fileID || '';
      if (content !== origContent) {
        finalFileId = content.trim() ? await uploadContent(content, 'summary.md') : '';
      }

      const data: any = {
        name,
        rightAlign,
        fileID: finalFileId
      };

      if (!summary && courseId) {
        data.courses = courseId;
      }

      if (summary) {
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.summariesCollectionId,
          summary.$id,
          data
        );
      } else {
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.summariesCollectionId,
          ID.unique(),
          data
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'שגיאה בשמירת הסיכום');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {summary ? 'עריכת סיכום' : 'הוספת סיכום חדש'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">שם הסיכום</label>
                <input
                  type="text"
                  required
                  disabled={isLoadingContent}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rightAlign"
                  checked={rightAlign}
                  onChange={(e) => setRightAlign(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="rightAlign" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  יישור לימין (RTL)
                </label>
              </div>

              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>טוען תוכן...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">עריכת תוכן (Markdown)</label>
                    <textarea
                      rows={20}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                      dir={rightAlign ? 'rtl' : 'ltr'}
                      placeholder="# כותרת הסיכום..."
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">תצוגה מקדימה</label>
                    <div className="w-full px-6 py-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-[480px] overflow-y-auto prose dark:prose-invert max-w-none">
                      {content ? <NestedMarkdown content={content} rightAlign={rightAlign} /> : <p className="text-slate-400 italic text-center mt-10">אין תוכן להצגה</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-4"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'שומר...' : 'שמור סיכום'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
