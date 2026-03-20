import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/app-shell.css';
import { formatDate, getInitials } from '../utils/helpers';
import { readAuthUser } from '../utils/storage';
import { listContactRequests, listMessages, listQuotes } from '../utils/businessApi';

const getContactRequestLabel = (request = {}) => {
  if (typeof request.requestLabel === 'string' && request.requestLabel.trim()) {
    return request.requestLabel.trim();
  }

  return request.requestCategory === 'quote_help' ? 'Aide devis' : "Besoin d'aide";
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    activeProjects: 0,
    messagesCount: 0,
    quotesCount: 0,
    requestsCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let intervalId;
    let isMounted = true;
    const authUser = readAuthUser();

    if (!authUser) {
      navigate('/login');
      return;
    }

    setUser(authUser);
    const loadDashboardData = async () => {
      try {
        const [messages, contactRequests, quotes] = await Promise.all([
          listMessages(),
          listContactRequests(),
          listQuotes()
        ]);

        if (!isMounted) {
          return;
        }

        setStats({
          activeProjects: quotes.filter((quote) => ['approved', 'in_progress'].includes(quote.status)).length,
          messagesCount: messages.length,
          quotesCount: quotes.length,
          requestsCount: contactRequests.length
        });

        const activity = [
          ...messages.map((message) => ({
            id: `message-${message.id}`,
            label: 'Message envoye',
            meta: message.recipientName || 'Equipe YTECH',
            timestamp: message.timestamp,
            status: message.status === 'sent' ? 'is-success' : 'is-info',
            badge: message.status === 'sent' ? 'Envoye' : 'Nouveau',
            icon: 'MSG'
          })),
          ...quotes.map((quote) => ({
            id: `quote-${quote.id}`,
            label: quote.metadata?.service || 'Demande de devis',
            meta: quote.metadata?.budget || 'Budget a definir',
            timestamp: quote.timestamp,
            status:
              quote.status === 'approved'
                ? 'is-success'
                : quote.status === 'rejected'
                  ? 'is-danger'
                  : quote.status === 'in_progress'
                    ? 'is-info'
                    : 'is-warning',
            badge:
              quote.status === 'approved'
                ? 'Approuve'
                : quote.status === 'rejected'
                  ? 'Rejete'
                  : quote.status === 'in_progress'
                    ? 'En cours'
                    : 'En attente',
            icon: 'DV'
          })),
          ...contactRequests.map((request) => ({
            id: `contact-${request.id}`,
            label: getContactRequestLabel(request),
            meta: request.service || 'Projet a discuter',
            timestamp: request.timestamp,
            status: 'is-warning',
            badge: 'Recu',
            icon: 'CTA'
          }))
        ]
          .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp))
          .slice(0, 6);

        setRecentActivity(activity);
      } catch (error) {
        if (isMounted) {
          setStats({
            activeProjects: 0,
            messagesCount: 0,
            quotesCount: 0,
            requestsCount: 0
          });
          setRecentActivity([]);
        }
      }
    };

    loadDashboardData();
    intervalId = window.setInterval(loadDashboardData, 20000);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [navigate]);

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          <div className="workspace-empty">
            <div className="workspace-empty__icon">...</div>
            <div className="workspace-empty__title">Chargement du dashboard</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="workspace-shell">
        <section className="workspace-hero">
          <div className="workspace-hero__content">
            <div className="workspace-hero__copy">
              <span className="workspace-hero__eyebrow">Espace client</span>
              <h1 className="workspace-hero__title">Bienvenue, {user.name}</h1>
              <p className="workspace-hero__text">
                Retrouvez ici vos demandes, vos echanges et les actions les plus utiles pour
                avancer rapidement avec YTECH.
              </p>
            </div>
            <div className="workspace-hero__meta">
              <span className="workspace-hero__badge">{getInitials(user.name) || 'YT'}</span>
              <span className="workspace-hero__label">{user.email}</span>
            </div>
          </div>
        </section>

        <div className="workspace-grid workspace-grid--sidebar">
          <aside className="workspace-stack">
            <div className="workspace-card workspace-card--padded workspace-card--accent">
              <h2 className="workspace-section-title">Vue d'ensemble</h2>
              <p className="workspace-section-copy">
                Votre espace rassemble les devis, les messages et les demandes recentes dans une
                interface plus claire et plus rapide a parcourir.
              </p>
            </div>

            <div className="workspace-card workspace-card--padded">
              <h2 className="workspace-section-title">Acces rapides</h2>
              <p className="workspace-section-copy">
                Les raccourcis les plus utiles pour gerer votre relation avec YTECH.
              </p>

              <div className="workspace-action-grid" style={{ marginTop: '1rem' }}>
                <Link to="/devis" className="workspace-action-card">
                  <span className="workspace-action-card__icon">DV</span>
                  <div>
                    <div className="workspace-action-card__title">Nouveau devis</div>
                    <div className="workspace-action-card__text">
                      Lancez une nouvelle demande en quelques clics.
                    </div>
                  </div>
                </Link>

                <Link to="/messages" className="workspace-action-card">
                  <span className="workspace-action-card__icon">MSG</span>
                  <div>
                    <div className="workspace-action-card__title">Messagerie</div>
                    <div className="workspace-action-card__text">
                      Echangez directement avec notre equipe.
                    </div>
                  </div>
                </Link>

                <Link to="/contact?intent=support" className="workspace-action-card">
                  <span className="workspace-action-card__icon">CTA</span>
                  <div>
                    <div className="workspace-action-card__title">Besoin d'aide</div>
                    <div className="workspace-action-card__text">
                      Partagez un nouveau besoin ou une question.
                    </div>
                  </div>
                </Link>

                <Link to="/services" className="workspace-action-card">
                  <span className="workspace-action-card__icon">SRV</span>
                  <div>
                    <div className="workspace-action-card__title">Services</div>
                    <div className="workspace-action-card__text">
                      Revoir les offres disponibles pour votre projet.
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>

          <main className="workspace-stack">
            <div className="workspace-metrics">
              <div className="workspace-metric">
                <span className="workspace-metric__icon">ACT</span>
                <div className="workspace-metric__value">{stats.activeProjects}</div>
                <div className="workspace-metric__label">Projets actifs</div>
              </div>

              <div className="workspace-metric">
                <span className="workspace-metric__icon">MSG</span>
                <div className="workspace-metric__value">{stats.messagesCount}</div>
                <div className="workspace-metric__label">Messages</div>
              </div>

              <div className="workspace-metric">
                <span className="workspace-metric__icon">DV</span>
                <div className="workspace-metric__value">{stats.quotesCount}</div>
                <div className="workspace-metric__label">Devis</div>
              </div>
            </div>

            <div className="workspace-card workspace-card--padded">
              <div className="workspace-section-head">
                <div>
                  <h2 className="workspace-section-title">Activite recente</h2>
                  <p className="workspace-section-copy">
                    Les derniers echanges et demandes lies a votre espace.
                  </p>
                </div>
                <span className="workspace-pill is-info">{stats.requestsCount} demandes contact</span>
              </div>

              {recentActivity.length === 0 ? (
                <div className="workspace-empty">
                  <div className="workspace-empty__icon">NEW</div>
                  <div className="workspace-empty__title">Aucune activite recente</div>
                  <div className="workspace-empty__text">
                    Commencez par envoyer un message ou demander un devis pour lancer votre espace.
                  </div>
                </div>
              ) : (
                <div className="workspace-list">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="workspace-list-item">
                      <div className="workspace-list-item__main">
                        <span className="workspace-list-item__icon">{item.icon}</span>
                        <div>
                          <div className="workspace-list-item__title">{item.label}</div>
                          <div className="workspace-list-item__meta">
                            {item.meta} · {formatDate(item.timestamp)}
                          </div>
                        </div>
                      </div>
                      <span className={`workspace-pill ${item.status}`}>{item.badge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
