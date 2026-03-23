import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { listQuotes } from '../utils/businessApi';
import { buildReceiptDocument, downloadReceiptPdf, openReceiptPrintWindow } from '../utils/paymentReceipt';
import { readAuthUser, removeStorageKey } from '../utils/storage';
import {
  buildTransactionFromQuote,
  findStoredTransactionById,
  findStoredTransactionByQuoteId,
  persistStoredTransaction,
  readLatestStoredTransaction
} from '../utils/paymentSession';
import './PaymentSuccessPage.css';

const nextSteps = [
  {
    index: '01',
    title: 'Cadrage confirme',
    text: 'Notre equipe verrouille les priorites du projet a partir du paiement et du devis valide.'
  },
  {
    index: '02',
    title: 'Organisation de production',
    text: 'Le planning, les contenus et les points de validation sont prepares avec un cadre plus clair.'
  },
  {
    index: '03',
    title: 'Execution',
    text: 'La production commence avec un suivi plus propre cote client et cote equipe.'
  },
  {
    index: '04',
    title: 'Livraison et suivi',
    text: 'Vous recevez les prochaines etapes, les retours utiles et le support associe au projet.'
  }
];

const PaymentSuccessPage = () => {
  const [transaction, setTransaction] = useState(null);
  const [user, setUser] = useState(null);
  const [actionError, setActionError] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isResolvingReceipt, setIsResolvingReceipt] = useState(true);
  const [searchParams] = useSearchParams();
  const requestedTransactionId = searchParams.get('transactionId');
  const requestedQuoteId = searchParams.get('quoteId');

  useEffect(() => {
    let isMounted = true;

    const loadReceiptContext = async () => {
      const authUser = readAuthUser();

      if (!isMounted) {
        return;
      }

      setUser(authUser);
      setIsResolvingReceipt(true);

      let nextTransaction =
        (requestedTransactionId ? findStoredTransactionById(requestedTransactionId) : null) ||
        (requestedQuoteId ? findStoredTransactionByQuoteId(requestedQuoteId) : null) ||
        readLatestStoredTransaction();

      if ((!nextTransaction || requestedQuoteId || requestedTransactionId) && authUser) {
        try {
          const quotes = await listQuotes();
          const matchingQuote =
            (requestedQuoteId ? quotes.find((quote) => quote.id === requestedQuoteId) : null) ||
            (requestedTransactionId
              ? quotes.find((quote) => quote.metadata?.paymentTransactionId === requestedTransactionId)
              : null) ||
            (nextTransaction?.quoteId
              ? quotes.find((quote) => quote.id === nextTransaction.quoteId)
              : null) ||
            quotes.find((quote) => quote.metadata?.paymentTransactionId);

          const derivedTransaction = buildTransactionFromQuote(matchingQuote, authUser);

          if (derivedTransaction) {
            persistStoredTransaction(derivedTransaction);
            nextTransaction = derivedTransaction;
          }
        } catch (error) {
          console.warn('Impossible de reconstituer automatiquement le recu depuis les devis.', error);
        }
      }

      if (!isMounted) {
        return;
      }

      setTransaction(nextTransaction || null);
      setIsResolvingReceipt(false);
    };

    loadReceiptContext();

    return () => {
      isMounted = false;
    };
  }, [requestedQuoteId, requestedTransactionId]);

  const receipt = buildReceiptDocument({ transaction, user });
  const hasTransaction = Boolean(transaction);

  const handleDownloadReceipt = async () => {
    if (!hasTransaction) {
      setActionError('Aucune transaction recente n est disponible pour le PDF.');
      return;
    }

    setActionError('');
    setIsDownloadingPdf(true);

    try {
      await downloadReceiptPdf(receipt);
    } catch (error) {
      setActionError(error.message || 'Impossible de generer le PDF pour le moment.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!hasTransaction) {
      setActionError('Aucune transaction recente n est disponible pour l impression.');
      return;
    }

    setActionError('');

    const didOpenPrintWindow = openReceiptPrintWindow(receipt);

    if (!didOpenPrintWindow) {
      setActionError('La fenetre d impression a ete bloquee par le navigateur.');
    }
  };

  const handleClearLocalReceiptData = () => {
    const hasClearedStorage = removeStorageKey('transactions');

    if (!hasClearedStorage) {
      setActionError('Impossible de vider les donnees locales du recu pour le moment.');
      return;
    }

    setActionError('');
    setTransaction(null);
    setIsDownloadingPdf(false);
  };

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow={hasTransaction ? 'Paiement confirme' : isResolvingReceipt ? 'Recherche du recu' : 'Recu indisponible'}
        title={
          hasTransaction
            ? 'Votre paiement a bien ete enregistre.'
            : isResolvingReceipt
              ? 'Nous reconstituons votre recu de paiement.'
              : 'Aucun recu recent n a ete retrouve pour le moment.'
        }
        description={
          hasTransaction
            ? 'Le recu a ete refait pour etre plus propre a lire, plus net a imprimer et telechargeable directement en PDF.'
            : isResolvingReceipt
              ? 'La page verifie le stockage local puis vos devis payes pour retrouver automatiquement votre transaction.'
              : 'Retournez dans votre espace client apres un paiement pour recuperer le recu et imprimer les details de transaction.'
        }
        actions={[
          { to: '/dashboard', label: 'Retour au dashboard', variant: 'primary' },
          { to: '/contact?intent=support', label: 'Contacter le support', variant: 'secondary' }
        ]}
        highlights={
          hasTransaction
            ? ['PDF pret a partager', 'Impression dediee', 'Details plus propres']
            : ['Dashboard client', 'Support YTECH', 'Recu apres paiement']
        }
        tone="success"
        aside={
          <div className="payment-success-hero">
            <span className="hero-panel__eyebrow">Recu</span>
            <h2 className="hero-panel__title">
              {hasTransaction ? `Transaction #${receipt.transactionId}` : 'Espace de recu'}
            </h2>
            <p className="hero-panel__text">
              {hasTransaction
                ? 'Le document est pret pour export PDF, impression propre et partage avec votre client ou votre equipe.'
                : 'Le recu apparaitra automatiquement ici des qu une transaction sera enregistree.'}
            </p>
            <ul className="hero-panel__list">
              <li>Projet : {receipt.projectLabel}</li>
              <li>Date : {receipt.issuedAtLabel}</li>
              <li>Montant : {receipt.amountLabel}</li>
              <li>Moyen : {receipt.paymentDetail}</li>
            </ul>
          </div>
        }
      />

      <section className="marketing-section">
        <div className="container">
          {hasTransaction ? (
            <div className="payment-success-layout">
              <article className="receipt-sheet">
                <div className="receipt-sheet__top">
                  <div>
                    <span className="receipt-sheet__eyebrow">Recu PDF</span>
                    <h2 className="receipt-sheet__title">Details de transaction retravailles</h2>
                    <p className="receipt-sheet__intro">
                      Le recu ne sort plus en fichier texte. Il est maintenant pense comme un vrai document de paiement.
                    </p>
                  </div>
                  <div className="receipt-sheet__status">{receipt.paymentStatus}</div>
                </div>

                <div className="receipt-sheet__hero">
                  <div className="receipt-sheet__hero-copy">
                    <span className="receipt-sheet__label">Transaction</span>
                    <strong className="receipt-sheet__id">#{receipt.transactionId}</strong>
                    <p>{receipt.summaryNote}</p>
                  </div>

                  <div className="receipt-sheet__amount">
                    <span>Montant regle</span>
                    <strong>{receipt.amountLabel}</strong>
                    <small>{receipt.issuedAtLabel}</small>
                  </div>
                </div>

                <div className="receipt-sheet__grid">
                  {receipt.sections.map((section) => (
                    <section key={section.title} className="receipt-section-card">
                      <h3>{section.title}</h3>
                      <div className="receipt-section-card__rows">
                        {section.rows.map((row) => (
                          <div key={`${section.title}-${row.label}`} className="receipt-section-card__row">
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                {actionError ? <div className="marketing-alert payment-success-alert">{actionError}</div> : null}

                <div className="success-card__actions payment-success-actions">
                  <button
                    type="button"
                    className="marketing-button marketing-button--dark"
                    onClick={handleDownloadReceipt}
                    disabled={isDownloadingPdf}
                  >
                    {isDownloadingPdf ? 'Generation du PDF...' : 'Telecharger le recu en PDF'}
                  </button>
                  <button
                    type="button"
                    className="marketing-button marketing-button--accent"
                    onClick={handlePrintReceipt}
                  >
                    Imprimer le recu
                  </button>
                  <button
                    type="button"
                    className="marketing-button marketing-button--secondary"
                    onClick={handleClearLocalReceiptData}
                  >
                    Vider les donnees locales
                  </button>
                </div>

                <p className="marketing-note payment-success-local-note">
                  Cette action efface seulement le recu stocke dans votre navigateur pour remettre l ecran a vide.
                </p>
              </article>

              <aside className="receipt-sidecard">
                <span className="receipt-sidecard__eyebrow">Mise a jour</span>
                <h3 className="receipt-sidecard__title">Le recu est maintenant plus presentable.</h3>
                <p className="receipt-sidecard__text">
                  Le document garde un format plus professionnel pour partage client, archivage interne et impression papier.
                </p>
                <ul className="receipt-sidecard__list">
                  <li>Export direct en PDF au lieu d un fichier `.txt`</li>
                  <li>Impression depuis un document dedie, sans la page marketing autour</li>
                  <li>Details regroupes par blocs plus lisibles</li>
                </ul>

                <div className="receipt-sidecard__meta">
                  <span>Email de recu</span>
                  <strong>{receipt.paymentEmail}</strong>
                </div>
                <div className="receipt-sidecard__meta">
                  <span>Support</span>
                  <strong>{receipt.supportEmail}</strong>
                </div>
              </aside>
            </div>
          ) : (
            <div className="success-card payment-success-empty">
              <div className="success-card__icon">{isResolvingReceipt ? '...' : 'REC'}</div>
              <h2 className="success-card__title">
                {isResolvingReceipt ? 'Recherche du recu en cours' : 'Aucune transaction recente'}
              </h2>
              <p className="success-card__text">
                {isResolvingReceipt
                  ? 'Patientez un instant pendant que nous verifions vos paiements deja enregistres.'
                  : 'Cette page affiche le dernier recu enregistre dans votre espace client. Lancez un paiement puis revenez ici pour exporter le PDF.'}
              </p>
              <div className="success-card__actions">
                <Link to="/payment" className="marketing-button marketing-button--dark">
                  Aller au paiement
                </Link>
                <Link to="/dashboard" className="marketing-button marketing-button--accent">
                  Retour au dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="section-heading__eyebrow">Suite du projet</span>
            <h2 className="section-heading__title">Le paiement est confirme. La suite se deroule comme ceci.</h2>
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

      <SiteFooter note="Le recu de paiement est maintenant plus propre a consulter, a imprimer et a telecharger en PDF." />
    </div>
  );
};

export default PaymentSuccessPage;
