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

const uploadContent = async (content: string, filename: string) => {
  if (!content.trim()) return '';
  const file = new File([content], filename, { type: 'text/markdown' });
  const res = await storage.createFile(APPWRITE_CONFIG.storageBucketId, ID.unique(), file);
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
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (course) {
        setName(course.name || '');
        setNumber(course.number || '');
        setRightAlign(course.rightAlign || false);
        
        const loadContents = async () => {
          setIsLoadingContent(true);
          const ov = await fetchFileContent(course.overviewID);
          const def = await fetchFileContent(course.definitionsID);
          const cl = await fetchFileContent(course.claimsID);
          
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
      }
    }
  }, [course, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      let finalOvId = course?.overviewID || '';
      if (overviewContent !== origOverview) {
        finalOvId = overviewContent.trim() ? await uploadContent(overviewContent, 'overview.md') : '';
      }

      let finalDefId = course?.definitionsID || '';
      if (definitionsContent !== origDefinitions) {
        finalDefId = definitionsContent.trim() ? await uploadContent(definitionsContent, 'definitions.md') : '';
      }

      let finalClId = course?.claimsID || '';
      if (claimsContent !== origClaims) {
        finalClId = claimsContent.trim() ? await uploadContent(claimsContent, 'claims.md') : '';
      }

      const data = {
        name,
        number,
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
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.coursesCollectionId,
          ID.unique(),
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
            className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {course ? 'עריכת קורס' : 'הוספת קורס חדש'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">שם הקורס</label>
                  <input
                    type="text"
                    required
                    disabled={isLoadingContent}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">מספר הקורס</label>
                  <input
                    type="text"
                    required
                    disabled={isLoadingContent}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
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
                <div className="space-y-12">
                  {/* Overview Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">סילבוס / סקירה</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <textarea
                        rows={8}
                        value={overviewContent}
                        onChange={(e) => setOverviewContent(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                        dir={rightAlign ? 'rtl' : 'ltr'}
                        placeholder="# סילבוס הקורס..."
                      />
                      <div className="w-full px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-[200px] overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                        {overviewContent ? <NestedMarkdown content={overviewContent} rightAlign={rightAlign} /> : <p className="text-slate-400 italic text-center mt-10">אין תוכן להצגה</p>}
                      </div>
                    </div>
                  </div>

                  {/* Definitions Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">הגדרות</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <textarea
                        rows={8}
                        value={definitionsContent}
                        onChange={(e) => setDefinitionsContent(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                        dir={rightAlign ? 'rtl' : 'ltr'}
                        placeholder="## הגדרות..."
                      />
                      <div className="w-full px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-[200px] overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                        {definitionsContent ? <NestedMarkdown content={definitionsContent} rightAlign={rightAlign} /> : <p className="text-slate-400 italic text-center mt-10">אין תוכן להצגה</p>}
                      </div>
                    </div>
                  </div>

                  {/* Claims Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">משפטים</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <textarea
                        rows={8}
                        value={claimsContent}
                        onChange={(e) => setClaimsContent(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm resize-none ${rightAlign ? 'text-right' : 'text-left'}`}
                        dir={rightAlign ? 'rtl' : 'ltr'}
                        placeholder="## משפטים חשובים..."
                      />
                      <div className="w-full px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-[200px] overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                        {claimsContent ? <NestedMarkdown content={claimsContent} rightAlign={rightAlign} /> : <p className="text-slate-400 italic text-center mt-10">אין תוכן להצגה</p>}
                      </div>
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
                  {isSaving ? 'שומר...' : 'שמור קורס'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
