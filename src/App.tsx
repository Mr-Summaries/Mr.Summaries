import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from './store/useAuthStore';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Course = lazy(() => import('./pages/Course').then(module => ({ default: module.Course })));
const Summaries = lazy(() => import('./pages/Summaries').then(module => ({ default: module.Summaries })));
const Summary = lazy(() => import('./pages/Summary').then(module => ({ default: module.Summary })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
    טוען...
  </div>
);

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="course/:id" element={<Course />} />
            <Route path="course/:id/summaries" element={<Summaries />} />
            <Route path="summary/:id" element={<Summary />} />
            <Route path="login" element={<Login />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
