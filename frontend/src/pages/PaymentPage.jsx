import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { listQuotes, payQuote } from '../utils/businessApi';

const plans = [
  {
    id: 'basic',
    name: 'Plan Basic',
    price: 5000,
    currency: 'MAD',
    features: [
      'Site vitrine 5 pages',
      'Design responsive',
      'Formulaire de contact',
      'Hebergement 1 an',
      'Support email'
    ],
    duration: '1 mois'
  },
  {
    id: 'professional',
    name: 'Plan Professional',
    price: 15000,
    currency: 'MAD',
    features: [
      'Site e-commerce complet',
      'Design personnalise',
      '100 produits maximum',
      'Paiement integre',
      'Formation 2h',
      'Support prioritaire'
    ],
    duration: '2 mois'
  },
  {
    id: 'enterprise',
    name: 'Plan Enterprise',
    price: 50000,
    currency: 'MAD',
    features: [
      'Application sur mesure',
      'Direction complete',
      'Fonctionnalites avancees',
      'API REST',
      'Formation complete',
      'Support 24/7',
      'Maintenance 1 an'
    ],
    duration: '3 a 6 mois'
  }
];

const formatMoney = (amount, currency = 'MAD') => {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return `0 ${currency}`;
  }

  return `${Number(amount).toLocaleString('fr-MA')} ${currency}`;
};

