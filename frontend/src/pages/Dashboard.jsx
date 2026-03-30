import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/app-shell.css';
import { formatDate, getInitials } from '../utils/helpers';
import { buildQuotePaymentPath, buildReceiptPath, openQuotePaymentWindow } from '../utils/paymentSession';
import { readAuthUser } from '../utils/storage';
import {
  listContactRequests,
  listMessages,
  listQuotes
} from '../utils/businessApi';

const getContactRequestLabel = (request = {}) =>
  request.requestLabel?.trim()
    || (request.requestCategory === 'quote_help' ? 'Aide devis' : "Besoin d'aide");

const getQuoteStatusClass = (status) => {
  switch (status) {
    case 'approved':
      return 'is-success';
    case 'rejected':
      return 'is-danger';
    case 'in_progress':
      return 'is-info';
    default:
      return 'is-warning';
  }
};

const getQuoteStatusLabel = (status) => {
  switch (status) {
    case 'approved':
      return 'Approuve';
    case 'rejected':
      return 'Rejete';
    case 'in_progress':
      return 'Paiement accepte';
    default:
      return 'En attente';
  }
};

const getQuoteSummary = (quote = {}) =>
  quote.metadata?.estimatedRange || quote.metadata?.budget || 'Budget a definir';

const formatPaymentAmount = (quote = {}) => {
  const amount =
    quote.metadata?.paymentAmount ??
    quote.metadata?.estimatedMin ??
    quote.metadata?.estimatedMax ??
    null;

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return 'Montant a confirmer';
  }

  return `${Number(amount).toLocaleString('fr-MA')} ${quote.metadata?.paymentCurrency || 'MAD'}`;
};

const truncateText = (value, maxLength = 150) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    return 'Ouvrez le dossier pour lire toute la description du besoin.';
  }

  return normalizedValue.length > maxLength
    ? `${normalizedValue.slice(0, maxLength)}...`
    : normalizedValue;
};

const pickProjectFocusQuote = (quotes = []) => {
  const priority = { in_progress: 0, approved: 1, pending: 2, rejected: 3 };
  return [...quotes].sort((first, second) => {
    const firstPriority = priority[first.status] ?? 99;
    const secondPriority = priority[second.status] ?? 99;
    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }
    return new Date(second.timestamp) - new Date(first.timestamp);
  })[0] || null;
};

const getProjectStageText = (quote) => {
  switch (quote?.status) {
    case 'approved':
      return 'Votre devis est valide. Le paiement est maintenant attendu pour lancer le projet.';
    case 'in_progress':
      return 'Le paiement a ete confirme et le projet est maintenant en production.';
    case 'rejected':
      return 'Le devis n a pas ete retenu en l etat. Vous pouvez reajuster le besoin avec l equipe.';
    default:
      return 'Votre demande est en cours d analyse par l equipe.';
  }
};

const renderEmpty = (icon, title, text) => (
  <div className="workspace-empty">
    <div className="workspace-empty__icon">{icon}</div>
    <div className="workspace-empty__title">{title}</div>
    <div className="workspace-empty__text">{text}</div>
  </div>
);

