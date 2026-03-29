import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { ErrorBoundary } from './components/ErrorBoundary';

const Course = lazy(() => import('./pages/Course'));
const Summaries = lazy(() => import('./pages/Summaries'));
const Summary = lazy(() => import('./pages/Summary'));
const Example = lazy(() => import('./pages/Example'));
const Lecture = lazy(() => import('./pages/Lecture'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Home = lazy(() => import('./pages/Home'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50">
    טוען...
  </div>
);

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="course/:id" element={<Course />} />
              <Route path="course/:id/summaries" element={<Summaries />} />
              <Route path="summary/:id" element={<Summary />} />
              <Route path="example/:id" element={<Example />} />
              <Route path="lecture/:id" element={<Lecture />} />
              <Route path="login" element={<Login />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