const PaymentPage = () => {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [linkedQuote, setLinkedQuote] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [pageError, setPageError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  useEffect(() => {
    let isMounted = true;

    const loadPaymentContext = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userData = localStorage.getItem('user');

      if (!isLoggedIn || !userData) {
        navigate('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      if (isMounted) {
        setUser(parsedUser);
      }

      if (!quoteId) {
        return;
      }

      try {
        if (isMounted) {
          setIsLoadingQuote(true);
          setPageError('');
        }

        const quotes = await listQuotes();
        const matchingQuote = quotes.find((quote) => quote.id === quoteId);

        if (!matchingQuote) {
          throw new Error('Ce devis est introuvable ou ne vous appartient pas.');
        }

        if (isMounted) {
          setLinkedQuote(matchingQuote);
        }
      } catch (error) {
        if (isMounted) {
          setPageError(error.message || 'Impossible de charger ce devis pour le paiement.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingQuote(false);
        }
      }
    };

    loadPaymentContext();

    return () => {
      isMounted = false;
    };
  }, [navigate, quoteId]);

  const quoteAmount = useMemo(() => {
    if (!linkedQuote) {
      return null;
    }

    const rawAmount =
      linkedQuote.metadata?.paymentAmount ??
      linkedQuote.metadata?.estimatedMin ??
      linkedQuote.metadata?.estimatedMax ??
      null;

    return Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : null;
  }, [linkedQuote]);

  const quoteCurrency = linkedQuote?.metadata?.paymentCurrency || 'MAD';
  const canPayQuote = linkedQuote?.status === 'approved';
  const isQuoteAlreadyPaid = linkedQuote?.status === 'in_progress';

  const persistTransaction = (nextTransaction) => {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions.push(nextTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
  };

  const handlePayment = async () => {
    if (!user) {
      return;
    }

    setIsProcessing(true);

    try {
      if (linkedQuote) {
        const result = await payQuote(linkedQuote.id);
        const nextTransaction = {
          id: result.transaction?.id || `pay_${Date.now()}`,
          quoteId: linkedQuote.id,
          userId: user.email,
          planId: linkedQuote.id,
          planName: linkedQuote.metadata?.service || 'Projet YTECH',
          service: linkedQuote.metadata?.service || 'Projet YTECH',
          amount: result.transaction?.amount ?? quoteAmount ?? 0,
          currency: result.transaction?.currency || quoteCurrency,
          status: result.transaction?.status || 'completed',
          timestamp: result.transaction?.timestamp || new Date().toISOString()
        };

        persistTransaction(nextTransaction);
        setTransaction(nextTransaction);
        setLinkedQuote(result.quote || linkedQuote);
        setPaymentSuccess(true);
        return;
      }

      if (!selectedPlan) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2200));

      const nextTransaction = {
        id: Date.now(),
        userId: user.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        service: selectedPlan.name,
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      persistTransaction(nextTransaction);
      setTransaction(nextTransaction);
      setPaymentSuccess(true);
    } catch (error) {
      setPageError(error.message || 'Impossible de finaliser ce paiement pour le moment.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user || isLoadingQuote) {
    return (
      <div className="marketing-page">
        <div className="loading-shell">
          <div className="loading-shell__card">Preparation de votre espace de paiement...</div>
        </div>
      </div>
    );
  }

  if (paymentSuccess && transaction) {
    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">PAY</div>
              <h1 className="success-card__title">Paiement confirme.</h1>
              <p className="success-card__text">
                Votre paiement de {formatMoney(transaction.amount, transaction.currency)} a bien ete
                enregistre pour {transaction.service || transaction.planName}. Le projet passe
                maintenant a l etape suivante.
              </p>
              <div className="success-card__actions">
                <Link to="/dashboard" className="marketing-button marketing-button--dark">
                  Retour au dashboard
                </Link>
                <Link to="/payment-success" className="marketing-button marketing-button--accent">
                  Voir le recu
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter note="Le paiement confirme met maintenant le projet dans un etat plus clair pour le client et l equipe." />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">ERR</div>
              <h1 className="success-card__title">Paiement indisponible</h1>
              <p className="success-card__text">{pageError}</p>
              <div className="success-card__actions">
                <Link to="/dashboard" className="marketing-button marketing-button--dark">
                  Retour au dashboard
                </Link>
                <Link to="/devis-management" className="marketing-button marketing-button--accent">
                  Voir mes devis
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter note="Le paiement reste accessible seulement quand le devis et son contexte sont bien charges." />
      </div>
    );
  }

  if (linkedQuote && !canPayQuote && isQuoteAlreadyPaid) {
    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">OK</div>
              <h1 className="success-card__title">Paiement deja confirme</h1>
              <p className="success-card__text">
                Ce devis est deja regle et le projet est maintenant en cours de production.
              </p>
              <div className="success-card__actions">
                <Link to="/dashboard" className="marketing-button marketing-button--dark">
                  Retour au dashboard
                </Link>
                <Link to="/messages" className="marketing-button marketing-button--accent">
                  Contacter l equipe
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter note="Quand le paiement est deja valide, le parcours vous renvoie directement vers le suivi du projet." />
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Paiement"
        title={
          linkedQuote
            ? 'Votre devis a ete valide. Vous pouvez maintenant lancer le projet.'
            : 'Choisissez un cadre de production puis lancez la suite.'
        }
        description={
          linkedQuote
            ? 'Le paiement de lancement relie directement le devis accepte au demarrage reel du projet, avec mise a jour automatique du dashboard.'
            : 'Les trois plans servent surtout de point de depart pour cadrer l enveloppe, la complexite et le rythme de livraison.'
        }
        actions={[
          linkedQuote
            ? { to: '/devis-management', label: 'Voir mon devis', variant: 'primary' }
            : { to: '/services', label: 'Revoir les services', variant: 'primary' },
          { to: '/contact?intent=support', label: 'Poser une question', variant: 'secondary' }
        ]}
        highlights={
          linkedQuote
            ? ['Devis accepte', 'Paiement de lancement', 'Passage auto en production']
            : ['Paiement securise', 'Plans lisibles', 'Lancement rapide']
        }
        aside={
          <>
            <span className="hero-panel__eyebrow">{linkedQuote ? 'Devis valide' : 'Client'}</span>
            <h2 className="hero-panel__title">
              {linkedQuote ? linkedQuote.metadata?.service || 'Projet YTECH' : user.name}
            </h2>
            <p className="hero-panel__text">
              {linkedQuote
                ? 'Le paiement de cette etape met le devis dans un etat "en cours" et previens l equipe en temps reel.'
                : 'Votre selection sera reliee a votre compte pour que l equipe puisse organiser le demarrage du projet dans la foulee.'}
            </p>
            <ul className="hero-panel__list">
              <li>Email : {user.email}</li>
              <li>Mode : carte bancaire securisee</li>
              <li>
                Suite :{' '}
                {linkedQuote ? 'dashboard mis a jour + notification equipe' : 'confirmation + recu + prise de contact'}
              </li>
            </ul>
          </>
        }
      />

      {linkedQuote ? (
        <section className="marketing-section marketing-section--muted">
          <div className="container">
            <div className="receipt-card marketing-shell-narrow">
              <h2 className="receipt-card__title">Recapitulatif du devis accepte</h2>
              <ul className="receipt-list">
                <li>
                  <span>Service</span>
                  <strong>{linkedQuote.metadata?.service || 'Projet YTECH'}</strong>
                </li>
                <li>
                  <span>Delai</span>
                  <strong>{linkedQuote.metadata?.timeline || 'A definir'}</strong>
                </li>
                <li>
                  <span>Estimation</span>
                  <strong>{linkedQuote.metadata?.estimatedRange || 'A definir'}</strong>
                </li>
                <li>
                  <span>Etat actuel</span>
                  <strong>{linkedQuote.status === 'approved' ? 'Paiement attendu' : 'Projet en cours'}</strong>
                </li>
              </ul>

              <div className="receipt-card__amount">{formatMoney(quoteAmount, quoteCurrency)}</div>

              {linkedQuote.metadata?.decisionNote ? (
                <p className="marketing-note">Note YTECH : {linkedQuote.metadata.decisionNote}</p>
              ) : null}

              <div className="success-card__actions marketing-mt-md">
                <button
                  type="button"
                  className="marketing-button marketing-button--dark"
                  onClick={handlePayment}
                  disabled={isProcessing || !canPayQuote}
                >
                  {isProcessing
                    ? 'Traitement du paiement...'
                    : `Payer ${formatMoney(quoteAmount, quoteCurrency)}`}
                </button>
                <Link to="/devis-management" className="marketing-button marketing-button--accent">
                  Retour au suivi
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="marketing-section">
            <div className="container">
              <div className="section-heading">
                <span className="section-heading__eyebrow">Plans</span>
                <h2 className="section-heading__title">
                  Une lecture plus nette des enveloppes et de ce qu elles couvrent.
                </h2>
              </div>

              <div className="pricing-grid">
                {plans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const cardClasses = [
                    'pricing-card',
                    isSelected ? 'is-selected' : '',
                    plan.id === 'professional' ? 'is-featured' : ''
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <article
                      key={plan.id}
                      className={cardClasses}
                      onClick={() => setSelectedPlan(plan)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPlan(plan);
                        }
                      }}
                    >
                      <span className="panel-card__eyebrow">{plan.duration}</span>
                      <h3 className="panel-card__title">{plan.name}</h3>
                      <div className="pricing-price">
                        {plan.price.toLocaleString()} {plan.currency}
                      </div>
                      <ul className="pricing-list">
                        {plan.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {selectedPlan ? (
            <section className="marketing-section marketing-section--muted">
              <div className="container">
                <div className="receipt-card marketing-shell-narrow">
                  <h2 className="receipt-card__title">Recapitulatif avant paiement</h2>
                  <ul className="receipt-list">
                    <li>
                      <span>Plan</span>
                      <strong>{selectedPlan.name}</strong>
                    </li>
                    <li>
                      <span>Duree estimee</span>
                      <strong>{selectedPlan.duration}</strong>
                    </li>
                    <li>
                      <span>Client</span>
                      <strong>{user.name}</strong>
                    </li>
                    <li>
                      <span>Email</span>
                      <strong>{user.email}</strong>
                    </li>
                  </ul>

                  <div className="receipt-card__amount">
                    {selectedPlan.price.toLocaleString()} {selectedPlan.currency}
                  </div>

                  <div className="success-card__actions marketing-mt-md">
                    <button
                      type="button"
                      className="marketing-button marketing-button--dark"
                      onClick={handlePayment}
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? 'Traitement du paiement...'
                        : `Payer ${selectedPlan.price.toLocaleString()} ${selectedPlan.currency}`}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}

      <SiteFooter note="La page paiement peut maintenant servir soit a un devis accepte, soit a un paiement libre plus simple." />
    </div>
  );
};

export default PaymentPage;
