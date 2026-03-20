import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

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

const PaymentPage = () => {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [navigate]);

  const handlePayment = async () => {
    if (!selectedPlan || !user) {
      return;
    }

    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2200));

      const transaction = {
        id: Date.now(),
        userId: user.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions.push(transaction);
      localStorage.setItem('transactions', JSON.stringify(transactions));

      setPaymentSuccess(true);
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="marketing-page">
        <div className="loading-shell">
          <div className="loading-shell__card">Preparation de votre espace de paiement...</div>
        </div>
      </div>
    );
  }

  if (paymentSuccess && selectedPlan) {
    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">PAY</div>
              <h1 className="success-card__title">Paiement confirme.</h1>
              <p className="success-card__text">
                Votre paiement de {selectedPlan.price.toLocaleString()} {selectedPlan.currency} a
                bien ete enregistre pour le {selectedPlan.name}. Nous revenons vers vous tres vite
                pour organiser le lancement.
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

        <SiteFooter note="Un parcours paiement plus propre, plus lisible et mieux raccorde au reste du site." />
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Paiement"
        title="Choisissez un cadre de production puis lancez la suite."
        description="Les trois plans servent surtout de point de depart pour cadrer l enveloppe, la complexite et le rythme de livraison."
        actions={[
          { to: '/services', label: 'Revoir les services', variant: 'primary' },
          { to: '/contact?intent=support', label: 'Poser une question', variant: 'secondary' }
        ]}
        highlights={['Paiement securise', 'Plans lisibles', 'Lancement rapide']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Client</span>
            <h2 className="hero-panel__title">{user.name}</h2>
            <p className="hero-panel__text">
              Votre selection sera reliee a votre compte pour que l equipe puisse organiser le
              demarrage du projet dans la foulee.
            </p>
            <ul className="hero-panel__list">
              <li>Email : {user.email}</li>
              <li>Mode : carte bancaire securisee</li>
              <li>Suite : confirmation + recu + prise de contact</li>
            </ul>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Plans</span>
            <h2 className="section-heading__title">Une lecture plus nette des enveloppes et de ce qu elles couvrent.</h2>
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

      <SiteFooter note="Une page paiement repensee pour rester premium, rassurante et facile a parcourir." />
    </div>
  );
};

export default PaymentPage;
