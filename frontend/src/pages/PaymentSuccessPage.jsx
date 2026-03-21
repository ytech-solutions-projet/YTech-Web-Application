import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';

const nextSteps = [
  {
    index: '01',
    title: 'Prise de contact',
    text: 'Notre equipe revient vers vous pour confirmer le cadrage et la suite de production.'
  },
  {
    index: '02',
    title: 'Planification',
    text: 'Nous validons les priorites, les contenus et le rythme de livraison.'
  },
  {
    index: '03',
    title: 'Production',
    text: 'Le projet entre en execution avec un suivi plus propre et plus visible.'
  },
  {
    index: '04',
    title: 'Livraison',
    text: 'Vous recevez le projet avec support, retours et prochaines options.'
  }
];

const PaymentSuccessPage = () => {
  const [transaction, setTransaction] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    if (transactions.length > 0) {
      setTransaction(transactions[transactions.length - 1]);
    }
  }, []);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadReceipt = () => {
    const receiptContent = [
      'YTECH - Recu de paiement',
      '========================',
      '',
      `Date : ${formatDate(transaction?.timestamp || new Date().toISOString())}`,
      `Numero de transaction : ${transaction?.id || 'N/A'}`,
      '',
      `Client : ${user?.name || 'N/A'}`,
      `Email : ${user?.email || 'N/A'}`,
      '',
      `Projet : ${transaction?.service || transaction?.planName || 'N/A'}`,
      `Reference devis : ${transaction?.quoteId || 'N/A'}`,
      `Montant : ${transaction?.amount || '0'} ${transaction?.currency || 'MAD'}`,
      `Moyen : ${transaction?.paymentLabel || 'Paiement securise'}`,
      `Email de recu : ${transaction?.paymentEmail || user?.email || 'N/A'}`,
      `Statut : ${transaction?.status || 'completed'}`,
      '',
      'Merci pour votre confiance dans YTECH.',
      '',
      'Contact :',
      'contact@ytech.ma',
      '+212 6 00 00 00 00',
      'Casablanca, Maroc'
    ].join('\n');

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `recu_ytech_${transaction?.id || Date.now()}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Paiement confirme"
        title="Votre paiement a bien ete enregistre."
        description="Merci pour votre confiance. Vous pouvez deja recuperer votre recu et consulter les prochaines etapes du projet."
        actions={[
          { to: '/dashboard', label: 'Retour au dashboard', variant: 'primary' },
          { to: '/contact?intent=support', label: 'Contacter le support', variant: 'secondary' }
        ]}
        highlights={['Transaction securisee', 'Confirmation enregistree', 'Equipe notifiee']}
        tone="success"
        aside={
          <>
            <span className="hero-panel__eyebrow">Recu</span>
            <h2 className="hero-panel__title">Transaction #{transaction?.id || 'N/A'}</h2>
            <p className="hero-panel__text">
              Votre confirmation reste disponible sur cette page et dans votre espace client.
            </p>
            <ul className="hero-panel__list">
              <li>Projet : {transaction?.service || transaction?.planName || 'N/A'}</li>
              <li>Date : {formatDate(transaction?.timestamp || new Date().toISOString())}</li>
              <li>Montant : {transaction?.amount?.toLocaleString() || '0'} {transaction?.currency || 'MAD'}</li>
              <li>Moyen : {transaction?.paymentLabel || 'Paiement securise'}</li>
            </ul>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="receipt-card">
            <h2 className="receipt-card__title">Details de la transaction</h2>
            <ul className="receipt-list">
              <li>
                <span>Client</span>
                <strong>{user?.name || 'N/A'}</strong>
              </li>
              <li>
                <span>Email</span>
                <strong>{user?.email || 'N/A'}</strong>
              </li>
              <li>
                <span>Projet</span>
                <strong>{transaction?.service || transaction?.planName || 'N/A'}</strong>
              </li>
              {transaction?.quoteId ? (
                <li>
                  <span>Devis</span>
                  <strong>{transaction.quoteId}</strong>
                </li>
              ) : null}
              <li>
                <span>Date</span>
                <strong>{formatDate(transaction?.timestamp || new Date().toISOString())}</strong>
              </li>
              <li>
                <span>Moyen</span>
                <strong>{transaction?.paymentLabel || 'Paiement securise'}</strong>
              </li>
              {transaction?.paymentEmail ? (
                <li>
                  <span>Email de recu</span>
                  <strong>{transaction.paymentEmail}</strong>
                </li>
              ) : null}
            </ul>

            <div className="receipt-card__amount">
              {transaction?.amount?.toLocaleString() || '0'} {transaction?.currency || 'MAD'}
            </div>

            <div className="success-card__actions marketing-mt-md">
              <button
                type="button"
                className="marketing-button marketing-button--dark"
                onClick={handleDownloadReceipt}
              >
                Telecharger le recu
              </button>
              <button
                type="button"
                className="marketing-button marketing-button--accent"
                onClick={() => window.print()}
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Suite du projet</span>
            <h2 className="section-heading__title">La transaction est faite. Voici comment la suite se deroule.</h2>
          </div>

          <div className="step-grid">
            {nextSteps.map((step) => (
              <article key={step.index} className="step-card">
                <span className="step-card__index">{step.index}</span>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__text">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter note="Un ecran de confirmation plus propre pour rassurer, recapitulatif inclus, apres le paiement." />
    </div>
  );
};

export default PaymentSuccessPage;
