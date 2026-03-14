import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Clip } from './pages/Clip';
import { MyClips } from './pages/MyClips';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/clips/:id" element={<Clip />} />
            <Route path="/my-clips" element={<MyClips />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
