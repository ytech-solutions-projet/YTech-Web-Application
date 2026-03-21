import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/app-shell.css';
import { formatDate, getInitials } from '../utils/helpers';
import { readAuthUser } from '../utils/storage';
import { deleteQuote, listQuotes, updateQuoteStatus } from '../utils/businessApi';

const statusLabels = {
  pending: 'En attente',
  approved: 'Approuve',
  rejected: 'Rejete',
  in_progress: 'En cours'
};

const statusClasses = {
  pending: 'is-warning',
  approved: 'is-success',
  rejected: 'is-danger',
  in_progress: 'is-info'
};

const getDefaultPaymentAmount = (quote) =>
  quote?.metadata?.paymentAmount ?? quote?.metadata?.estimatedMin ?? quote?.metadata?.estimatedMax ?? '';

const formatPaymentAmount = (quote) => {
  const amount = getDefaultPaymentAmount(quote);
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return 'Montant a definir';
  }

  return `${Number(amount).toLocaleString('fr-MA')} ${quote?.metadata?.paymentCurrency || 'MAD'}`;
};

const getProjectStepCopy = (quote) => {
  switch (quote?.status) {
    case 'approved':
      return 'Validation faite. Le client doit maintenant passer au paiement pour lancer le projet.';
    case 'in_progress':
      return 'Paiement confirme. Le projet est en production.';
    case 'rejected':
      return 'Demande refusee. Un nouveau cadrage est necessaire.';
    default:
      return 'Demande recue. L equipe est encore en train de l analyser.';
  }
};