const AccountSecurityShortcut = ({ email, isAdmin }) => (
  <div className="workspace-card workspace-card--padded">
    <div className="workspace-section-head">
      <div>
        <h2 className="workspace-section-title">Securite du compte</h2>
        <p className="workspace-section-copy">
          Le mot de passe se modifie maintenant uniquement dans Parametres, avec verification de
          l ancien mot de passe ou envoi d un lien securise par email.
        </p>
      </div>
      <span className={`workspace-pill ${isAdmin ? 'is-danger' : 'is-info'}`}>
        {isAdmin ? 'Acces admin' : 'Acces client'}
      </span>
    </div>

    <p className="workspace-note" style={{ marginTop: '0.85rem' }}>
      Adresse de recuperation: <strong>{email}</strong>
    </p>

    <div className="workspace-inline-actions" style={{ marginTop: '1rem' }}>
      <Link to="/settings" className="workspace-inline-btn is-info">
        Ouvrir les parametres
      </Link>
      <Link to="/forgot-password" className="workspace-inline-btn">
        Page publique
      </Link>
    </div>
  </div>
);

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let intervalId;
    const authUser = readAuthUser();

    if (!authUser) {
      navigate('/login');
      return undefined;
    }

    setUser(authUser);

    const loadDashboardData = async () => {
      try {
        const [nextMessages, nextContacts, nextQuotes] = await Promise.all([
          listMessages(),
          listContactRequests(),
          listQuotes()
        ]);

        if (!isMounted) {
          return;
        }

        setMessages([...nextMessages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setContactRequests([...nextContacts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setQuotes([...nextQuotes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (error) {
        if (isMounted) {
          setMessages([]);
          setContactRequests([]);
          setQuotes([]);
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

  const isAdmin = user?.role === 'admin';
  const totalPendingQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === 'pending').length,
    [quotes]
  );
  const totalWaitingPaymentQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === 'approved').length,
    [quotes]
  );
  const totalActiveProjects = useMemo(
    () => quotes.filter((quote) => quote.status === 'in_progress').length,
    [quotes]
  );
  const pendingQuotes = useMemo(() => quotes.filter((quote) => quote.status === 'pending').slice(0, 4), [quotes]);
  const waitingPaymentQuotes = useMemo(() => quotes.filter((quote) => quote.status === 'approved').slice(0, 4), [quotes]);
  const latestQuotes = useMemo(() => quotes.slice(0, 3), [quotes]);
  const latestContacts = useMemo(() => contactRequests.slice(0, 4), [contactRequests]);
  const latestMessages = useMemo(() => messages.slice(0, 4), [messages]);
  const projectFocusQuote = useMemo(() => pickProjectFocusQuote(quotes), [quotes]);
  const latestPendingQuote = pendingQuotes[0] || null;
  const openClientPaymentWindow = (quoteId) => {
    const paymentWindow = openQuotePaymentWindow(quoteId);

    if (paymentWindow) {
      paymentWindow.focus?.();
      return;
    }

    navigate(buildQuotePaymentPath(quoteId));
  };

  const getReceiptPath = (quote) =>
    buildReceiptPath({
      transactionId: quote?.metadata?.paymentTransactionId,
      quoteId: quote?.id
    });

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          {renderEmpty('...', 'Chargement du dashboard', 'Les donnees sont en cours de recuperation.')}
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          <section className="workspace-hero">
            <div className="workspace-hero__content">
              <div className="workspace-hero__copy">
                <span className="workspace-hero__eyebrow">Panneau admin</span>
                <h1 className="workspace-hero__title">Gestion des devis et des demandes</h1>
                <p className="workspace-hero__text">
                  Le dashboard admin met en avant les nouveaux devis, les paiements attendus et les
                  demandes a traiter pour que vous geriez tout depuis ici.
                </p>
              </div>
              <div className="workspace-hero__meta">
                <span className="workspace-hero__badge">{getInitials(user.name) || 'AD'}</span>
                <span className="workspace-hero__label">
                  {latestPendingQuote
                    ? `${latestPendingQuote.metadata?.service || 'Nouveau devis'} a traiter`
                    : user.email}
                </span>
              </div>
            </div>
          </section>

          <div className="workspace-grid workspace-grid--sidebar">
            <aside className="workspace-stack">
              <div className="workspace-card workspace-card--padded workspace-card--accent">
                <h2 className="workspace-section-title">Vue admin</h2>
                <p className="workspace-section-copy">
                  Ici, l admin voit tout de suite les devis en attente, les clients qui doivent payer
                  et les nouveaux messages.
                </p>
                <p className="workspace-note" style={{ marginTop: '0.85rem' }}>
                  {latestPendingQuote
                    ? `Priorite actuelle : ${latestPendingQuote.senderName || 'Client'} pour ${latestPendingQuote.metadata?.service || 'un projet'}`
                    : 'Aucun devis en attente pour le moment.'}
                </p>
              </div>

              <div className="workspace-card workspace-card--padded">
                <h2 className="workspace-section-title">Acces rapides</h2>
                <div className="workspace-action-grid" style={{ marginTop: '1rem' }}>
                  <Link to="/devis-management" className="workspace-action-card">
                    <span className="workspace-action-card__icon">DV</span>
                    <div>
                      <div className="workspace-action-card__title">Gerer les devis</div>
                      <div className="workspace-action-card__text">Valider, refuser et suivre les demandes.</div>
                    </div>
                  </Link>
                  <Link to="/admin-messages" className="workspace-action-card">
                    <span className="workspace-action-card__icon">MSG</span>
                    <div>
                      <div className="workspace-action-card__title">Messagerie admin</div>
                      <div className="workspace-action-card__text">Voir les conversations et demandes entrantes.</div>
                    </div>
                  </Link>
                  <Link to="/settings" className="workspace-action-card">
                    <span className="workspace-action-card__icon">SEC</span>
                    <div>
                      <div className="workspace-action-card__title">Parametres</div>
                      <div className="workspace-action-card__text">Modifier le mot de passe et securiser le compte admin.</div>
                    </div>
                  </Link>
                  <Link to="/devis-management" className="workspace-action-card">
                    <span className="workspace-action-card__icon">PAY</span>
                    <div>
                      <div className="workspace-action-card__title">Paiements a suivre</div>
                      <div className="workspace-action-card__text">
                        {totalWaitingPaymentQuotes} client(s) attendent encore de payer.
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </aside>

            <main className="workspace-stack">
              <div className="workspace-metrics">
                <div className="workspace-metric">
                  <span className="workspace-metric__icon">NEW</span>
                  <div className="workspace-metric__value">{totalPendingQuotes}</div>
                  <div className="workspace-metric__label">Devis a traiter</div>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__icon">PAY</span>
                  <div className="workspace-metric__value">{totalWaitingPaymentQuotes}</div>
                  <div className="workspace-metric__label">Paiements attendus</div>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__icon">RUN</span>
                  <div className="workspace-metric__value">{totalActiveProjects}</div>
                  <div className="workspace-metric__label">Projets en cours</div>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__icon">CTA</span>
                  <div className="workspace-metric__value">{contactRequests.length}</div>
                  <div className="workspace-metric__label">Demandes de contact</div>
                </div>
              </div>

              <AccountSecurityShortcut email={user.email} isAdmin={isAdmin} />

              <div className="workspace-card workspace-card--padded">
                <div className="workspace-section-head">
                  <div>
                    <h2 className="workspace-section-title">Nouveaux devis</h2>
                    <p className="workspace-section-copy">
                      Les derniers devis apparaissent ici avec un acces direct vers leur fiche de gestion.
                    </p>
                  </div>
                  <Link to="/devis-management" className="workspace-inline-btn">Ouvrir la gestion</Link>
                </div>
                {pendingQuotes.length === 0 ? renderEmpty('DV', 'Aucun nouveau devis', 'Les nouvelles demandes arriveront ici automatiquement.') : (
                  <div className="workspace-list">
                    {pendingQuotes.map((quote) => (
                      <div key={quote.id} className="workspace-list-item">
                        <div className="workspace-list-item__main" style={{ alignItems: 'flex-start' }}>
                          <span className="workspace-list-item__icon">DV</span>
                          <div>
                            <div className="workspace-list-item__title">
                              {quote.metadata?.service || 'Demande de devis'} - {quote.senderName || 'Client'}
                            </div>
                            <div className="workspace-list-item__meta">
                              {getQuoteSummary(quote)} - {quote.metadata?.timeline || 'Delai a confirmer'} - {formatDate(quote.timestamp)}
                            </div>
                            <div className="workspace-note" style={{ marginTop: '0.45rem' }}>
                              {truncateText(quote.content)}
                            </div>
                          </div>
                        </div>
                        <div className="workspace-inline-actions">
                          <Link
                            to={`/devis-management?quoteId=${encodeURIComponent(quote.id)}`}
                            className="workspace-inline-btn is-success"
                          >
                            Traiter
                          </Link>
                          <span className={`workspace-pill ${getQuoteStatusClass(quote.status)}`}>
                            {getQuoteStatusLabel(quote.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="workspace-card workspace-card--padded">
                <div className="workspace-section-head">
                  <div>
                    <h2 className="workspace-section-title">Paiements en attente</h2>
                    <p className="workspace-section-copy">
                      Les devis approuves restent ici tant que le client n a pas regle l acompte de lancement.
                    </p>
                  </div>
                  <span className="workspace-pill is-warning">{totalWaitingPaymentQuotes} attente</span>
                </div>
                {waitingPaymentQuotes.length === 0 ? renderEmpty('PAY', 'Aucun paiement en attente', 'Les devis approuves apparaitront ici tant qu ils ne sont pas payes.') : (
                  <div className="workspace-list">
                    {waitingPaymentQuotes.map((quote) => (
                      <div key={quote.id} className="workspace-list-item">
                        <div className="workspace-list-item__main" style={{ alignItems: 'flex-start' }}>
                          <span className="workspace-list-item__icon">PAY</span>
                          <div>
                            <div className="workspace-list-item__title">
                              {quote.metadata?.service || 'Projet'} - {quote.senderName || 'Client'}
                            </div>
                            <div className="workspace-list-item__meta">
                              Paiement attendu : {formatPaymentAmount(quote)} - {formatDate(quote.timestamp)}
                            </div>
                            <div className="workspace-note" style={{ marginTop: '0.45rem' }}>
                              Le devis est approuve. Le client doit maintenant payer pour faire passer le projet en cours.
                            </div>
                          </div>
                        </div>
                        <div className="workspace-inline-actions">
                          <Link
                            to={`/devis-management?quoteId=${encodeURIComponent(quote.id)}`}
                            className="workspace-inline-btn"
                          >
                            Suivre
                          </Link>
                          <span className="workspace-pill is-warning">Paiement attendu</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="workspace-card workspace-card--padded">
                <div className="workspace-section-head">
                  <div>
                    <h2 className="workspace-section-title">Dernieres demandes et messages</h2>
                    <p className="workspace-section-copy">Un apercu rapide du flux entrant client.</p>
                  </div>
                  <Link to="/admin-messages" className="workspace-inline-btn">Voir tout</Link>
                </div>
                <div className="workspace-list">
                  {latestContacts.map((request) => (
                    <div key={request.id} className="workspace-list-item">
                      <div className="workspace-list-item__main">
                        <span className="workspace-list-item__icon">CTA</span>
                        <div>
                          <div className="workspace-list-item__title">{getContactRequestLabel(request)} - {request.name || 'Client'}</div>
                          <div className="workspace-list-item__meta">{request.service || 'Projet a discuter'} - {formatDate(request.timestamp)}</div>
                        </div>
                      </div>
                      <span className="workspace-pill is-warning">Nouveau</span>
                    </div>
                  ))}
                  {latestMessages.map((message) => (
                    <div key={message.id} className="workspace-list-item">
                      <div className="workspace-list-item__main">
                        <span className="workspace-list-item__icon">MSG</span>
                        <div>
                          <div className="workspace-list-item__title">{message.senderRole === 'admin' ? `Reponse a ${message.recipientName || 'client'}` : `Message de ${message.senderName || 'client'}`}</div>
                          <div className="workspace-list-item__meta">{formatDate(message.timestamp)}</div>
                        </div>
                      </div>
                      <span className={`workspace-pill ${message.senderRole === 'admin' ? 'is-success' : 'is-info'}`}>{message.senderRole === 'admin' ? 'Reponse' : 'Entrant'}</span>
                    </div>
                  ))}
                  {latestContacts.length === 0 && latestMessages.length === 0 ? renderEmpty('MSG', 'Aucun flux recent', 'Les demandes et messages apparaitront ici.') : null}
                </div>
              </div>
            </main>
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
                Retrouvez ici vos demandes, vos echanges et les actions les plus utiles pour avancer rapidement avec YTECH.
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
              <p className="workspace-section-copy">Votre espace rassemble les devis, les messages et les demandes recentes.</p>
            </div>

            <div className="workspace-card workspace-card--padded">
              <h2 className="workspace-section-title">Acces rapides</h2>
              <div className="workspace-action-grid" style={{ marginTop: '1rem' }}>
                <Link to="/devis" className="workspace-action-card">
                  <span className="workspace-action-card__icon">DV</span>
                  <div>
                    <div className="workspace-action-card__title">Nouveau devis</div>
                    <div className="workspace-action-card__text">Lancer une nouvelle demande.</div>
                  </div>
                </Link>
                <Link to="/devis-management" className="workspace-action-card">
                  <span className="workspace-action-card__icon">LIST</span>
                  <div>
                    <div className="workspace-action-card__title">Mes devis</div>
                    <div className="workspace-action-card__text">Voir vos devis et leur statut.</div>
                  </div>
                </Link>
                <Link to="/messages" className="workspace-action-card">
                  <span className="workspace-action-card__icon">MSG</span>
                  <div>
                    <div className="workspace-action-card__title">Messagerie</div>
                    <div className="workspace-action-card__text">Echanger avec l equipe.</div>
                  </div>
                </Link>
                <Link to="/settings" className="workspace-action-card">
                  <span className="workspace-action-card__icon">SEC</span>
                  <div>
                    <div className="workspace-action-card__title">Parametres</div>
                    <div className="workspace-action-card__text">Changer le mot de passe depuis votre espace securise.</div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>

          <main className="workspace-stack">
            <div className="workspace-metrics">
              <div className="workspace-metric">
                <span className="workspace-metric__icon">ACT</span>
                <div className="workspace-metric__value">{quotes.filter((quote) => ['approved', 'in_progress'].includes(quote.status)).length}</div>
                <div className="workspace-metric__label">Projets actifs</div>
              </div>
              <div className="workspace-metric">
                <span className="workspace-metric__icon">MSG</span>
                <div className="workspace-metric__value">{messages.length}</div>
                <div className="workspace-metric__label">Messages</div>
              </div>
              <div className="workspace-metric">
                <span className="workspace-metric__icon">DV</span>
                <div className="workspace-metric__value">{quotes.length}</div>
                <div className="workspace-metric__label">Devis</div>
              </div>
            </div>

            <AccountSecurityShortcut email={user.email} isAdmin={isAdmin} />

            <div className="workspace-card workspace-card--padded">
              <div className="workspace-section-head">
                <div>
                  <h2 className="workspace-section-title">Etat d avancement du projet</h2>
                  <p className="workspace-section-copy">Le dashboard vous montre ou en est votre devis prioritaire.</p>
                </div>
                <span className={`workspace-pill ${getQuoteStatusClass(projectFocusQuote?.status)}`}>{projectFocusQuote ? getQuoteStatusLabel(projectFocusQuote.status) : 'Aucun devis'}</span>
              </div>
              {!projectFocusQuote ? renderEmpty('PRJ', 'Aucun projet a suivre', 'Envoyez un devis pour commencer le suivi.') : (
                <div className="workspace-card workspace-card--accent">
                  <h3 className="workspace-section-title" style={{ marginBottom: '0.5rem' }}>{projectFocusQuote.metadata?.service || 'Projet YTECH'}</h3>
                  <p className="workspace-section-copy">{getProjectStageText(projectFocusQuote)}</p>
                  <p className="workspace-note" style={{ marginTop: '0.75rem' }}>{getQuoteSummary(projectFocusQuote)}</p>
                  <div className="workspace-inline-actions" style={{ marginTop: '1rem' }}>
                    {projectFocusQuote.status === 'approved' ? (
                      <button
                        type="button"
                        className="workspace-inline-btn is-success"
                        onClick={() => openClientPaymentWindow(projectFocusQuote.id)}
                      >
                        Payer dans un autre onglet
                      </button>
                    ) : null}
                    {projectFocusQuote.status === 'in_progress' ? (
                      <Link to={getReceiptPath(projectFocusQuote)} className="workspace-inline-btn is-success">
                        Voir le recu
                      </Link>
                    ) : null}
                    {projectFocusQuote.status === 'in_progress' ? <Link to="/messages" className="workspace-inline-btn is-info">Contacter l equipe</Link> : null}
                    {projectFocusQuote.status === 'rejected' ? <Link to="/contact?intent=quote-help" className="workspace-inline-btn is-danger">Revoir le besoin</Link> : null}
                    <Link to="/devis-management" className="workspace-inline-btn">Voir le detail</Link>
                  </div>
                </div>
              )}
            </div>

            <div className="workspace-card workspace-card--padded">
              <div className="workspace-section-head">
                <div>
                  <h2 className="workspace-section-title">Derniers devis</h2>
                  <p className="workspace-section-copy">Vos demandes recentes restent visibles ici.</p>
                </div>
                <Link to="/devis-management" className="workspace-inline-btn">Voir mes devis</Link>
              </div>
              {latestQuotes.length === 0 ? renderEmpty('DV', 'Aucun devis visible', 'Vos devis apparaitront ici des qu ils seront enregistres.') : (
                <div className="workspace-list">
                  {latestQuotes.map((quote) => (
                    <div key={quote.id} className="workspace-list-item">
                      <div className="workspace-list-item__main">
                        <span className="workspace-list-item__icon">DV</span>
                        <div>
                          <div className="workspace-list-item__title">{quote.metadata?.service || 'Demande de devis'}</div>
                          <div className="workspace-list-item__meta">{getQuoteSummary(quote)} - {formatDate(quote.timestamp)}</div>
                        </div>
                      </div>
                      <div className="workspace-inline-actions">
                        {quote.status === 'approved' ? (
                          <button
                            type="button"
                            className="workspace-inline-btn is-success"
                            onClick={() => openClientPaymentWindow(quote.id)}
                          >
                            Payer
                          </button>
                        ) : null}
                        {quote.status === 'in_progress' && quote.metadata?.paymentTransactionId ? (
                          <Link to={getReceiptPath(quote)} className="workspace-inline-btn is-info">
                            Recu
                          </Link>
                        ) : null}
                        <span className={`workspace-pill ${getQuoteStatusClass(quote.status)}`}>{getQuoteStatusLabel(quote.status)}</span>
                      </div>
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
