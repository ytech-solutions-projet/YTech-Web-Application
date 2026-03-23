import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchJson } from '../utils/http';
import { AUTH_CHANGE_EVENT, clearAuthSession } from '../utils/storage';
import './Header.css';

const publicLinks = [
  { to: '/', label: 'Accueil' },
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/about', label: 'A propos' },
  { to: '/devis', label: 'Devis' },
  { to: '/contact?intent=support', label: 'Contact', matchPath: '/contact' }
];

const getRoleLabel = (role) => {
  if (role === 'admin') {
    return 'Administrateur';
  }

  return 'Client';
};

const getUserInitials = (name = '') => {
  const chunks = name.trim().split(/\s+/).filter(Boolean);

  if (chunks.length === 0) {
    return 'YT';
  }

  return chunks
    .slice(0, 2)
    .map((chunk) => chunk[0].toUpperCase())
    .join('');
};

const readAuthState = () => {
  try {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const rawUser = localStorage.getItem('user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;

    if (!loggedIn || !parsedUser) {
      return {
        isLoggedIn: false,
        user: null
      };
    }

    return {
      isLoggedIn: true,
      user: parsedUser
    };
  } catch (error) {
    console.warn("Impossible de lire l'etat de connexion.", error);
    return {
      isLoggedIn: false,
      user: null
    };
  }
};

const Header = ({ theme = 'light', onToggleTheme = () => {} }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const privateLinks = isLoggedIn
    ? user?.role === 'admin'
      ? [
          { to: '/dashboard', label: 'Espace admin' },
          { to: '/devis-management', label: 'Gestion devis' },
          { to: '/admin-messages', label: 'Conversations' }
        ]
      : [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/devis-management', label: 'Mes devis' },
          { to: '/payment', label: 'Paiement' },
          { to: '/messages', label: 'Messages' }
        ]
    : [];

  useEffect(() => {
    const syncAuthState = () => {
      const authState = readAuthState();
      setIsLoggedIn(authState.isLoggedIn);
      setUser(authState.user);
    };

    syncAuthState();
    window.addEventListener('storage', syncAuthState);
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    };
  }, []);

  useEffect(() => {
    const authState = readAuthState();
    setIsLoggedIn(authState.isLoggedIn);
    setUser(authState.user);
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = '';
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!userMenuRef.current || userMenuRef.current.contains(event.target)) {
        return;
      }

      setIsUserMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    try {
      await fetchJson('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.warn("Impossible de notifier la deconnexion cote serveur.", error);
    }

    clearAuthSession();
    setIsLoggedIn(false);
    setUser(null);
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const nextThemeLabel = theme === 'dark' ? 'clair' : 'sombre';
  const themeStatusLabel = theme === 'dark' ? 'Mode sombre' : 'Mode clair';

  const renderThemeToggle = (extraClassName = '') => (
    <button
      type="button"
      className={['theme-toggle', theme === 'dark' ? 'is-dark' : '', extraClassName]
        .filter(Boolean)
        .join(' ')}
      onClick={onToggleTheme}
      aria-label={`Passer en mode ${nextThemeLabel}`}
      title={`Passer en mode ${nextThemeLabel}`}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__text">{themeStatusLabel}</span>
    </button>
  );

  return (
    <header className={`header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="header-container">
        <div className="header-shell">
          <div className="header-content">
            <Link to="/" className="header-logo" onClick={closeMenus}>
              <span className="logo-badge">YT</span>
              <span className="logo-copy">
                <span className="logo-text">YTECH</span>
                <span className="logo-eyebrow">Design et croissance</span>
              </span>
            </Link>

            <nav className="header-nav" aria-label="Navigation principale">
              <div className="nav-menu">
                {publicLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`nav-link ${isActive(link.matchPath || link.to.split('?')[0]) ? 'active' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="header-actions">
              {renderThemeToggle()}

              {!isLoggedIn ? (
                <div className="auth-buttons">
                  <Link
                    to="/login"
                    className={`btn btn-ghost ${isActive('/login') ? 'is-current' : ''}`}
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className={`btn btn-primary ${isActive('/register') ? 'is-current' : ''}`}
                  >
                    Inscription
                  </Link>
                </div>
              ) : (
                <div
                  ref={userMenuRef}
                  className={`user-dropdown ${isUserMenuOpen ? 'open' : ''}`}
                >
                  <button
                    type="button"
                    className="user-toggle"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    aria-expanded={isUserMenuOpen}
                    aria-label="Ouvrir le menu utilisateur"
                  >
                    <span className="user-avatar">{getUserInitials(user?.name)}</span>
                    <span className="user-meta">
                      <strong>{user?.name || 'Compte YTECH'}</strong>
                      <span>{getRoleLabel(user?.role)}</span>
                    </span>
                    <span className="user-arrow">{isUserMenuOpen ? '^' : 'v'}</span>
                  </button>

                  <div className="user-dropdown-menu">
                    {privateLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`user-dropdown-link ${isActive(link.to) ? 'active' : ''}`}
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      className="user-dropdown-link user-dropdown-logout"
                      onClick={handleLogout}
                    >
                      Deconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`mobile-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Ouvrir le menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <Link to="/" className="mobile-menu-logo" onClick={closeMenus}>
            <span className="logo-badge">YT</span>
            <span className="logo-copy">
              <span className="logo-text">YTECH</span>
              <span className="logo-eyebrow">Design et croissance</span>
            </span>
          </Link>

          <button
            type="button"
            className="mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            x
          </button>
        </div>

        <div className="mobile-menu-body">
          {isLoggedIn && (
            <div className="mobile-user-card">
              <span className="user-avatar">{getUserInitials(user?.name)}</span>
              <div className="mobile-user-copy">
                <strong>{user?.name || 'Compte YTECH'}</strong>
                <span>{getRoleLabel(user?.role)}</span>
              </div>
            </div>
          )}

          <div className="mobile-menu-section">
            <span className="mobile-menu-label">Navigation</span>
            <div className="mobile-menu-grid">
              {publicLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`mobile-nav-link ${isActive(link.matchPath || link.to.split('?')[0]) ? 'active' : ''}`}
                  onClick={closeMenus}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {isLoggedIn && (
            <div className="mobile-menu-section">
              <span className="mobile-menu-label">Votre espace</span>
              <div className="mobile-menu-grid">
                {privateLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`mobile-nav-link ${isActive(link.to) ? 'active' : ''}`}
                    onClick={closeMenus}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mobile-menu-section">
            <span className="mobile-menu-label">Affichage</span>
            {renderThemeToggle('theme-toggle--mobile')}
          </div>

          <div className="mobile-menu-footer">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="btn btn-ghost" onClick={closeMenus}>
                  Connexion
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={closeMenus}>
                  Inscription
                </Link>
              </>
            ) : (
              <button type="button" className="btn btn-danger" onClick={handleLogout}>
                Deconnexion
              </button>
            )}
          </div>
        </div>
      </aside>
    </header>
  );
};

export default Header;