const DevisManagement = () => {
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [filter, setFilter] = useState('all');
  const [decisionNote, setDecisionNote] = useState('');
  const [paymentAmountDraft, setPaymentAmountDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';
  const highlightedQuoteId = searchParams.get('quoteId');

  const syncSelectedQuoteInUrl = (quoteId = null) => {
    const nextParams = new URLSearchParams(searchParams);

    if (quoteId) {
      nextParams.set('quoteId', quoteId);
    } else {
      nextParams.delete('quoteId');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const openQuoteDetails = (quote) => {
    setSelectedQuote(quote);
    syncSelectedQuoteInUrl(quote.id);
  };

  const closeQuoteDetails = () => {
    setSelectedQuote(null);

    if (highlightedQuoteId) {
      syncSelectedQuoteInUrl(null);
    }
  };

  useEffect(() => {
    let intervalId;
    let isMounted = true;
    const authUser = readAuthUser();

    if (!authUser) {
      navigate('/login');
      return;
    }

    setUser(authUser);
    const loadQuotes = async () => {
      try {
        const nextQuotes = await listQuotes();

        if (!isMounted) {
          return;
        }

        setQuotes(nextQuotes.sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp)));
      } catch (error) {
        if (isMounted) {
          setQuotes([]);
        }
      }
    };

    loadQuotes();
    intervalId = window.setInterval(loadQuotes, 20000);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!selectedQuote) {
      setDecisionNote('');
      setPaymentAmountDraft('');
      return;
    }

    setDecisionNote(selectedQuote.metadata?.decisionNote || '');
    setPaymentAmountDraft(
      getDefaultPaymentAmount(selectedQuote) === ''
        ? ''
        : `${getDefaultPaymentAmount(selectedQuote)}`
    );
  }, [selectedQuote]);

  useEffect(() => {
    if (!highlightedQuoteId || quotes.length === 0) {
      return;
    }

    const targetQuote = quotes.find((quote) => quote.id === highlightedQuoteId);

    if (targetQuote) {
      setSelectedQuote(targetQuote);
    }
  }, [highlightedQuoteId, quotes]);

  const handleStatusChange = async (quote, newStatus, options = {}) => {
    try {
      setIsUpdatingStatus(true);
      const payload = {
        decisionNote: options.decisionNote ?? decisionNote
      };

      if (newStatus === 'approved') {
        const nextPaymentAmount = options.paymentAmount ?? paymentAmountDraft ?? getDefaultPaymentAmount(quote);
        if (nextPaymentAmount !== '' && Number.isFinite(Number(nextPaymentAmount))) {
          payload.paymentAmount = Number(nextPaymentAmount);
        }
        payload.paymentCurrency = 'MAD';
      }

      const updatedQuote = await updateQuoteStatus(quote.id, newStatus, payload);
      setQuotes((prev) => prev.map((item) => (item.id === quote.id ? updatedQuote : item)));
      setSelectedQuote((prev) => (prev?.id === quote.id ? updatedQuote : prev));
      return updatedQuote;
    } catch (error) {
      window.alert(error.message || 'Impossible de mettre a jour le devis.');
      return null;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteQuote = async (quoteId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce devis ?')) {
      return;
    }

    try {
      await deleteQuote(quoteId);
      const updatedQuotes = quotes.filter((quote) => quote.id !== quoteId);
      setQuotes(updatedQuotes);

      if (selectedQuote?.id === quoteId) {
        setSelectedQuote(null);
      }
    } catch (error) {
      window.alert(error.message || 'Impossible de supprimer le devis.');
    }
  };

  const filteredQuotes = useMemo(() => {
    if (filter === 'all') {
      return quotes;
    }

    return quotes.filter((quote) => quote.status === filter);
  }, [filter, quotes]);

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          <div className="workspace-empty">
            <div className="workspace-empty__icon">...</div>
            <div className="workspace-empty__title">Chargement des devis</div>
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
              <span className="workspace-hero__eyebrow">Suivi des devis</span>
              <h1 className="workspace-hero__title">
                {isAdmin ? 'Gerez les devis en un seul endroit' : 'Suivez vos demandes en un seul endroit'}
              </h1>
              <p className="workspace-hero__text">
                {isAdmin
                  ? 'Retrouvez ici tous les devis, leur statut, les prochaines etapes et les details de chaque besoin.'
                  : 'Retrouvez ici vos demandes de devis, leur statut et les details de chaque besoin.'}
              </p>
            </div>
            <div className="workspace-hero__meta">
              <span className="workspace-hero__badge">{getInitials(user.name) || 'DV'}</span>
              <span className="workspace-hero__label">{quotes.length} devis total</span>
            </div>
          </div>
        </section>

        <div className="workspace-grid workspace-grid--sidebar">
          <aside className="workspace-stack">
            <div className="workspace-card workspace-card--padded workspace-card--accent">
              <h2 className="workspace-section-title">Vue d'ensemble</h2>
              <p className="workspace-section-copy">
                Un panneau plus clair pour suivre l'etat de vos demandes et repasser facilement a
                l'action quand un nouveau besoin apparait.
              </p>
            </div>

            <div className="workspace-card workspace-card--padded">
              <h2 className="workspace-section-title">Raccourcis utiles</h2>
              <div className="workspace-action-grid" style={{ marginTop: '1rem' }}>
                <Link to={isAdmin ? '/dashboard' : '/devis'} className="workspace-action-card">
                  <span className="workspace-action-card__icon">{isAdmin ? 'ADM' : 'NEW'}</span>
                  <div>
                    <div className="workspace-action-card__title">
                      {isAdmin ? 'Dashboard admin' : 'Nouveau devis'}
                    </div>
                    <div className="workspace-action-card__text">
                      {isAdmin
                        ? 'Revenir au pilotage global des demandes et paiements.'
                        : 'Lancer une nouvelle demande depuis le formulaire.'}
                    </div>
                  </div>
                </Link>

                <Link to={isAdmin ? '/admin-messages' : '/messages'} className="workspace-action-card">
                  <span className="workspace-action-card__icon">MSG</span>
                  <div>
                    <div className="workspace-action-card__title">
                      {isAdmin ? 'Conversations' : 'Contacter YTECH'}
                    </div>
                    <div className="workspace-action-card__text">
                      {isAdmin
                        ? 'Ouvrir la messagerie admin et les demandes entrantes.'
                        : 'Reprendre la conversation avec notre equipe.'}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>

          <main className="workspace-stack">
            <div className="workspace-metrics">
              <div className="workspace-metric">
                <span className="workspace-metric__icon">ALL</span>
                <div className="workspace-metric__value">{quotes.length}</div>
                <div className="workspace-metric__label">Devis total</div>
              </div>

              <div className="workspace-metric">
                <span className="workspace-metric__icon">PEN</span>
                <div className="workspace-metric__value">
                  {quotes.filter((quote) => quote.status === 'pending').length}
                </div>
                <div className="workspace-metric__label">En attente</div>
              </div>

              <div className="workspace-metric">
                <span className="workspace-metric__icon">RUN</span>
                <div className="workspace-metric__value">
                  {quotes.filter((quote) => quote.status === 'in_progress').length}
                </div>
                <div className="workspace-metric__label">En cours</div>
              </div>
            </div>

            <div className="workspace-card workspace-card--padded">
              <div className="workspace-filter-bar">
                <div>
                  <h2 className="workspace-section-title">Vos devis</h2>
                  <p className="workspace-section-copy">
                    Filtrez par statut puis ouvrez un devis pour voir le detail complet.
                  </p>
                </div>
                <Link to={isAdmin ? '/dashboard' : '/devis'} className="btn btn-primary">
                  {isAdmin ? 'Retour dashboard' : 'Nouveau devis'}
                </Link>
              </div>

              <div className="workspace-filter-group" style={{ marginTop: '1rem' }}>
                {['all', 'pending', 'approved', 'rejected', 'in_progress'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`workspace-filter ${filter === status ? 'active' : ''}`}
                    onClick={() => setFilter(status)}
                  >
                    {status === 'all' ? 'Tous' : statusLabels[status]}
                  </button>
                ))}
              </div>

              {filteredQuotes.length === 0 ? (
                <div className="workspace-empty" style={{ marginTop: '1.25rem' }}>
                  <div className="workspace-empty__icon">DV</div>
                  <div className="workspace-empty__title">Aucun devis dans ce filtre</div>
                  <div className="workspace-empty__text">
                    Changez le filtre ou creez une nouvelle demande pour alimenter cet espace.
                  </div>
                </div>
              ) : (
                <div className="workspace-grid-cards">
                  {filteredQuotes.map((quote) => (
                    <div key={quote.id} className="workspace-card workspace-quote-card">
                      <div className="workspace-quote-card__hero">
                        <div className="workspace-quote-card__top">
                          <div>
                            <div className="workspace-quote-card__title">
                              {quote.metadata?.service || 'Service non specifie'}
                            </div>
                            <div className="workspace-quote-card__sub">{quote.senderName || user.name}</div>
                          </div>
                          <span className={`workspace-pill ${statusClasses[quote.status] || ''}`}>
                            {statusLabels[quote.status] || 'Inconnu'}
                          </span>
                        </div>

                      <div className="workspace-quote-card__hero-meta">
                        <span>{quote.metadata?.budget || 'Budget non specifie'}</span>
                        <span>{quote.metadata?.timeline || 'Delai non specifie'}</span>
                        <span>{quote.metadata?.estimatedRange || 'Estimation a definir'}</span>
                        {quote.status === 'approved' ? <span>Paiement : {formatPaymentAmount(quote)}</span> : null}
                      </div>
                    </div>

                      <div className="workspace-quote-card__body">
                        <div className="workspace-quote-card__text">
                          {quote.content.length > 180 ? `${quote.content.slice(0, 180)}...` : quote.content}
                        </div>

                        <div className="workspace-note" style={{ marginTop: '0.75rem' }}>
                          {getProjectStepCopy(quote)}
                        </div>

                        {quote.metadata?.features?.length > 0 && (
                          <div className="workspace-tags">
                            {quote.metadata.features.slice(0, 4).map((feature) => (
                              <span key={feature} className="workspace-tag">
                                {feature}
                              </span>
                            ))}
                            {quote.metadata.features.length > 4 && (
                              <span className="workspace-tag">+{quote.metadata.features.length - 4}</span>
                            )}
                          </div>
                        )}

                          <div className="workspace-quote-card__footer">
                            <span className="workspace-note">{formatDate(quote.timestamp)}</span>
                            <div className="workspace-inline-actions">
                              <button
                                type="button"
                              className="workspace-inline-btn"
                              onClick={() => openQuoteDetails(quote)}
                              >
                                Voir
                              </button>
                              {isAdmin && quote.status === 'pending' && (
                                <button
                                  type="button"
                                  className="workspace-inline-btn is-success"
                                  disabled={isUpdatingStatus}
                                  onClick={() =>
                                    handleStatusChange(quote, 'approved', {
                                      paymentAmount: getDefaultPaymentAmount(quote),
                                      decisionNote: ''
                                    })
                                  }
                                >
                                  Approuver
                                </button>
                              )}
                              {!isAdmin && quote.status === 'approved' && (
                                <Link
                                  to={`/payment?quoteId=${encodeURIComponent(quote.id)}`}
                                  className="workspace-inline-btn is-success"
                                >
                                  Payer
                                </Link>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="workspace-inline-btn is-danger"
                                  disabled={isUpdatingStatus}
                                  onClick={() => handleDeleteQuote(quote.id)}
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {selectedQuote && (
        <div className="workspace-modal-overlay" onClick={closeQuoteDetails}>
          <div className="workspace-modal" onClick={(event) => event.stopPropagation()}>
            <div className="workspace-modal__header">
              <button
                type="button"
                className="workspace-modal__close"
                onClick={closeQuoteDetails}
              >
                x
              </button>
              <div className="workspace-modal__title">
                {selectedQuote.metadata?.service || 'Service non specifie'}
              </div>
              <div className="workspace-modal__copy">
                {isAdmin
                  ? 'Consultez tous les details de cette demande puis mettez a jour son statut.'
                  : 'Consultez tous les details de cette demande et son statut actuel.'}
              </div>
            </div>

            <div className="workspace-modal__body">
              <div className="workspace-modal__grid">
                <div className="workspace-modal__meta">
                  <strong>Client</strong>
                  <span>{selectedQuote.senderName || user.name}</span>
                </div>
                <div className="workspace-modal__meta">
                  <strong>Email</strong>
                  <span>{selectedQuote.senderId || selectedQuote.email}</span>
                </div>
                <div className="workspace-modal__meta">
                  <strong>Budget</strong>
                  <span>{selectedQuote.metadata?.budget || 'Non specifie'}</span>
                </div>
                <div className="workspace-modal__meta">
                  <strong>Delai</strong>
                  <span>{selectedQuote.metadata?.timeline || 'Non specifie'}</span>
                </div>
                <div className="workspace-modal__meta">
                  <strong>Estimation</strong>
                  <span>{selectedQuote.metadata?.estimatedRange || 'A definir'}</span>
                </div>
                <div className="workspace-modal__meta">
                  <strong>Statut</strong>
                  <span>{statusLabels[selectedQuote.status] || 'Inconnu'}</span>
                </div>
                <div className="workspace-modal__meta">
                  <strong>Paiement</strong>
                  <span>
                    {selectedQuote.status === 'approved' || selectedQuote.status === 'in_progress'
                      ? formatPaymentAmount(selectedQuote)
                      : 'Non requis pour le moment'}
                  </span>
                </div>
              </div>

              <div className="workspace-modal__section">
                <h3>Description du projet</h3>
                <div className="workspace-modal__content">{selectedQuote.content}</div>
              </div>

              {selectedQuote.metadata?.decisionNote ? (
                <div className="workspace-modal__section">
                  <h3>Decision YTECH</h3>
                  <div className="workspace-modal__content">{selectedQuote.metadata.decisionNote}</div>
                </div>
              ) : null}

              {selectedQuote.metadata?.features?.length > 0 && (
                <div className="workspace-modal__section">
                  <h3>Fonctionnalites demandees</h3>
                  <div className="workspace-tags">
                    {selectedQuote.metadata.features.map((feature) => (
                      <span key={feature} className="workspace-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && selectedQuote.status === 'pending' && (
                <div className="workspace-modal__section">
                  <h3>Validation admin</h3>
                  <div className="workspace-modal__grid">
                    <div className="workspace-modal__meta">
                      <strong>Montant a payer</strong>
                      <input
                        className="workspace-input"
                        type="number"
                        min="0"
                        step="100"
                        value={paymentAmountDraft}
                        onChange={(event) => setPaymentAmountDraft(event.target.value)}
                        placeholder={`${getDefaultPaymentAmount(selectedQuote) || ''}`}
                      />
                    </div>
                  </div>
                  <textarea
                    className="workspace-input"
                    rows="4"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Ajoutez une note pour le client avant l envoi automatique du message."
                    style={{ marginTop: '1rem', resize: 'vertical' }}
                  />
                </div>
              )}

              <div className="workspace-modal__footer">
                {isAdmin && selectedQuote.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="workspace-inline-btn is-success"
                      disabled={isUpdatingStatus}
                      onClick={async () => {
                        const updatedQuote = await handleStatusChange(selectedQuote, 'approved');
                        if (updatedQuote) {
                          closeQuoteDetails();
                        }
                      }}
                    >
                      {isUpdatingStatus ? 'Mise a jour...' : 'Approuver'}
                    </button>
                    <button
                      type="button"
                      className="workspace-inline-btn is-danger"
                      disabled={isUpdatingStatus}
                      onClick={async () => {
                        const updatedQuote = await handleStatusChange(selectedQuote, 'rejected');
                        if (updatedQuote) {
                          closeQuoteDetails();
                        }
                      }}
                    >
                      {isUpdatingStatus ? 'Mise a jour...' : 'Rejeter'}
                    </button>
                  </>
                )}

                {!isAdmin && selectedQuote.status === 'approved' && (
                  <Link
                    to={`/payment?quoteId=${encodeURIComponent(selectedQuote.id)}`}
                    className="workspace-inline-btn is-success"
                  >
                    Payer maintenant
                  </Link>
                )}

                <button
                  type="button"
                  className="workspace-inline-btn"
                  onClick={closeQuoteDetails}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevisManagement;
