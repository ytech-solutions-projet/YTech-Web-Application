import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailVerification from './pages/EmailVerification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Devis from './pages/Devis';
import About from './pages/About';
import Portfolio from './pages/Portfolio';
import Legal from './pages/Legal';
import Dashboard from './pages/Dashboard';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import DevisManagement from './pages/DevisManagement';
import Messages from './pages/Messages';
import AdminMessages from './pages/AdminMessages';
import Chatbot from './components/Chatbot';
import { ensureCsrfToken, fetchJson } from './utils/http';
import {
  AUTH_CHANGE_EVENT,
  clearAuthSession,
  readAuthUser,
  writeAuthSession
} from './utils/storage';
import './styles/commercial.css';

const THEME_STORAGE_KEY = 'ytech-theme';

const readInitialTheme = () => {
  try {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (error) {
    console.warn('Impossible de lire le theme en stockage local.', error);
    return 'light';
  }
};

const ProtectedRoute = ({ children, authReady, authUser }) => {
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  if (authUser) {
    return children;
  }

  const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
  return <Navigate to={`/login?next=${next}`} replace />;
};

const AdminRoute = ({ children, authReady, authUser }) => {
  if (!authReady) {
    return null;
  }

  if (!authUser) {
    return <Navigate to="/login" />;
  }

  return authUser.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

function App() {
  const [theme, setTheme] = useState(readInitialTheme);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(() => readAuthUser());

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Impossible de sauvegarder le theme.', error);
    }
  }, [theme]);

  useEffect(() => {
    ensureCsrfToken().catch(() => undefined);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncServerSession = async () => {
      try {
        const { payload } = await fetchJson('/api/auth/verify');

        if (!payload.user) {
          clearAuthSession();
          if (isMounted) {
            setAuthUser(null);
          }
        } else {
          writeAuthSession({ user: payload.user });
          if (isMounted) {
            setAuthUser(payload.user);
          }
        }
      } catch (error) {
        clearAuthSession();
        if (isMounted) {
          setAuthUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    syncServerSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      setAuthUser(readAuthUser());
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      if (event.newValue === 'dark' || event.newValue === 'light') {
        setTheme(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router>
      <div className="app">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main className="app-main">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/devis" element={<Devis />} />
            <Route path="/about" element={<About />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute authReady={authReady} authUser={authUser}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/messages" element={
              <ProtectedRoute authReady={authReady} authUser={authUser}>
                <Messages />
              </ProtectedRoute>
            } />
            
            <Route path="/devis-management" element={
              <ProtectedRoute authReady={authReady} authUser={authUser}>
                <DevisManagement />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin-messages" element={
              <AdminRoute authReady={authReady} authUser={authUser}>
                <AdminMessages />
              </AdminRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Chatbot />
      </div>
    </Router>
  );
}

export default App;
