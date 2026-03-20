import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, writeAuthSession } from '../utils/storage';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userData = localStorage.getItem('user');

      if (!isLoggedIn || !userData) {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }

      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      const payload = await response.json();

      if (!response.ok || !payload.success || !payload.user) {
        clearAuthSession();
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }

      writeAuthSession({ user: payload.user });
      setUser(payload.user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Error checking auth status:', error);
      clearAuthSession();
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData) => {
    try {
      writeAuthSession({ user: userData });
      setUser(userData);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    try {
      clearAuthSession();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (newUserData) => {
    try {
      localStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const isAdmin = () => {
    return hasRole('admin');
  };

  const isClient = () => {
    return hasRole('client');
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    hasRole,
    isAdmin,
    isClient
  };
};
