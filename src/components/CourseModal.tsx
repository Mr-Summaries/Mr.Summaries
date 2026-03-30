import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Eye, Edit3 } from 'lucide-react';
import { api } from '../services/api';
import { NestedMarkdown } from './NestedMarkdown';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  course?: any; // If provided, we are editing
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

export const CourseModal: React.FC<CourseModalProps> = React.memo(({ isOpen, onClose, onSave, course }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [rightAlign, setRightAlign] = useState(false);
  const [overviewContent, setOverviewContent] = useState('');
  const [definitionsContent, setDefinitionsContent] = useState('');
  const [claimsContent, setClaimsContent] = useState('');
  
  const [overviewUrl, setOverviewUrl] = useState('');
  const [definitionsUrl, setDefinitionsUrl] = useState('');
  const [claimsUrl, setClaimsUrl] = useState('');
  
  const [origOverview, setOrigOverview] = useState('');
  const [origDefinitions, setOrigDefinitions] = useState('');
  const [origClaims, setOrigClaims] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');
  
  const [overviewFileType, setOverviewFileType] = useState<'md' | 'pdf'>('md');
  const [newOverviewFile, setNewOverviewFile] = useState<File | null>(null);
  const [definitionsFileType, setDefinitionsFileType] = useState<'md' | 'pdf'>('md');
  const [newDefinitionsFile, setNewDefinitionsFile] = useState<File | null>(null);
  const [claimsFileType, setClaimsFileType] = useState<'md' | 'pdf'>('md');
  const [newClaimsFile, setNewClaimsFile] = useState<File | null>(null);

  const handleDelete = async () => {
    if (!course || !confirm('האם אתה בטוח שברצונך למחוק קורס זה?')) return;
    setIsDeleting(true);
    setError('');
    try {
      const filesToDelete = [course.overviewID, course.definitionsID, course.claimsID].filter(Boolean);
      for (const fileId of filesToDelete) {
        try {
          await api.deleteFile(fileId);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
      await api.deleteCourse(course.$id);
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'שגיאה במחיקת הקורס');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (course) {
        setName(course.name || '');
        setNumber(course.number || '');
        setRightAlign(course.rightAlign || false);
        
        const loadContents = async () => {
          setIsLoadingContent(true);

          const checkFileType = async (fileId: string) => {
            try {
              const file = await api.getFile(fileId);
              if (file.mimeType === 'application/pdf') return 'pdf';
              return 'md';
            } catch (e) {
              return 'md';
            }
          };

          const [ov, def, cl, ovUrl, defUrl, clUrl] = await Promise.all([
            fetchFileContent(course.overviewID),
            fetchFileContent(course.definitionsID),
            fetchFileContent(course.claimsID),
            course.overviewID ? api.getFileView(course.overviewID) : Promise.resolve(''),
            course.definitionsID ? api.getFileView(course.definitionsID) : Promise.resolve(''),
            course.claimsID ? api.getFileView(course.claimsID) : Promise.resolve('')
          ]);
          
          setOverviewFileType(await checkFileType(course.overviewID));
          setDefinitionsFileType(await checkFileType(course.definitionsID));
          setClaimsFileType(await checkFileType(course.claimsID));
          
          setOverviewContent(ov);
          setDefinitionsContent(def);
          setClaimsContent(cl);
          
          setOverviewUrl(ovUrl);
          setDefinitionsUrl(defUrl);
          setClaimsUrl(clUrl);
          
          setOrigOverview(ov);
          setOrigDefinitions(def);
          setOrigClaims(cl);
          setIsLoadingContent(false);
        };
        loadContents();
      } else {
        setName('');
        setNumber('');
        setRightAlign(false);
        setOverviewContent('');
        setDefinitionsContent('');
        setClaimsContent('');
        setOverviewUrl('');
        setDefinitionsUrl('');
        setClaimsUrl('');
        setOrigOverview('');
        setOrigDefinitions('');
        setOrigClaims('');
        setOverviewFileType('md');
        setDefinitionsFileType('md');
        setClaimsFileType('md');
        setNewOverviewFile(null);
        setNewDefinitionsFile(null);
        setNewClaimsFile(null);
      }
    }
  }, [course, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const courseNum = number.trim().replace(/[^a-zA-Z0-9._-]/g, '');
      const isNumberChanged = course && courseNum !== course.number?.trim().replace(/[^a-zA-Z0-9._-]/g, '');
      
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

      let finalOvId = course?.overviewID || '';
      if (overviewFileType === 'pdf') {
        if (newOverviewFile) finalOvId = await uploadFile(newOverviewFile, `overview-${courseNum}`.toLowerCase(), finalOvId, 'pdf');
      } else if (overviewContent !== origOverview || isNumberChanged) {
        const id = `overview-${courseNum}`.toLowerCase();
        finalOvId = await uploadFile(overviewContent, id, finalOvId, overviewFileType);
      }

      let finalDefId = course?.definitionsID || '';
      if (definitionsFileType === 'pdf') {
        if (newDefinitionsFile) finalDefId = await uploadFile(newDefinitionsFile, `definitions-${courseNum}`.toLowerCase(), finalDefId, 'pdf');
      } else if (definitionsContent !== origDefinitions || isNumberChanged) {
        const id = `definitions-${courseNum}`.toLowerCase();
        finalDefId = await uploadFile(definitionsContent, id, finalDefId, definitionsFileType);
      }

      let finalClId = course?.claimsID || '';
      if (claimsFileType === 'pdf') {
        if (newClaimsFile) finalClId = await uploadFile(newClaimsFile, `claims-${courseNum}`.toLowerCase(), finalClId, 'pdf');
      } else if (claimsContent !== origClaims || isNumberChanged) {
        const id = `claims-${courseNum}`.toLowerCase();
        finalClId = await uploadFile(claimsContent, id, finalClId, claimsFileType);
      }

      const data = {
        name,
        number: courseNum,
        rightAlign,
        overviewID: finalOvId,
        definitionsID: finalDefId,
        claimsID: finalClId
      };

      if (course) {
        await api.updateCourse(course.$id, data);
      } else {
        const docId = courseNum.trim(); // Use exact number as ID as requested
        await api.createCourse(docId, data);
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'שגיאה בשמירת הקורס');
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
            className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
              <h2 className="text-2xl font-bold text-zinc-50">
                {course ? 'עריכת קורס' : 'הוספת קורס חדש'}
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
                <div className="p-4 bg-red-900/30 text-red-400 rounded-xl text-sm border border-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">שם הקורס</label>
                  <input
                    type="text"
                    required
                    disabled={isLoadingContent}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">מספר הקורס</label>
                  <input
                    type="text"
                    required
                    disabled={isLoadingContent}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rightAlign"
                  checked={rightAlign}
                  onChange={(e) => setRightAlign(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="rightAlign" className="text-sm font-medium text-zinc-300">
                  יישור לימין (RTL)
                </label>
              </div>

              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>טוען תוכן...</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Overview Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h3 className="text-lg font-bold text-zinc-100">סילבוס / סקירה</h3>
                      <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg">
                        <button type="button" onClick={() => setOverviewFileType('md')} className={`px-3 py-1 rounded-md text-xs transition-colors ${overviewFileType === 'md' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                        <button type="button" onClick={() => setOverviewFileType('pdf')} className={`px-3 py-1 rounded-md text-xs transition-colors ${overviewFileType === 'pdf' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                      </div>
                    </div>
                    {overviewFileType === 'pdf' ? (
                      <div className="p-6 bg-amber-900/30 border border-amber-800 rounded-xl text-amber-200">
                        <p className="font-bold mb-2">סילבוס זה הוא קובץ PDF.</p>
                        {course?.overviewID && overviewUrl && (
                          <a href={overviewUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline mb-4 block">הורד קובץ PDF קיים</a>
                        )}
                        <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                        <div className="mt-4">
                          <label className="cursor-pointer inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                            בחר קובץ PDF חדש
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setNewOverviewFile(e.target.files?.[0] || null)} />
                          </label>
                          {newOverviewFile && <p className="mt-2 text-sm text-zinc-400">{newOverviewFile.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <textarea
                          rows={8}
                          value={overviewContent}
                          onChange={(e) => setOverviewContent(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                          dir={rightAlign ? 'rtl' : 'ltr'}
                          placeholder="# סילבוס הקורס..."
                        />
                        <div className="w-full px-6 py-4 rounded-xl border border-zinc-700 bg-zinc-800 h-[200px] overflow-y-auto prose prose-invert max-w-none text-sm">
                          {overviewContent ? <NestedMarkdown content={overviewContent} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Definitions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h3 className="text-lg font-bold text-zinc-100">הגדרות</h3>
                      <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg">
                        <button type="button" onClick={() => setDefinitionsFileType('md')} className={`px-3 py-1 rounded-md text-xs transition-colors ${definitionsFileType === 'md' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                        <button type="button" onClick={() => setDefinitionsFileType('pdf')} className={`px-3 py-1 rounded-md text-xs transition-colors ${definitionsFileType === 'pdf' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                      </div>
                    </div>
                    {definitionsFileType === 'pdf' ? (
                      <div className="p-6 bg-amber-900/30 border border-amber-800 rounded-xl text-amber-200">
                        <p className="font-bold mb-2">דף הגדרות זה הוא קובץ PDF.</p>
                        {course?.definitionsID && definitionsUrl && (
                          <a href={definitionsUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline mb-4 block">הורד קובץ PDF קיים</a>
                        )}
                        <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                        <div className="mt-4">
                          <label className="cursor-pointer inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                            בחר קובץ PDF חדש
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setNewDefinitionsFile(e.target.files?.[0] || null)} />
                          </label>
                          {newDefinitionsFile && <p className="mt-2 text-sm text-zinc-400">{newDefinitionsFile.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <textarea
                          rows={8}
                          value={definitionsContent}
                          onChange={(e) => setDefinitionsContent(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                          dir={rightAlign ? 'rtl' : 'ltr'}
                          placeholder="## הגדרות..."
                        />
                        <div className="w-full px-6 py-4 rounded-xl border border-zinc-700 bg-zinc-800 h-[200px] overflow-y-auto prose prose-invert max-w-none text-sm">
                          {definitionsContent ? <NestedMarkdown content={definitionsContent} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Claims Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h3 className="text-lg font-bold text-zinc-100">משפטים</h3>
                      <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg">
                        <button type="button" onClick={() => setClaimsFileType('md')} className={`px-3 py-1 rounded-md text-xs transition-colors ${claimsFileType === 'md' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                        <button type="button" onClick={() => setClaimsFileType('pdf')} className={`px-3 py-1 rounded-md text-xs transition-colors ${claimsFileType === 'pdf' ? 'bg-zinc-700 shadow-sm text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                      </div>
                    </div>
                    {claimsFileType === 'pdf' ? (
                      <div className="p-6 bg-amber-900/30 border border-amber-800 rounded-xl text-amber-200">
                        <p className="font-bold mb-2">דף משפטים זה הוא קובץ PDF.</p>
                        {course?.claimsID && claimsUrl && (
                          <a href={claimsUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline mb-4 block">הורד קובץ PDF קיים</a>
                        )}
                        <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                        <div className="mt-4">
                          <label className="cursor-pointer inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                            בחר קובץ PDF חדש
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setNewClaimsFile(e.target.files?.[0] || null)} />
                          </label>
                          {newClaimsFile && <p className="mt-2 text-sm text-zinc-400">{newClaimsFile.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <textarea
                          rows={8}
                          value={claimsContent}
                          onChange={(e) => setClaimsContent(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                          dir={rightAlign ? 'rtl' : 'ltr'}
                          placeholder="## משפטים חשובים..."
                        />
                        <div className="w-full px-6 py-4 rounded-xl border border-zinc-700 bg-zinc-800 h-[200px] overflow-y-auto prose prose-invert max-w-none text-sm">
                          {claimsContent ? <NestedMarkdown content={claimsContent} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || !course}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isDeleting ? 'מוחק...' : 'מחק קורס'}
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
                    {isSaving ? 'שומר...' : 'שמור קורס'}
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
