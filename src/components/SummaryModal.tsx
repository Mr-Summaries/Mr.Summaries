import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Eye, Edit3 } from 'lucide-react';
import { api } from '../services/api';
import { NestedMarkdown } from './NestedMarkdown';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  summary?: any; // If provided, we are editing
  courseId?: string; // If creating new, we need the course ID
  courseNumber?: string; // For naming convention
}

const fetchFileContent = async (fileId: string) => {
  if (!fileId) return '';
  try {
    const url = await api.getFileView(fileId);
    const res = await fetch(url);
    const isHtml = res.headers.get('content-type')?.includes('text/html');
    if (res.ok && !isHtml) {
      return await res.text();
    }
    return fileId;
  } catch (e) {
    return fileId;
  }
};

const uploadContent = async (content: string, filename: string, fileId: string) => {
  if (!content.trim()) return '';
  const file = new File([content], filename, { type: 'text/markdown' });
  
  try {
    // Try to delete existing file with same ID to allow "overwrite"
    await api.deleteFile(fileId);
  } catch (e) {
    // Ignore if file doesn't exist
  }

  const res = await api.createFile(file, fileId);
  return res.$id;
};

export const SummaryModal: React.FC<SummaryModalProps> = React.memo(({ isOpen, onClose, onSave, onDelete, summary, courseId, courseNumber }) => {
  const [name, setName] = useState('');
  const [rightAlign, setRightAlign] = useState(false);
  const [content, setContent] = useState('');
  const [origContent, setOrigContent] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!summary || !confirm('האם אתה בטוח שברצונך למחוק סיכום זה?')) return;
    setIsDeleting(true);
    setError('');
    try {
      if (summary.fileID) {
        try {
          await api.deleteFile(summary.fileID);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
      await api.deleteSummary(summary.$id);
      onDelete?.();
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'שגיאה במחיקת הסיכום');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (summary) {
        setName(summary.name || '');
        setRightAlign(summary.rightAlign || false);
        
        const loadContent = async () => {
          setIsLoadingContent(true);
          setFileType('md');
          setNewFile(null);
          try {
            await api.getFile(summary.fileID);
            const text = await fetchFileContent(summary.fileID);
            setContent(text);
            setOrigContent(text);
          } catch (e) {
            console.error('Error loading file:', e);
            const text = await fetchFileContent(summary.fileID);
            setContent(text);
            setOrigContent(text);
          }
          setIsLoadingContent(false);
        };
        loadContent();
      } else {
        setName('');
        setRightAlign(false);
        setContent('');
        setOrigContent('');
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
      const courseNum = courseNumber?.trim().replace(/[^a-zA-Z0-9._-]/g, '') || 'unknown';
      const summaryName = name.trim().replace(/[^a-zA-Z0-9._-]/g, '');
      const isNameChanged = summary && summaryName !== summary.name?.trim().replace(/[^a-zA-Z0-9._-]/g, '');
      const isCourseNumChanged = summary && courseNum !== courseNumber?.trim().replace(/[^a-zA-Z0-9._-]/g, '');
      
      let finalFileId = summary?.fileID || '';

      if (content !== origContent || isNameChanged || isCourseNumChanged) {
        const id = `summary-${summaryName}-${courseNum}`.toLowerCase();
        finalFileId = await uploadContent(content, `${id}.md`, id);
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
        await api.updateSummary(summary.$id, data);
      } else {
        const docId = `summary-${summaryName}-${courseNum}`.toLowerCase();
        await api.createSummary(docId, data);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {summary ? 'עריכת סיכום' : 'הוספת סיכום חדש'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">שם הסיכום</label>
                <input
                  type="text"
                  required
                  disabled={isLoadingContent}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rightAlign"
                    checked={rightAlign}
                    onChange={(e) => setRightAlign(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="rightAlign" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    יישור לימין (RTL)
                  </label>
                </div>
                </div>
              </div>

              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-cyan-600 dark:text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>טוען תוכן...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">עריכת תוכן (Markdown)</label>
                    <textarea
                      rows={20}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                      dir={rightAlign ? 'rtl' : 'ltr'}
                      placeholder="# כותרת הסיכום..."
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">תצוגה מקדימה</label>
                    <div className="w-full px-6 py-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 h-[480px] overflow-y-auto prose dark:prose-invert max-w-none">
                      {content ? <NestedMarkdown content={content} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || !summary}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isDeleting ? 'מוחק...' : 'מחק סיכום'}
                </button>
                <div className="flex">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors ml-4"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'שומר...' : 'שמור סיכום'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
