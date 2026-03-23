import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Eye, Edit3 } from 'lucide-react';
import { databases, storage, APPWRITE_CONFIG, ID } from '../lib/appwrite';
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

export const CourseModal: React.FC<CourseModalProps> = React.memo(({ isOpen, onClose, onSave, course }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [rightAlign, setRightAlign] = useState(false);
  const [overviewContent, setOverviewContent] = useState('');
  const [definitionsContent, setDefinitionsContent] = useState('');
  const [claimsContent, setClaimsContent] = useState('');
  
  const [origOverview, setOrigOverview] = useState('');
  const [origDefinitions, setOrigDefinitions] = useState('');
  const [origClaims, setOrigClaims] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');
  
  const [isOverviewPdf, setIsOverviewPdf] = useState(false);
  const [newOverviewPdf, setNewOverviewPdf] = useState<File | null>(null);
  const [isDefinitionsPdf, setIsDefinitionsPdf] = useState(false);
  const [newDefinitionsPdf, setNewDefinitionsPdf] = useState<File | null>(null);
  const [isClaimsPdf, setIsClaimsPdf] = useState(false);
  const [newClaimsPdf, setNewClaimsPdf] = useState<File | null>(null);

  const handleDelete = async () => {
    if (!course || !confirm('האם אתה בטוח שברצונך למחוק קורס זה?')) return;
    setIsDeleting(true);
    setError('');
    try {
      const filesToDelete = [course.overviewID, course.definitionsID, course.claimsID].filter(Boolean);
      for (const fileId of filesToDelete) {
        try {
          await storage.deleteFile(APPWRITE_CONFIG.storageBucketId, fileId);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        course.$id
      );
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
          setIsOverviewPdf(false);
          setIsDefinitionsPdf(false);
          setIsClaimsPdf(false);
          setNewOverviewPdf(null);
          setNewDefinitionsPdf(null);
          setNewClaimsPdf(null);

          const checkPdf = async (fileId: string) => {
            try {
              const file = await storage.getFile(APPWRITE_CONFIG.storageBucketId, fileId);
              return file.mimeType === 'application/pdf';
            } catch (e) {
              return false;
            }
          };

          const [ov, def, cl] = await Promise.all([
            fetchFileContent(course.overviewID),
            fetchFileContent(course.definitionsID),
            fetchFileContent(course.claimsID)
          ]);
          
          setIsOverviewPdf(await checkPdf(course.overviewID));
          setIsDefinitionsPdf(await checkPdf(course.definitionsID));
          setIsClaimsPdf(await checkPdf(course.claimsID));
          
          setOverviewContent(ov);
          setDefinitionsContent(def);
          setClaimsContent(cl);
          
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
        setOrigOverview('');
        setOrigDefinitions('');
        setOrigClaims('');
        setIsOverviewPdf(false);
        setIsDefinitionsPdf(false);
        setIsClaimsPdf(false);
        setNewOverviewPdf(null);
        setNewDefinitionsPdf(null);
        setNewClaimsPdf(null);
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
      
      const uploadPdf = async (file: File, id: string, oldFileId: string) => {
        try {
          await storage.deleteFile(APPWRITE_CONFIG.storageBucketId, oldFileId);
        } catch (e) {}
        const res = await storage.createFile(APPWRITE_CONFIG.storageBucketId, id, file);
        return res.$id;
      };

      let finalOvId = course?.overviewID || '';
      if (isOverviewPdf) {
        if (newOverviewPdf) finalOvId = await uploadPdf(newOverviewPdf, `overview-${courseNum}`.toLowerCase(), finalOvId);
      } else if (overviewContent !== origOverview || isNumberChanged) {
        const id = `overview-${courseNum}`.toLowerCase();
        const filename = `Overview-${courseNum}.md`;
        finalOvId = overviewContent.trim() ? await uploadContent(overviewContent, filename, id) : '';
      }

      let finalDefId = course?.definitionsID || '';
      if (isDefinitionsPdf) {
        if (newDefinitionsPdf) finalDefId = await uploadPdf(newDefinitionsPdf, `definitions-${courseNum}`.toLowerCase(), finalDefId);
      } else if (definitionsContent !== origDefinitions || isNumberChanged) {
        const id = `definitions-${courseNum}`.toLowerCase();
        const filename = `Definitions-${courseNum}.md`;
        finalDefId = definitionsContent.trim() ? await uploadContent(definitionsContent, filename, id) : '';
      }

      let finalClId = course?.claimsID || '';
      if (isClaimsPdf) {
        if (newClaimsPdf) finalClId = await uploadPdf(newClaimsPdf, `claims-${courseNum}`.toLowerCase(), finalClId);
      } else if (claimsContent !== origClaims || isNumberChanged) {
        const id = `claims-${courseNum}`.toLowerCase();
        const filename = `Claims-${courseNum}.md`;
        finalClId = claimsContent.trim() ? await uploadContent(claimsContent, filename, id) : '';
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
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.coursesCollectionId,
          course.$id,
          data
        );
      } else {
        const docId = courseNum.trim(); // Use exact number as ID as requested
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.coursesCollectionId,
          docId,
          data
        );
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
            className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
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
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">שם הקורס</label>
                  <input
                    type="text"
                    required
                    disabled={isLoadingContent}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">מספר הקורס</label>
                  <input
                    type="text"
                    required
                    disabled={isLoadingContent}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
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
                <label htmlFor="rightAlign" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  יישור לימין (RTL)
                </label>
              </div>

              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-cyan-600 dark:text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>טוען תוכן...</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Overview Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">סילבוס / סקירה</h3>
                      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button type="button" onClick={() => setIsOverviewPdf(false)} className={`px-3 py-1 rounded-md text-xs transition-colors ${!isOverviewPdf ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                        <button type="button" onClick={() => setIsOverviewPdf(true)} className={`px-3 py-1 rounded-md text-xs transition-colors ${isOverviewPdf ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                      </div>
                    </div>
                    {isOverviewPdf ? (
                      <div className="p-6 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200">
                        <p className="font-bold mb-2">סילבוס זה הוא קובץ PDF.</p>
                        {course?.overviewID && (
                          <a href={storage.getFileView(APPWRITE_CONFIG.storageBucketId, course.overviewID).toString()} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 underline mb-4 block">הורד קובץ PDF קיים</a>
                        )}
                        <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                        <div className="mt-4">
                          <label className="cursor-pointer inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                            בחר קובץ PDF חדש
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setNewOverviewPdf(e.target.files?.[0] || null)} />
                          </label>
                          {newOverviewPdf && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{newOverviewPdf.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <textarea
                          rows={8}
                          value={overviewContent}
                          onChange={(e) => setOverviewContent(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                          dir={rightAlign ? 'rtl' : 'ltr'}
                          placeholder="# סילבוס הקורס..."
                        />
                        <div className="w-full px-6 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 h-[200px] overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                          {overviewContent ? <NestedMarkdown content={overviewContent} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Definitions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">הגדרות</h3>
                      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button type="button" onClick={() => setIsDefinitionsPdf(false)} className={`px-3 py-1 rounded-md text-xs transition-colors ${!isDefinitionsPdf ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                        <button type="button" onClick={() => setIsDefinitionsPdf(true)} className={`px-3 py-1 rounded-md text-xs transition-colors ${isDefinitionsPdf ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                      </div>
                    </div>
                    {isDefinitionsPdf ? (
                      <div className="p-6 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200">
                        <p className="font-bold mb-2">דף הגדרות זה הוא קובץ PDF.</p>
                        {course?.definitionsID && (
                          <a href={storage.getFileView(APPWRITE_CONFIG.storageBucketId, course.definitionsID).toString()} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 underline mb-4 block">הורד קובץ PDF קיים</a>
                        )}
                        <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                        <div className="mt-4">
                          <label className="cursor-pointer inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                            בחר קובץ PDF חדש
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setNewDefinitionsPdf(e.target.files?.[0] || null)} />
                          </label>
                          {newDefinitionsPdf && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{newDefinitionsPdf.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <textarea
                          rows={8}
                          value={definitionsContent}
                          onChange={(e) => setDefinitionsContent(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                          dir={rightAlign ? 'rtl' : 'ltr'}
                          placeholder="## הגדרות..."
                        />
                        <div className="w-full px-6 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 h-[200px] overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                          {definitionsContent ? <NestedMarkdown content={definitionsContent} rightAlign={rightAlign} /> : <p className="text-zinc-400 italic text-center mt-10">אין תוכן להצגה</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Claims Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">משפטים</h3>
                      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button type="button" onClick={() => setIsClaimsPdf(false)} className={`px-3 py-1 rounded-md text-xs transition-colors ${!isClaimsPdf ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>Markdown</button>
                        <button type="button" onClick={() => setIsClaimsPdf(true)} className={`px-3 py-1 rounded-md text-xs transition-colors ${isClaimsPdf ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>PDF</button>
                      </div>
                    </div>
                    {isClaimsPdf ? (
                      <div className="p-6 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200">
                        <p className="font-bold mb-2">דף משפטים זה הוא קובץ PDF.</p>
                        {course?.claimsID && (
                          <a href={storage.getFileView(APPWRITE_CONFIG.storageBucketId, course.claimsID).toString()} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 underline mb-4 block">הורד קובץ PDF קיים</a>
                        )}
                        <p>כדי לעדכן אותו, יש להעלות קובץ PDF חדש.</p>
                        <div className="mt-4">
                          <label className="cursor-pointer inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                            בחר קובץ PDF חדש
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setNewClaimsPdf(e.target.files?.[0] || null)} />
                          </label>
                          {newClaimsPdf && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{newClaimsPdf.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <textarea
                          rows={8}
                          value={claimsContent}
                          onChange={(e) => setClaimsContent(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                          dir={rightAlign ? 'rtl' : 'ltr'}
                          placeholder="## משפטים חשובים..."
                        />
                        <div className="w-full px-6 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 h-[200px] overflow-y-auto prose dark:prose-invert max-w-none text-sm">
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
