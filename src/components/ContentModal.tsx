import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2 } from 'lucide-react';
import { ID } from 'appwrite';
import { api } from '../services/api';
import { NestedMarkdown } from './NestedMarkdown';

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  item?: any;
  courseId?: string;
  courseNumber?: string;
  type: 'summary' | 'lecture' | 'practice';
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

const uploadContent = async (content: string, filename: string, oldFileId?: string) => {
  if (!content.trim()) {
    if (oldFileId) {
      try {
        await api.deleteFile(oldFileId);
      } catch (e) {}
    }
    return '';
  }

  const file = new File([content], filename, { type: 'text/markdown' });
  const res = await api.createFile(file);
  
  if (oldFileId) {
    try {
      await api.deleteFile(oldFileId);
    } catch (e) {}
  }

  return res.$id;
};

export const ContentModal: React.FC<ContentModalProps> = React.memo(({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  item, 
  courseId, 
  courseNumber,
  type 
}) => {
  const [name, setName] = useState('');
  const [rightAlign, setRightAlign] = useState(false);
  const [content, setContent] = useState('');
  const [origContent, setOrigContent] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState<'md' | 'pdf'>('md');
  const [newFile, setNewFile] = useState<File | null>(null);

  const typeLabels = {
    summary: { title: 'סיכום', add: 'הוספת סיכום חדש', edit: 'עריכת סיכום', delete: 'מחק סיכום', confirm: 'האם אתה בטוח שברצונך למחוק סיכום זה?' },
    lecture: { title: 'הרצאה', add: 'הוספת הרצאה חדשה', edit: 'עריכת הרצאה', delete: 'מחק הרצאה', confirm: 'האם אתה בטוח שברצונך למחוק הרצאה זו?' },
    practice: { title: 'תרגול', add: 'הוספת תרגול חדש', edit: 'עריכת תרגול', delete: 'מחק תרגול', confirm: 'האם אתה בטוח שברצונך למחוק תרגול זה?' }
  };

  const labels = typeLabels[type];

  const handleDelete = async () => {
    if (!item || !confirm(labels.confirm)) return;
    setIsDeleting(true);
    setError('');
    try {
      if (item.fileID) {
        try {
          await api.deleteFile(item.fileID);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
      
      if (type === 'summary') await api.deleteSummary(item.$id);
      else if (type === 'lecture') await api.deleteLecture(item.$id);
      else if (type === 'practice') await api.deletePractice(item.$id);
      
      onDelete?.();
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || `שגיאה במחיקת ה${labels.title}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setName(item.name || '');
        setRightAlign(item.rightAlign || false);
        
        const loadContent = async () => {
          setIsLoadingContent(true);
          setFileType('md');
          setNewFile(null);
          try {
            const file = await api.getFile(item.fileID);
            if (file.mimeType === 'application/pdf') {
              setFileType('pdf');
            } else {
              setFileType('md');
              const text = await fetchFileContent(item.fileID);
              setContent(text);
              setOrigContent(text);
            }
          } catch (e) {
            console.error('Error loading file:', e);
            setFileType('md');
            const text = await fetchFileContent(item.fileID);
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
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    let docSaved = false;
    try {
      const courseNum = courseNumber?.trim().replace(/[^a-zA-Z0-9._-]/g, '') || 'unknown';
      const itemName = name.trim().replace(/[^a-zA-Z0-9._-]/g, '');
      
      let finalFileId = item?.fileID || '';
      
      const uploadFile = async (contentOrFile: string | File, id: string, oldFileId: string, type: 'md' | 'pdf') => {
        if (type === 'pdf') {
          if (contentOrFile instanceof File) {
            const res = await api.createFile(contentOrFile);
            if (oldFileId) {
              try {
                await api.deleteFile(oldFileId);
              } catch (e) {}
            }
            return res.$id;
          }
          return oldFileId;
        } else {
          const content = contentOrFile instanceof File ? await contentOrFile.text() : contentOrFile;
          const filename = `${id}.${type}`;
          return await uploadContent(content, filename, oldFileId);
        }
      };

      if (fileType === 'pdf') {
        if (newFile) {
          const id = `${type}-${itemName}-${courseNum}`.toLowerCase();
          finalFileId = await uploadFile(newFile, id, finalFileId, 'pdf');
        }
      } else if (content !== origContent) {
        const id = `${type}-${itemName}-${courseNum}`.toLowerCase();
        finalFileId = await uploadFile(content, id, finalFileId, fileType);
      }

      const data: any = {
        name,
        rightAlign,
        fileID: finalFileId
      };

      if (!item && courseId) {
        data.courses = courseId;
      }

      if (item) {
        if (type === 'summary') await api.updateSummary(item.$id, data);
        else if (type === 'lecture') await api.updateLecture(item.$id, data);
        else if (type === 'practice') await api.updatePractice(item.$id, data);
      } else {
        const docId = ID.unique();
        if (type === 'summary') await api.createSummary(docId, data);
        else if (type === 'lecture') await api.createLecture(docId, data);
        else if (type === 'practice') await api.createPractice(docId, data);
      }
      docSaved = true;
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (docSaved) {
        // The document was saved successfully; a post-save error should not block closing.
        onSave();
        onClose();
      } else {
        setError(err.message || `שגיאה בשמירת ה${labels.title}`);
      }
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
            className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
              <h2 className="text-2xl font-bold text-zinc-50">
                {item ? labels.edit : labels.add}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-900/30 text-red-400 rounded-xl text-sm border border-red-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">שם ה{labels.title}</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  disabled={isLoadingContent}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rightAlign"
                    checked={rightAlign}
                    onChange={(e) => setRightAlign(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="rightAlign" className="text-sm font-medium text-zinc-300">
                    יישור לימין (RTL)
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-zinc-300">סוג תוכן:</label>
                  <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg">
                    <button type="button" onClick={() => setFileType('md')} className={`px-3 py-1 rounded-md text-xs transition-colors ${fileType === 'md' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                    <button type="button" onClick={() => setFileType('pdf')} className={`px-3 py-1 rounded-md text-xs transition-colors ${fileType === 'pdf' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                  </div>
                </div>
              </div>

              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>טוען תוכן...</p>
                </div>
              ) : fileType === 'pdf' ? (
                <div className="p-6 bg-amber-900/30 border border-amber-800 rounded-xl text-amber-200">
                  <p className="font-bold mb-2">ה{labels.title} הוא קובץ PDF.</p>
                  <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                  <input type="file" accept="application/pdf" className="mt-4 w-full text-zinc-300" onChange={(e) => setNewFile(e.target.files?.[0] || null)} />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-zinc-300">עריכת תוכן (Markdown)</label>
                    <textarea
                      rows={20}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                      dir={rightAlign ? 'rtl' : 'ltr'}
                      placeholder={`# כותרת ה${labels.title}...`}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-zinc-300">תצוגה מקדימה</label>
                    <div className="w-full px-6 py-6 rounded-xl border border-zinc-700 bg-zinc-800 h-[480px] overflow-y-auto prose prose-invert max-w-none">
                      {content ? <NestedMarkdown content={content} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || !item}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isDeleting ? 'מוחק...' : labels.delete}
                </button>
                <div className="flex">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-zinc-400 hover:bg-zinc-800 rounded-xl transition-colors ml-4"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'שומר...' : `שמור ${labels.title}`}
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
