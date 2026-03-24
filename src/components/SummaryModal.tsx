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
  courseNumber?: string; // For naming convention
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

const uploadContent = async (content: string, filename: string, fileId: string) => {
  if (!content.trim()) return '';
  const file = new File([content], filename, { type: 'text/markdown' });
  
  try {
    // Try to delete existing file with same ID to allow "overwrite"
    await storage.deleteFile(APPWRITE_CONFIG.storageBucketId, fileId);
  } catch (e) {
    // Ignore if file doesn't exist
  }

  const res = await storage.createFile(APPWRITE_CONFIG.storageBucketId, fileId, file);
  return res.$id;
};

export const SummaryModal: React.FC<SummaryModalProps> = React.memo(({ isOpen, onClose, onSave, summary, courseId, courseNumber }) => {
  const [name, setName] = useState('');
  const [rightAlign, setRightAlign] = useState(false);
  const [content, setContent] = useState('');
  const [origContent, setOrigContent] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState<'md' | 'pdf' | 'tex'>('md');
  const [newFile, setNewFile] = useState<File | null>(null);

  const handleDelete = async () => {
    if (!summary || !confirm('האם אתה בטוח שברצונך למחוק סיכום זה?')) return;
    setIsDeleting(true);
    setError('');
    try {
      if (summary.fileID) {
        try {
          await storage.deleteFile(APPWRITE_CONFIG.storageBucketId, summary.fileID);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        summary.$id
      );
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
            const file = await storage.getFile(APPWRITE_CONFIG.storageBucketId, summary.fileID);
            if (file.mimeType === 'application/pdf') {
              setFileType('pdf');
            } else if (file.name.endsWith('.tex')) {
              setFileType('tex');
              const text = await fetchFileContent(summary.fileID);
              setContent(text);
              setOrigContent(text);
            } else {
              setFileType('md');
              const text = await fetchFileContent(summary.fileID);
              setContent(text);
              setOrigContent(text);
            }
          } catch (e) {
            console.error('Error loading file:', e);
            // Fallback to text if file metadata fetch fails
            setFileType('md');
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
        setFileType('md');
        setNewFile(null);
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
      
      const uploadFile = async (contentOrFile: string | File, id: string, oldFileId: string, type: 'md' | 'pdf' | 'tex') => {
        if (type === 'pdf') {
          if (contentOrFile instanceof File) {
            try {
              await storage.deleteFile(APPWRITE_CONFIG.storageBucketId, oldFileId);
            } catch (e) {}
            const res = await storage.createFile(APPWRITE_CONFIG.storageBucketId, id, contentOrFile);
            return res.$id;
          }
          return oldFileId;
        } else {
          const content = contentOrFile instanceof File ? await contentOrFile.text() : contentOrFile;
          const filename = `${id}.${type}`;
          return await uploadContent(content, filename, id);
        }
      };

      if (fileType === 'pdf') {
        if (newFile) {
          const id = `summary-${summaryName}-${courseNum}`.toLowerCase();
          finalFileId = await uploadFile(newFile, id, finalFileId, 'pdf');
        }
      } else if (content !== origContent || isNameChanged || isCourseNumChanged) {
        const id = `summary-${summaryName}-${courseNum}`.toLowerCase();
        finalFileId = await uploadFile(content, id, finalFileId, fileType);
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
        const docId = `summary-${summaryName}-${courseNum}`.toLowerCase();
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.summariesCollectionId,
          docId,
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
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">סוג תוכן:</label>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button type="button" onClick={() => setFileType('md')} className={`px-3 py-1 rounded-md text-xs transition-colors ${fileType === 'md' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                    <button type="button" onClick={() => setFileType('tex')} className={`px-3 py-1 rounded-md text-xs transition-colors ${fileType === 'tex' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>LaTeX</button>
                    <button type="button" onClick={() => setFileType('pdf')} className={`px-3 py-1 rounded-md text-xs transition-colors ${fileType === 'pdf' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                  </div>
                </div>
              </div>

              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-cyan-600 dark:text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>טוען תוכן...</p>
                </div>
              ) : fileType === 'pdf' ? (
                <div className="p-6 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200">
                  <p className="font-bold mb-2">סיכום זה הוא קובץ PDF.</p>
                  <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                  <input type="file" accept="application/pdf" className="mt-4 w-full" onChange={(e) => setNewFile(e.target.files?.[0] || null)} />
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
                      {content ? <NestedMarkdown content={content} rightAlign={rightAlign} fileType={fileType as 'md' | 'tex'} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
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
