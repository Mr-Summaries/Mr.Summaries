import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Course } from './pages/Course';
import { Summaries } from './pages/Summaries';
import { Summary } from './pages/Summary';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
