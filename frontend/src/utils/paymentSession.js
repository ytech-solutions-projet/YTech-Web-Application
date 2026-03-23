import { readJsonStorage, writeJsonStorage } from './storage';

const TRANSACTION_STORAGE_KEY = 'transactions';
const MAX_STORED_TRANSACTIONS = 50;

const toTimestamp = (value) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const buildReceiptPath = ({ transactionId, quoteId } = {}) => {
  const searchParams = new URLSearchParams();

  if (transactionId) {
    searchParams.set('transactionId', transactionId);
  }

  if (quoteId) {
    searchParams.set('quoteId', quoteId);
  }

  const search = searchParams.toString();
  return search ? `/payment-success?${search}` : '/payment-success';
};

export const buildQuotePaymentPath = (quoteId, options = {}) => {
  const searchParams = new URLSearchParams();

  if (quoteId) {
    searchParams.set('quoteId', quoteId);
  }

  if (options.checkoutWindow) {
    searchParams.set('checkoutWindow', '1');
  }

  const search = searchParams.toString();
  return search ? `/payment?${search}` : '/payment';
};

export const readStoredTransactions = () => {
  const transactions = readJsonStorage(TRANSACTION_STORAGE_KEY, []);
  return Array.isArray(transactions) ? transactions : [];
};

export const persistStoredTransaction = (transaction) => {
  if (!transaction?.id) {
    return false;
  }

  const nextTransactions = [
    transaction,
    ...readStoredTransactions().filter((entry) => entry?.id !== transaction.id)
  ]
    .sort((first, second) => toTimestamp(second?.timestamp) - toTimestamp(first?.timestamp))
    .slice(0, MAX_STORED_TRANSACTIONS);

  return writeJsonStorage(TRANSACTION_STORAGE_KEY, nextTransactions);
};

export const findStoredTransactionById = (transactionId) => {
  if (!transactionId) {
    return null;
  }

  return readStoredTransactions().find((transaction) => transaction?.id === transactionId) || null;
};

export const findStoredTransactionByQuoteId = (quoteId) => {
  if (!quoteId) {
    return null;
  }

  return readStoredTransactions().find((transaction) => transaction?.quoteId === quoteId) || null;
};

export const readLatestStoredTransaction = () => readStoredTransactions()[0] || null;

export const buildTransactionFromQuote = (quote, user = null) => {
  if (!quote?.metadata?.paymentTransactionId) {
    return null;
  }

  const amount =
    quote.metadata?.paymentAmount ??
    quote.metadata?.estimatedMin ??
    quote.metadata?.estimatedMax ??
    0;

  return {
    id: quote.metadata.paymentTransactionId,
    quoteId: quote.id,
    userId: quote.email || user?.email || '',
    planId: quote.id,
    planName: quote.metadata?.service || 'Projet YTECH',
    service: quote.metadata?.service || 'Projet YTECH',
    amount: Number.isFinite(Number(amount)) ? Number(amount) : 0,
    currency: quote.metadata?.paymentCurrency || 'MAD',
    paymentMethod: quote.metadata?.paymentMethod || 'card',
    paymentProvider: quote.metadata?.paymentProvider || quote.metadata?.paymentMethod || 'card',
    paymentLabel: quote.metadata?.paymentLabel || 'Paiement securise',
    paymentEmail: quote.metadata?.paymentPayerEmail || quote.email || user?.email || '',
    cardBrand: quote.metadata?.paymentCardBrand || '',
    cardLast4: quote.metadata?.paymentLast4 || '',
    status: quote.metadata?.paymentStatus === 'paid' ? 'completed' : quote.metadata?.paymentStatus || 'completed',
    timestamp: quote.metadata?.paymentPaidAt || quote.metadata?.decidedAt || quote.timestamp || new Date().toISOString()
  };
};

export const openQuotePaymentWindow = (quoteId) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const paymentUrl = buildQuotePaymentPath(quoteId, { checkoutWindow: true });
  return window.open(paymentUrl, 'ytech-payment-window', 'popup=yes,width=980,height=900');
};
