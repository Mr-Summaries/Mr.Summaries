import { useEffect, useState, useMemo, useDeferredValue, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { databases, APPWRITE_CONFIG, Query } from '../lib/appwrite';
import { Search, FileText, Plus, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { SummaryModal } from '../components/SummaryModal';

const Summaries = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const fetchSummaries = useCallback(async () => {
    try {
      const courseRes = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        id!
      );
      setCourse(courseRes);

      const summariesRes = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        [Query.equal('courseID', id!)]
      );
      setSummaries(summariesRes.documents);
    } catch (error) {
      console.error('Error fetching summaries', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => 
      s.name.includes(deferredSearch)
    );
  }, [summaries, deferredSearch]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">טוען...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <div className="mb-8">
        <Link to={`/course/${id}`} className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline mb-4">
          <ArrowRight className="w-4 h-4" />
          חזרה לקורס
        </Link>
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          סיכומים: {course?.name}
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-400 mr-3" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-3 border border-zinc-200 dark:border-zinc-700/50 rounded-xl leading-5 bg-zinc-200/80 dark:bg-zinc-800/40 backdrop-blur-xl placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-sm text-zinc-900 dark:text-zinc-100"
            placeholder="חיפוש סיכומים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsSummaryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            הוסף סיכום
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSummaries.map((summary) => (
          <Link 
            key={summary.$id} 
            to={`/summary/${summary.$id}`}
            className="group p-6 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all flex flex-col items-start gap-4"
          >
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {summary.name}
            </h3>
          </Link>
        ))}
        {filteredSummaries.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/60 backdrop-blur-md rounded-2xl border border-zinc-100/50 dark:border-zinc-700/50">
            לא נמצאו סיכומים התואמים את החיפוש.
          </div>
        )}
      </div>

      <SummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        onSave={fetchSummaries} 
        courseId={id}
        courseNumber={course?.number}
      />
    </div>
  );
};

export default Summaries;
