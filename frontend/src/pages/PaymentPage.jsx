import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { payQuote, listQuotes } from '../utils/businessApi';
import { readAuthUser } from '../utils/storage';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  getCardDigits,
  getLastFourDigits,
  getPaymentMethodLabel,
  isValidCardholderName,
  isValidCardNumber,
  isValidCvc,
  isValidExpiry
} from '../utils/payment';
import { buildReceiptPath, persistStoredTransaction } from '../utils/paymentSession';
import './PaymentPage.css';

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

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(`${value ?? ''}`.trim());

const buildInitialPaymentForm = (user) => ({
  cardholderName: user?.name || '',
  cardNumber: '',
  expiry: '',
  cvc: '',
  paypalEmail: user?.email || '',
  agreementAccepted: false
});

const PaymentPage = () => {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [linkedQuote, setLinkedQuote] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [pageError, setPageError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentForm, setPaymentForm] = useState(buildInitialPaymentForm(null));
  const [fieldErrors, setFieldErrors] = useState({});
  const [closeCountdown, setCloseCountdown] = useState(7);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const isCheckoutWindow = searchParams.get('checkoutWindow') === '1';

  useEffect(() => {
    let isMounted = true;

    const loadPaymentContext = async () => {
      const authUser = readAuthUser();

      if (!authUser) {
        navigate('/login');
        return;
      }

      if (isMounted) {
        setUser(authUser);
        setPaymentForm(buildInitialPaymentForm(authUser));
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
  const cardBrand = detectCardBrand(paymentForm.cardNumber);
  const canPayQuote = linkedQuote?.status === 'approved';
  const isQuoteAlreadyPaid = linkedQuote?.status === 'in_progress';
  const isQuotePaymentLocked = Boolean(linkedQuote) && !canPayQuote && !isQuoteAlreadyPaid;

  const checkoutContext = useMemo(() => {
    if (linkedQuote) {
      return {
        kind: 'quote',
        title: linkedQuote.metadata?.service || 'Projet YTECH',
        subtitle: linkedQuote.metadata?.timeline || 'Delai a definir',
        amount: quoteAmount,
        currency: quoteCurrency,
        summary: [
          { label: 'Reference', value: linkedQuote.id },
          { label: 'Estimation', value: linkedQuote.metadata?.estimatedRange || 'A definir' },
          { label: 'Statut', value: linkedQuote.status === 'approved' ? 'Paiement attendu' : 'Projet en cours' }
        ]
      };
    }

    if (!selectedPlan) {
      return null;
    }

    return {
      kind: 'plan',
      title: selectedPlan.name,
      subtitle: selectedPlan.duration,
      amount: selectedPlan.price,
      currency: selectedPlan.currency,
      summary: [
        { label: 'Plan', value: selectedPlan.name },
        { label: 'Duree estimee', value: selectedPlan.duration },
        { label: 'Client', value: user?.name || 'Client YTECH' }
      ]
    };
  }, [linkedQuote, quoteAmount, quoteCurrency, selectedPlan, user?.name]);

  const receiptPath = useMemo(
    () =>
      buildReceiptPath({
        transactionId: transaction?.id,
        quoteId: transaction?.quoteId || linkedQuote?.id || quoteId
      }),
    [linkedQuote?.id, quoteId, transaction]
  );

  useEffect(() => {
    if (!paymentSuccess || !transaction) {
      return undefined;
    }

    if (!isCheckoutWindow) {
      navigate(receiptPath, { replace: true });
      return undefined;
    }

    setCloseCountdown(7);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.location.assign(receiptPath);
      }
    } catch (error) {
      console.warn('Impossible de rediriger automatiquement la page parente vers le recu.', error);
    }

    const closeTimerId = window.setTimeout(() => {
      window.close();
    }, 7000);

    const countdownIntervalId = window.setInterval(() => {
      setCloseCountdown((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => {
      window.clearTimeout(closeTimerId);
      window.clearInterval(countdownIntervalId);
    };
  }, [isCheckoutWindow, navigate, paymentSuccess, receiptPath, transaction]);

  const updateField = (field, value) => {
    setPaymentError('');
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCardNumberChange = (value) => {
    updateField('cardNumber', formatCardNumber(value));
  };

  const handleExpiryChange = (value) => {
    updateField('expiry', formatExpiry(value));
  };

  const handleCvcChange = (value) => {
    updateField('cvc', `${value ?? ''}`.replace(/\D/g, '').slice(0, 4));
  };

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    setPaymentError('');
    setFieldErrors({});
  };

  const validatePaymentForm = () => {
    const nextErrors = {};

    if (!paymentForm.agreementAccepted) {
      nextErrors.agreementAccepted =
        'Confirmez les conditions de paiement avant de lancer la transaction.';
    }

    if (paymentMethod === 'paypal') {
      if (!isValidEmail(paymentForm.paypalEmail)) {
        nextErrors.paypalEmail = 'Renseignez une adresse PayPal valide.';
      }

      return nextErrors;
    }

    if (!isValidCardholderName(paymentForm.cardholderName)) {
      nextErrors.cardholderName = 'Le nom du titulaire doit etre complet.';
    }

    if (!isValidCardNumber(paymentForm.cardNumber)) {
      nextErrors.cardNumber =
        'Le numero de carte semble trop court ou trop suspect pour etre accepte.';
    }

    if (!isValidExpiry(paymentForm.expiry)) {
      nextErrors.expiry = 'La date d expiration est invalide.';
    }

    if (!isValidCvc(paymentForm.cvc, cardBrand)) {
      nextErrors.cvc =
        cardBrand === 'American Express'
          ? 'Le code de securite doit contenir 4 chiffres.'
          : 'Le code de securite doit contenir 3 chiffres.';
    }

    return nextErrors;
  };

  const buildPaymentRequest = () => {
    if (paymentMethod === 'paypal') {
      const paypalEmail = paymentForm.paypalEmail.trim().toLowerCase();

      return {
        apiPayload: {
          method: 'paypal',
          payerEmail: paypalEmail,
          payerName: user?.name || ''
        },
        method: 'paypal',
        paymentLabel: getPaymentMethodLabel('paypal', { paypalEmail }),
        paymentEmail: paypalEmail,
        cardBrand: '',
        cardLast4: ''
      };
    }

    const cleanCardNumber = getCardDigits(paymentForm.cardNumber);

    return {
      apiPayload: {
        method: 'card',
        cardholderName: paymentForm.cardholderName.trim(),
        cardNumber: cleanCardNumber,
        expiry: paymentForm.expiry,
        cvc: paymentForm.cvc,
        payerEmail: user?.email || ''
      },
      method: 'card',
      paymentLabel: getPaymentMethodLabel('card', {
        brand: cardBrand,
        cardNumber: cleanCardNumber
      }),
      paymentEmail: user?.email || '',
      cardBrand,
      cardLast4: getLastFourDigits(cleanCardNumber)
    };
  };

  const handlePayment = async () => {
    if (!user) {
      return;
    }

    if (!linkedQuote && !selectedPlan) {
      setPaymentError('Choisissez un plan avant de lancer le paiement.');
      return;
    }

    const nextErrors = validatePaymentForm();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const paymentRequest = buildPaymentRequest();
    const requestPayload = {
      ...paymentRequest.apiPayload,
      agreementAccepted: paymentForm.agreementAccepted
    };

    setIsProcessing(true);
    setPaymentError('');

    try {
      if (linkedQuote) {
        const result = await payQuote(linkedQuote.id, requestPayload);
        const nextTransaction = {
          id: result.transaction?.id || `pay_${Date.now()}`,
          quoteId: linkedQuote.id,
          userId: user.email,
          planId: linkedQuote.id,
          planName: linkedQuote.metadata?.service || 'Projet YTECH',
          service: linkedQuote.metadata?.service || 'Projet YTECH',
          amount: result.transaction?.amount ?? quoteAmount ?? 0,
          currency: result.transaction?.currency || quoteCurrency,
          paymentMethod: result.transaction?.paymentMethod || paymentRequest.method,
          paymentProvider: result.transaction?.paymentProvider || paymentRequest.method,
          paymentLabel: result.transaction?.paymentLabel || paymentRequest.paymentLabel,
          paymentEmail: result.transaction?.paymentEmail || paymentRequest.paymentEmail,
          cardBrand: result.transaction?.cardBrand || paymentRequest.cardBrand,
          cardLast4: result.transaction?.cardLast4 || paymentRequest.cardLast4,
          status: result.transaction?.status || 'completed',
          timestamp: result.transaction?.timestamp || new Date().toISOString()
        };

        persistStoredTransaction(nextTransaction);
        setTransaction(nextTransaction);
        setLinkedQuote(result.quote || linkedQuote);
        setPaymentSuccess(true);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const nextTransaction = {
        id: `${paymentMethod === 'paypal' ? 'pp' : 'cb'}_${Date.now()}`,
        userId: user.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        service: selectedPlan.name,
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        paymentMethod: paymentRequest.method,
        paymentProvider: paymentRequest.method,
        paymentLabel: paymentRequest.paymentLabel,
        paymentEmail: paymentRequest.paymentEmail,
        cardBrand: paymentRequest.cardBrand,
        cardLast4: paymentRequest.cardLast4,
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      persistStoredTransaction(nextTransaction);
      setTransaction(nextTransaction);
      setPaymentSuccess(true);
    } catch (error) {
      setPaymentError(error.message || 'Impossible de finaliser ce paiement pour le moment.');
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
              <h1 className="success-card__title">
                {isCheckoutWindow ? 'Paiement confirme dans cette fenetre.' : 'Paiement confirme.'}
              </h1>
              <p className="success-card__text">
                Votre paiement de {formatMoney(transaction.amount, transaction.currency)} a bien ete
                enregistre pour {transaction.service || transaction.planName}. Moyen confirme :
                {' '}
                {transaction.paymentLabel || 'Paiement securise'}.
              </p>
              {isCheckoutWindow ? (
                <p className="success-card__text">
                  Le recu s ouvre automatiquement sur votre autre onglet. Cette fenetre se fermera
                  dans {closeCountdown} seconde{closeCountdown > 1 ? 's' : ''}.
                </p>
              ) : null}
              <div className="success-card__actions">
                {isCheckoutWindow ? (
                  <button
                    type="button"
                    className="marketing-button marketing-button--dark"
                    onClick={() => window.close()}
                  >
                    Fermer maintenant
                  </button>
                ) : (
                  <Link to="/dashboard" className="marketing-button marketing-button--dark">
                    Retour au dashboard
                  </Link>
                )}
                <Link to={receiptPath} className="marketing-button marketing-button--accent">
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

  if (isQuotePaymentLocked) {
    const isRejectedQuote = linkedQuote?.status === 'rejected';

    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">{isRejectedQuote ? 'NO' : 'WAIT'}</div>
              <h1 className="success-card__title">
                {isRejectedQuote ? 'Paiement indisponible pour ce devis' : 'Paiement pas encore ouvert'}
              </h1>
              <p className="success-card__text">
                {isRejectedQuote
                  ? 'Ce devis a ete refuse ou doit etre recadre. Le paiement ne peut pas etre lance tant qu une nouvelle validation n a pas ete faite.'
                  : 'Ce devis est encore en cours d analyse. Le bouton de paiement apparaitra automatiquement apres validation admin.'}
              </p>
              <div className="success-card__actions">
                <Link to="/devis-management" className="marketing-button marketing-button--dark">
                  Retour au suivi
                </Link>
                <Link
                  to={isRejectedQuote ? '/contact?intent=quote-help' : '/dashboard'}
                  className="marketing-button marketing-button--accent"
                >
                  {isRejectedQuote ? 'Revoir le besoin' : 'Voir le dashboard'}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter note="Le paiement s ouvre seulement quand le devis a bien ete valide par l equipe." />
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
            : 'Choisissez une enveloppe puis payez par carte ou via PayPal.'
        }
        description={
          linkedQuote
            ? 'Le paiement de lancement relie directement le devis accepte au demarrage reel du projet, avec validation du moyen choisi avant confirmation.'
            : 'Vous pouvez maintenant choisir votre plan, regler par carte bancaire ou via PayPal et recevoir un recapitulatif plus propre.'
        }
        actions={[
          linkedQuote
            ? { to: '/devis-management', label: 'Voir mon devis', variant: 'primary' }
            : { to: '/services', label: 'Revoir les services', variant: 'primary' },
          { to: '/contact?intent=support', label: 'Poser une question', variant: 'secondary' }
        ]}
        highlights={
          linkedQuote
            ? ['Carte bancaire validee', 'PayPal disponible', 'Passage auto en production']
            : ['Carte + PayPal', 'Controle des numeros', 'Recu enregistre']
        }
        aside={
          <>
            <span className="hero-panel__eyebrow">{linkedQuote ? 'Devis valide' : 'Client'}</span>
            <h2 className="hero-panel__title">
              {linkedQuote ? linkedQuote.metadata?.service || 'Projet YTECH' : user.name}
            </h2>
            <p className="hero-panel__text">
              {linkedQuote
                ? 'La carte est verifiee avant envoi et PayPal reste disponible si vous preferez regler avec votre compte.'
                : 'Le paiement est plus propre: choix du moyen de paiement, verification des champs et recu plus detaille.'}
            </p>
            <ul className="hero-panel__list">
              <li>Email de recu : {user.email}</li>
              <li>Moyens : carte bancaire ou PayPal</li>
              <li>Controle carte : longueur, reseau, date et algorithme Luhn</li>
            </ul>
          </>
        }
      />

      {!linkedQuote ? (
        <section className="marketing-section">
          <div className="container">
            <div className="section-heading">
              <span className="section-heading__eyebrow">Plans</span>
              <h2 className="section-heading__title">
                Choisissez d abord l enveloppe qui correspond au projet.
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
                      {plan.price.toLocaleString('fr-MA')} {plan.currency}
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
      ) : null}

      {checkoutContext ? (
        <section className="marketing-section marketing-section--muted">
          <div className="container">
            <div className="payment-checkout">
              <article className="receipt-card payment-checkout__summary">
                <span className="payment-section-label">Recapitulatif</span>
                <h2 className="receipt-card__title">{checkoutContext.title}</h2>
                <p className="payment-checkout__subtitle">{checkoutContext.subtitle}</p>
                <ul className="receipt-list">
                  {checkoutContext.summary.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                  <li>
                    <span>Email de recu</span>
                    <strong>{user.email}</strong>
                  </li>
                </ul>

                <div className="receipt-card__amount">
                  {formatMoney(checkoutContext.amount, checkoutContext.currency)}
                </div>

                {linkedQuote?.metadata?.decisionNote ? (
                  <p className="marketing-note">Note YTECH : {linkedQuote.metadata.decisionNote}</p>
                ) : (
                  <p className="marketing-note">
                    Le paiement enregistre votre moyen choisi et declenche le passage a l etape suivante.
                  </p>
                )}
              </article>

              <article className="payment-panel">
                <div className="payment-panel__head">
                  <div>
                    <span className="payment-section-label">Moyen de paiement</span>
                    <h2 className="payment-panel__title">Carte bancaire ou PayPal</h2>
                  </div>
                  <div className="payment-security-badge">Verification active</div>
                </div>

                <div className="payment-method-switch" role="tablist" aria-label="Choix du mode de paiement">
                  <button
                    type="button"
                    className={`payment-method-switch__btn ${paymentMethod === 'card' ? 'is-active' : ''}`}
                    onClick={() => handleMethodChange('card')}
                    aria-selected={paymentMethod === 'card'}
                  >
                    Carte bancaire
                  </button>
                  <button
                    type="button"
                    className={`payment-method-switch__btn ${paymentMethod === 'paypal' ? 'is-active' : ''}`}
                    onClick={() => handleMethodChange('paypal')}
                    aria-selected={paymentMethod === 'paypal'}
                  >
                    PayPal
                  </button>
                </div>

                {paymentMethod === 'card' ? (
                  <div className="payment-form-grid">
                    <label className="payment-field">
                      <span>Titulaire de la carte</span>
                      <input
                        type="text"
                        className={`payment-input ${fieldErrors.cardholderName ? 'is-error' : ''}`}
                        value={paymentForm.cardholderName}
                        onChange={(event) =>
                          updateField('cardholderName', event.target.value.replace(/\s+/g, ' ').trimStart())
                        }
                        placeholder="Nom comme sur la carte"
                        autoComplete="cc-name"
                      />
                      <small className="payment-field__hint">
                        Vous pouvez utiliser les accents, tirets, apostrophes et initiales.
                      </small>
                      {fieldErrors.cardholderName ? (
                        <small className="payment-field__error">{fieldErrors.cardholderName}</small>
                      ) : null}
                    </label>

                    <label className="payment-field payment-field--full">
                      <span>Numero de carte</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`payment-input ${fieldErrors.cardNumber ? 'is-error' : ''}`}
                        value={paymentForm.cardNumber}
                        onChange={(event) => handleCardNumberChange(event.target.value)}
                        placeholder="XXXX XXXX XXXX XXXX"
                        autoComplete="cc-number"
                      />
                      <small className="payment-field__hint">
                        {cardBrand
                          ? `Reseau detecte : ${cardBrand}. Verifiez les chiffres avant confirmation.`
                          : 'Saisissez un numero de carte complet. Les suites trop suspectes comme 1111 ou 1234 sont bloquees.'}
                      </small>
                      {fieldErrors.cardNumber ? (
                        <small className="payment-field__error">{fieldErrors.cardNumber}</small>
                      ) : null}
                    </label>

                    <label className="payment-field">
                      <span>Expiration</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`payment-input ${fieldErrors.expiry ? 'is-error' : ''}`}
                        value={paymentForm.expiry}
                        onChange={(event) => handleExpiryChange(event.target.value)}
                        placeholder="MM/AA"
                        autoComplete="cc-exp"
                      />
                      {fieldErrors.expiry ? (
                        <small className="payment-field__error">{fieldErrors.expiry}</small>
                      ) : null}
                    </label>

                    <label className="payment-field">
                      <span>CVC</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`payment-input ${fieldErrors.cvc ? 'is-error' : ''}`}
                        value={paymentForm.cvc}
                        onChange={(event) => handleCvcChange(event.target.value)}
                        placeholder={cardBrand === 'American Express' ? '1234' : '123'}
                        autoComplete="cc-csc"
                      />
                      {fieldErrors.cvc ? (
                        <small className="payment-field__error">{fieldErrors.cvc}</small>
                      ) : null}
                    </label>
                  </div>
                ) : (
                  <div className="payment-paypal-card">
                    <div className="payment-paypal-card__icon">PP</div>
                    <div>
                      <h3>Paiement via PayPal</h3>
                      <p>
                        Utilisez votre email PayPal pour enregistrer le paiement et recevoir le recu sur la bonne adresse.
                      </p>
                    </div>

                    <label className="payment-field payment-field--full">
                      <span>Email PayPal</span>
                      <input
                        type="email"
                        className={`payment-input ${fieldErrors.paypalEmail ? 'is-error' : ''}`}
                        value={paymentForm.paypalEmail}
                        onChange={(event) => updateField('paypalEmail', event.target.value)}
                        placeholder="paypal@email.com"
                        autoComplete="email"
                      />
                      {fieldErrors.paypalEmail ? (
                        <small className="payment-field__error">{fieldErrors.paypalEmail}</small>
                      ) : (
                        <small className="payment-field__hint">
                          Nous utilisons cette adresse pour tracer le paiement et le recu.
                        </small>
                      )}
                    </label>
                  </div>
                )}

                <label className={`payment-consent ${fieldErrors.agreementAccepted ? 'is-error' : ''}`}>
                  <input
                    type="checkbox"
                    checked={paymentForm.agreementAccepted}
                    onChange={(event) => updateField('agreementAccepted', event.target.checked)}
                  />
                  <span>
                    Je confirme le montant, le moyen de paiement choisi et j accepte l enregistrement du recu.
                  </span>
                </label>
                {fieldErrors.agreementAccepted ? (
                  <div className="payment-field__error">{fieldErrors.agreementAccepted}</div>
                ) : null}

                {paymentError ? <div className="marketing-alert payment-alert">{paymentError}</div> : null}

                <div className="payment-panel__footer">
                  <div className="payment-panel__meta">
                    <strong>{formatMoney(checkoutContext.amount, checkoutContext.currency)}</strong>
                    <span>
                      {paymentMethod === 'card'
                        ? 'Carte verifiee avant confirmation'
                        : 'PayPal confirme avec votre email'}
                    </span>
                  </div>

                  <div className="success-card__actions">
                    <button
                      type="button"
                      className="marketing-button marketing-button--dark"
                      onClick={handlePayment}
                      disabled={isProcessing || (linkedQuote ? !canPayQuote : !selectedPlan)}
                    >
                      {isProcessing ? 'Traitement du paiement...' : `Payer ${formatMoney(checkoutContext.amount, checkoutContext.currency)}`}
                    </button>
                    <Link
                      to={linkedQuote ? '/devis-management' : '/services'}
                      className="marketing-button marketing-button--accent"
                    >
                      {linkedQuote ? 'Retour au suivi' : 'Revoir les offres'}
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter note="La page paiement gere maintenant la carte bancaire et PayPal, avec validation plus serieuse avant confirmation." />
    </div>
  );
};

export default PaymentPage;
