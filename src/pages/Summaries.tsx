import { useEffect, useState, useMemo, useDeferredValue, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Search, FileText, Plus, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { ContentModal } from '../components/ContentModal';

const Summaries = () => {
  const { id } = useParams();
  const { isAdmin } = useAuthStore();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSummaries = useCallback(async () => {
    try {
      const courseRes = await api.getCourse(id!);
      setCourse(courseRes);

      const summariesRes = await api.getSummaries(id!);
      setSummaries(summariesRes.documents);
    } catch (error: any) {
      if (error.code === 404) {
        setCourse(null);
      } else {
        console.error('Error fetching summaries', error);
      }
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

  if (!course) {
    return <div className="text-center text-red-500 py-12">קורס לא נמצא</div>;
  }

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <div className="mb-8">
        <Link to={`/course/${id}`} className="inline-flex items-center gap-2 text-cyan-400 hover:underline mb-4">
          <ArrowRight className="w-4 h-4" />
          חזרה לקורס
        </Link>
        <h1 className="text-4xl font-bold text-zinc-100 mb-2">
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
            className="block w-full pl-10 pr-12 py-3 border border-zinc-700/50 rounded-xl leading-5 bg-zinc-800/40 backdrop-blur-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-sm text-zinc-100"
            placeholder="חיפוש סיכומים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
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
            className="group p-6 rounded-2xl bg-zinc-800/40 backdrop-blur-md border border-zinc-700/50 shadow-sm hover:shadow-md hover:border-cyan-500 transition-all flex flex-col items-start gap-4"
          >
            <div className="p-3 bg-cyan-900/30 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
              {summary.name}
            </h3>
          </Link>
        ))}
        {filteredSummaries.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-400 bg-zinc-800/60 backdrop-blur-md rounded-2xl border border-zinc-700/50">
            לא נמצאו סיכומים התואמים את החיפוש.
          </div>
        )}
      </div>

      <ContentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchSummaries} 
        courseId={id}
        courseNumber={course?.number}
        type="summary"
      />
    </div>
  );
};

export default Summaries;
