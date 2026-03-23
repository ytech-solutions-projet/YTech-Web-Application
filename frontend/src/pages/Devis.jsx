import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PhoneField from '../components/PhoneField';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { isPhoneValueValid } from '../utils/phone';
import { submitQuoteRequest } from '../utils/businessApi';
import {
  AUTH_CHANGE_EVENT,
  clearAuthSession,
  readAuthUser,
  readJsonStorage,
  removeStorageKey,
  writeJsonStorage
} from '../utils/storage';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  service: '',
  projectDescription: '',
  budget: '',
  timeline: '',
  features: []
};

const services = [
  {
    id: 'site-vitrine',
    name: 'Site vitrine',
    priceRange: '5 000 - 15 000 DH',
    minPrice: 5000,
    maxPrice: 15000,
    suffix: ''
  },
  {
    id: 'site-e-commerce',
    name: 'Site e-commerce',
    priceRange: '15 000 - 50 000 DH',
    minPrice: 15000,
    maxPrice: 50000,
    suffix: ''
  },
  {
    id: 'application-mobile',
    name: 'Application mobile',
    priceRange: '25 000 - 100 000 DH',
    minPrice: 25000,
    maxPrice: 100000,
    suffix: ''
  },
  {
    id: 'web-application',
    name: 'Application web',
    priceRange: '20 000 - 80 000 DH',
    minPrice: 20000,
    maxPrice: 80000,
    suffix: ''
  },
  {
    id: 'portfolio',
    name: 'Portfolio creatif',
    priceRange: '3 000 - 10 000 DH',
    minPrice: 3000,
    maxPrice: 10000,
    suffix: ''
  },
  {
    id: 'seo-marketing',
    name: 'SEO et marketing',
    priceRange: '2 000 - 10 000 DH / mois',
    minPrice: 2000,
    maxPrice: 10000,
    suffix: ' / mois'
  },
  {
    id: 'maintenance',
    name: 'Maintenance et support',
    priceRange: '1 000 - 5 000 DH / mois',
    minPrice: 1000,
    maxPrice: 5000,
    suffix: ' / mois'
  }
];

const availableFeatures = [
  'Design personnalise',
  'Responsive design',
  'Optimisation SEO',
  'Paiement en ligne',
  'Panel admin',
  'Version multilingue',
  'API REST',
  'Base de donnees',
  'Hebergement',
  'Formation',
  'Support technique'
];

const featureCostByName = {
  'Design personnalise': 2500,
  'Responsive design': 1000,
  'Optimisation SEO': 1500,
  'Paiement en ligne': 4000,
  'Panel admin': 3500,
  'Version multilingue': 2000,
  'API REST': 4000,
  'Base de donnees': 3000,
  Hebergement: 800,
  Formation: 1200,
  'Support technique': 1500
};

const budgetOptions = [
  { value: 'moins-5k', label: 'Moins de 5 000 DH', min: 0, max: 4999 },
  { value: '5k-10k', label: '5 000 - 10 000 DH', min: 5000, max: 10000 },
  { value: '10k-25k', label: '10 000 - 25 000 DH', min: 10000, max: 25000 },
  { value: '25k-50k', label: '25 000 - 50 000 DH', min: 25000, max: 50000 },
  { value: '50k-100k', label: '50 000 - 100 000 DH', min: 50000, max: 100000 },
  { value: 'plus-100k', label: 'Plus de 100 000 DH', min: 100000, max: Number.POSITIVE_INFINITY }
];

const timelineOptions = [
  {
    value: 'urgent',
    label: 'Urgent (1-2 semaines)',
    multiplier: 1.35,
    impact: '+35% pour mobiliser l equipe plus vite'
  },
  {
    value: 'rapide',
    label: 'Rapide (3-4 semaines)',
    multiplier: 1.18,
    impact: '+18% pour priorisation du planning'
  },
  {
    value: 'normal',
    label: 'Normal (1-2 mois)',
    multiplier: 1,
    impact: 'Base standard sans majoration'
  },
  {
    value: 'flexible',
    label: 'Flexible (3+ mois)',
    multiplier: 0.92,
    impact: '-8% si le planning est plus souple'
  }
];

const roundToNearestFiveHundred = (amount) => Math.max(0, Math.round(amount / 500) * 500);

const formatDhAmount = (amount, suffix = '') =>
  `${roundToNearestFiveHundred(amount).toLocaleString('fr-MA')} DH${suffix}`;

const formatDhRange = (minAmount, maxAmount, suffix = '') =>
  `${roundToNearestFiveHundred(minAmount).toLocaleString('fr-MA')} - ${roundToNearestFiveHundred(maxAmount).toLocaleString('fr-MA')} DH${suffix}`;

const highlights = [
  {
    eyebrow: 'Delai',
    title: 'Un delai plus court demande plus de mobilisation.',
    text: 'Si le projet doit sortir plus vite, le budget monte pour absorber la priorite et la charge.'
  },
  {
    eyebrow: 'Budget',
    title: 'Une estimation logique avant le devis final.',
    text: 'Le calcul prend en compte le service, les options choisies et le niveau d urgence.'
  }
];

const QUOTE_DRAFT_STORAGE_KEY = 'ytech-quote-draft';
const QUOTE_NEXT_PATH = '/devis';

const buildUserPrefilledForm = (user = readAuthUser()) => {
  try {
    if (!user) {
      return initialFormData;
    }

    return {
      ...initialFormData,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      company: user.company || ''
    };
  } catch (error) {
    console.warn("Impossible de lire l'utilisateur pour le pre-remplissage.", error);
    return initialFormData;
  }
};

const readQuoteDraft = () => {
  const draft = readJsonStorage(QUOTE_DRAFT_STORAGE_KEY, null);
  if (!draft || typeof draft !== 'object') {
    return null;
  }

  return {
    name: `${draft.name || ''}`,
    email: `${draft.email || ''}`,
    phone: `${draft.phone || ''}`,
    company: `${draft.company || ''}`,
    service: `${draft.service || ''}`,
    projectDescription: `${draft.projectDescription || ''}`,
    budget: `${draft.budget || ''}`,
    timeline: `${draft.timeline || ''}`,
    features: Array.isArray(draft.features) ? draft.features.filter((feature) => typeof feature === 'string') : []
  };
};

const buildQuoteFormState = (user = readAuthUser()) => {
  const userPrefill = buildUserPrefilledForm(user);

  if (!user) {
    return initialFormData;
  }

  const draft = readQuoteDraft();

  if (!draft) {
    return userPrefill;
  }

  return {
    ...initialFormData,
    ...draft,
    name: userPrefill.name || draft.name || '',
    email: userPrefill.email || draft.email || '',
    phone: userPrefill.phone || draft.phone || '',
    company: userPrefill.company || draft.company || ''
  };
};

const Devis = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [authUser, setAuthUser] = useState(() => readAuthUser());
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');

  useEffect(() => {
    const currentUser = readAuthUser();
    const quoteDraft = currentUser ? readQuoteDraft() : null;
    setFormData(buildQuoteFormState(currentUser));

    if (quoteDraft) {
      setDraftNotice(
        'Votre brouillon de devis a ete retrouve. Vous pouvez maintenant l envoyer.'
      );
    }
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      setAuthUser(readAuthUser());
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      name: authUser.name || '',
      email: authUser.email || '',
      phone: authUser.phone || '',
      company: authUser.company || ''
    }));
    setAuthModalOpen(false);
  }, [authUser]);

  useEffect(() => {
    if (!authModalOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [authModalOpen]);

  const persistQuoteDraft = () => {
    writeJsonStorage(QUOTE_DRAFT_STORAGE_KEY, {
      ...formData,
      features: [...formData.features]
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }

    if (submitError) {
      setSubmitError('');
    }

    if (draftNotice) {
      setDraftNotice('');
    }
  };

  const handleFeatureToggle = (feature) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((item) => item !== feature)
        : [...prev.features, feature]
    }));
  };

  const selectedService = useMemo(
    () => services.find((service) => service.id === formData.service) || null,
    [formData.service]
  );

  const selectedBudgetOption = useMemo(
    () => budgetOptions.find((budget) => budget.value === formData.budget) || null,
    [formData.budget]
  );

  const selectedTimelineOption = useMemo(
    () => timelineOptions.find((timeline) => timeline.value === formData.timeline) || null,
    [formData.timeline]
  );

  const quoteEstimate = useMemo(() => {
    if (!selectedService) {
      return null;
    }

    const featureCost = formData.features.reduce(
      (total, feature) => total + (featureCostByName[feature] || 0),
      0
    );
    const timelineMultiplier = selectedTimelineOption?.multiplier ?? 1;
    const estimatedMin = roundToNearestFiveHundred(
      (selectedService.minPrice + featureCost) * timelineMultiplier
    );
    const estimatedMax = roundToNearestFiveHundred(
      (selectedService.maxPrice + featureCost) * timelineMultiplier
    );

    let budgetInsight = '';
    if (selectedBudgetOption) {
      if (selectedBudgetOption.max < estimatedMin) {
        budgetInsight = 'Votre budget actuel semble en dessous de cette estimation initiale.';
      } else if (selectedBudgetOption.min > estimatedMax) {
        budgetInsight = 'Votre budget semble au-dessus de cette estimation initiale.';
      } else {
        budgetInsight = 'Votre budget semble coherent avec cette estimation initiale.';
      }
    }

    return {
      featureCost,
      estimatedMin,
      estimatedMax,
      serviceBaseRange: formatDhRange(
        selectedService.minPrice,
        selectedService.maxPrice,
        selectedService.suffix
      ),
      featureCostLabel:
        featureCost > 0
          ? `+ ${formatDhAmount(featureCost, selectedService.suffix)}`
          : 'Aucune option supplementaire',
      timelineLabel: selectedTimelineOption?.label || 'Delai non precise',
      timelineImpact: selectedTimelineOption?.impact || 'Base standard sans majoration',
      timelineMultiplier,
      formattedRange: formatDhRange(estimatedMin, estimatedMax, selectedService.suffix),
      budgetInsight
    };
  }, [formData.features, selectedBudgetOption, selectedService, selectedTimelineOption]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le telephone est requis';
    } else if (!isPhoneValueValid(formData.phone)) {
      newErrors.phone = 'Choisissez un pays puis saisissez un numero valide';
    }

    if (!formData.service) {
      newErrors.service = 'Le service est requis';
    }

    if (!formData.projectDescription.trim()) {
      newErrors.projectDescription = 'La description du projet est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const currentAuthUser = authUser || readAuthUser();
    if (!currentAuthUser) {
      persistQuoteDraft();
      setAuthModalOpen(true);
      setSubmitError('');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const quoteRequest = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        service: formData.service,
        projectDescription: formData.projectDescription,
        budget: formData.budget,
        timeline: formData.timeline,
        features: formData.features,
        content: [
          'Nouvelle demande de devis',
          '',
          `Nom : ${formData.name}`,
          `Email : ${formData.email}`,
          `Telephone : ${formData.phone}`,
          `Entreprise : ${formData.company || 'Non specifiee'}`,
          '',
          `Service : ${selectedService?.name || formData.service}`,
          `Budget : ${selectedBudgetOption?.label || 'Non specifie'}`,
          `Delai : ${selectedTimelineOption?.label || 'Non specifie'}`,
          `Estimation initiale : ${quoteEstimate?.formattedRange || 'A definir'}`,
          `Ajustement delai : ${quoteEstimate?.timelineImpact || 'Base standard sans majoration'}`,
          `Options ajoutees : ${quoteEstimate?.featureCostLabel || 'Aucune option supplementaire'}`,
          '',
          'Description :',
          formData.projectDescription,
          '',
          'Fonctionnalites souhaitees :',
          formData.features.length > 0 ? formData.features.join(', ') : 'Non specifiees'
        ].join('\n'),
        metadata: {
          service: selectedService?.name || formData.service,
          serviceId: formData.service,
          budget: selectedBudgetOption?.label || formData.budget,
          budgetValue: formData.budget,
          timeline: selectedTimelineOption?.label || formData.timeline,
          timelineValue: formData.timeline,
          features: formData.features,
          estimatedRange: quoteEstimate?.formattedRange || '',
          estimatedMin: quoteEstimate?.estimatedMin ?? null,
          estimatedMax: quoteEstimate?.estimatedMax ?? null,
          featureCost: quoteEstimate?.featureCost ?? 0,
          timelineMultiplier: quoteEstimate?.timelineMultiplier ?? 1,
          timelineImpact: quoteEstimate?.timelineImpact || ''
        }
      };

      await submitQuoteRequest(quoteRequest);

      removeStorageKey(QUOTE_DRAFT_STORAGE_KEY);
      setIsSubmitted(true);
      setFormData(initialFormData);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        persistQuoteDraft();
        clearAuthSession();
        setAuthUser(null);
        setAuthModalOpen(true);
        setSubmitError('');
        return;
      }

      console.error('Quote form error:', error);
      setSubmitError(error.message || "Une erreur est survenue lors de l'envoi de la demande. Veuillez reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="marketing-page">
        <section className="success-state">
          <div className="container">
            <div className="success-card">
              <div className="success-card__icon">DV</div>
              <h1 className="success-card__title">Votre demande de devis a ete envoyee.</h1>
              <p className="success-card__text">
                Merci pour les details transmis. Nous analysons votre besoin et revenons vers vous
                rapidement avec une proposition plus claire.
              </p>
              <div className="success-card__actions">
                <Link to="/" className="marketing-button marketing-button--dark">
                  Retour a l accueil
                </Link>
                <button
                  type="button"
                  className="marketing-button marketing-button--accent"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData(buildQuoteFormState());
                  }}
                >
                  Envoyer un autre devis
                </button>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter note="Une page devis plus lisible pour transformer un besoin vague en demande exploitable." />
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <PublicHero
        eyebrow="Demande de devis"
        title="Decrire le besoin, cadrer le budget, avancer plus vite."
        description="Ce formulaire nous aide a vous repondre avec une proposition plus utile : bonne enveloppe, bon format et bon niveau d ambition pour votre projet."
        actions={[
          { to: '/contact?intent=quote-help', label: "Besoin d'aide pour le devis", variant: 'primary' },
          { to: '/services', label: 'Voir les offres', variant: 'secondary' }
        ]}
        highlights={['Reponse rapide', 'Chiffrage initial', 'Projet sur mesure']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Mode d emploi</span>
            <h2 className="hero-panel__title">Nous cherchons surtout a comprendre votre priorite.</h2>
            <p className="hero-panel__text">
              Le devis sera d autant plus utile si vous nous donnez le contexte, le resultat vise
              et les contraintes principales.
            </p>
            <ul className="hero-panel__list">
              <li>Decrivez votre besoin avec des mots simples.</li>
              <li>Indiquez une fourchette de budget si vous en avez une.</li>
              <li>Listez les fonctions vraiment indispensables au lancement.</li>
            </ul>
          </>
        }
      />

      <section className="marketing-section marketing-section--compact">
        <div className="container">
          <div className="card-grid card-grid--two">
            {highlights.map((item) => (
              <article key={item.title} className="panel-card">
                <span className="panel-card__eyebrow">{item.eyebrow}</span>
                <h3 className="panel-card__title">{item.title}</h3>
                <p className="panel-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-form-shell">
            <aside className="card-grid">
              <div className="marketing-side-card">
                <span className="hero-panel__eyebrow">Bonnes pratiques</span>
                <h2 className="hero-panel__title">Un devis utile repose surtout sur trois points.</h2>
                <ul className="stack-list">
                  <li>Le probleme a resoudre ou le resultat recherche.</li>
                  <li>Le niveau de priorite : un delai tres court augmente souvent le budget.</li>
                  <li>Le minimum fonctionnel necessaire pour lancer.</li>
                </ul>
              </div>

              <article className="receipt-card">
                <h2 className="receipt-card__title">Estimation initiale</h2>
                {selectedService ? (
                  <>
                    <ul className="receipt-list">
                      <li>
                        <span>Base de service</span>
                        <strong>{quoteEstimate?.serviceBaseRange || selectedService.priceRange}</strong>
                      </li>
                      <li>
                        <span>Fonctionnalites ajoutees</span>
                        <strong>{quoteEstimate?.featureCostLabel || 'Aucune option supplementaire'}</strong>
                      </li>
                      <li>
                        <span>Delai souhaite</span>
                        <strong>{quoteEstimate?.timelineLabel || 'Delai non precise'}</strong>
                      </li>
                      <li>
                        <span>Ajustement applique</span>
                        <strong>{quoteEstimate?.timelineImpact || 'Base standard sans majoration'}</strong>
                      </li>
                    </ul>

                    <div className="receipt-card__amount">{quoteEstimate?.formattedRange}</div>

                    <p className="marketing-note">
                      Plus le delai est urgent, plus l estimation augmente car il faut mobiliser
                      l equipe plus vite et prioriser le projet.
                    </p>

                    {quoteEstimate?.budgetInsight ? (
                      <p className="marketing-note">{quoteEstimate.budgetInsight}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="marketing-note">
                    Selectionnez un service pour afficher une estimation plus logique selon le
                    delai et les fonctionnalites.
                  </p>
                )}
              </article>
            </aside>

            <div className="marketing-form-card">
              <h2 className="marketing-form-card__title">Votre projet</h2>
              <p className="marketing-form-card__text">
                Remplissez les champs essentiels. Si vous n avez pas encore de compte, nous vous
                demanderons simplement de vous connecter ou de vous inscrire juste avant l envoi.
              </p>

              {draftNotice ? <div className="auth-note">{draftNotice}</div> : null}
              {submitError ? <div className="marketing-alert">{submitError}</div> : null}

              <form className="marketing-form" onSubmit={handleSubmit}>
                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="name">Nom complet *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={Boolean(authUser)}
                      className={`marketing-input ${errors.name ? 'is-error' : ''}`}
                      placeholder="Jean Dupont"
                    />
                    {authUser ? (
                      <div className="marketing-field__hint">
                        Ce nom vient directement du compte client connecte.
                      </div>
                    ) : null}
                    {errors.name ? <div className="marketing-field__error">{errors.name}</div> : null}
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="email">Email professionnel *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={Boolean(authUser)}
                      className={`marketing-input ${errors.email ? 'is-error' : ''}`}
                      placeholder="votre@email.com"
                    />
                    {authUser ? (
                      <div className="marketing-field__hint">
                        Cet email est verrouille sur celui utilise pour la connexion.
                      </div>
                    ) : null}
                    {errors.email ? <div className="marketing-field__error">{errors.email}</div> : null}
                  </div>
                </div>

                <div className="marketing-form__grid">
                  <PhoneField
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    disabled={Boolean(authUser)}
                  />

                  <div className="marketing-field">
                    <label htmlFor="company">Entreprise</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleChange}
                      disabled={Boolean(authUser)}
                      className="marketing-input"
                      placeholder="Nom de votre entreprise"
                    />
                    {authUser ? (
                      <div className="marketing-field__hint">
                        Cette information est reprise depuis votre profil client.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="marketing-field">
                  <label htmlFor="service">Service souhaite *</label>
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    className={`marketing-select ${errors.service ? 'is-error' : ''}`}
                  >
                    <option value="">Selectionnez un service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {service.priceRange}
                      </option>
                    ))}
                  </select>
                  {errors.service ? <div className="marketing-field__error">{errors.service}</div> : null}
                </div>

                <div className="marketing-field">
                  <label htmlFor="projectDescription">Description du projet *</label>
                  <textarea
                    id="projectDescription"
                    name="projectDescription"
                    value={formData.projectDescription}
                    onChange={handleChange}
                    className={`marketing-textarea ${errors.projectDescription ? 'is-error' : ''}`}
                    placeholder="Decrivez votre projet, votre contexte et le resultat attendu."
                  />
                  {errors.projectDescription ? (
                    <div className="marketing-field__error">{errors.projectDescription}</div>
                  ) : null}
                </div>

                <div className="marketing-form__grid">
                  <div className="marketing-field">
                    <label htmlFor="budget">Budget estime</label>
                    <select
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="marketing-select"
                    >
                      <option value="">Selectionnez une fourchette</option>
                      {budgetOptions.map((budget) => (
                        <option key={budget.value} value={budget.value}>
                          {budget.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="marketing-field">
                    <label htmlFor="timeline">Delai souhaite</label>
                    <select
                      id="timeline"
                      name="timeline"
                      value={formData.timeline}
                      onChange={handleChange}
                      className="marketing-select"
                    >
                      <option value="">Selectionnez un delai</option>
                      {timelineOptions.map((timeline) => (
                        <option key={timeline.value} value={timeline.value}>
                          {timeline.label}
                        </option>
                      ))}
                    </select>
                    <div className="marketing-field__hint">
                      Plus le delai est court, plus l estimation monte pour tenir la priorite.
                    </div>
                  </div>
                </div>

                <div className="marketing-field">
                  <label>Fonctionnalites souhaitees</label>
                  <div className="option-grid">
                    {availableFeatures.map((feature) => {
                      const isActive = formData.features.includes(feature);

                      return (
                        <label key={feature} className={`option-pill ${isActive ? 'is-active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => handleFeatureToggle(feature)}
                          />
                          <span className="option-pill__copy">
                            <strong>{feature}</strong>
                            <span>Ajoute une attente au cadrage initial.</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="marketing-button marketing-button--dark"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande de devis'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {authModalOpen ? (
        <div
          className="marketing-modal__overlay"
          role="presentation"
          onClick={() => setAuthModalOpen(false)}
        >
          <div
            className="marketing-modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="marketing-modal__header">
              <span className="marketing-modal__eyebrow">Compte requis</span>
              <h3 id="quote-auth-title" className="marketing-modal__title">
                Connectez-vous avant d envoyer le devis
              </h3>
              <p className="marketing-modal__text">
                Votre brouillon est garde ici. Il ne vous reste qu a vous connecter ou a creer un
                compte pour rattacher cette demande a votre espace client.
              </p>
              <button
                type="button"
                className="marketing-modal__close"
                aria-label="Fermer"
                onClick={() => setAuthModalOpen(false)}
              >
                x
              </button>
            </div>

            <div className="marketing-modal__body auth-modal__body">
              <div className="marketing-modal__grid">
                <div className="marketing-modal__item">
                  <span>Service prepare</span>
                  <strong>{selectedService?.name || 'A confirmer'}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Budget estime</span>
                  <strong>{selectedBudgetOption?.label || 'Non precise'}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Delai souhaite</span>
                  <strong>{selectedTimelineOption?.label || 'Non precise'}</strong>
                </div>
                <div className="marketing-modal__item">
                  <span>Etape suivante</span>
                  <strong>Connexion ou inscription, puis envoi du devis</strong>
                </div>
              </div>

              <div className="auth-modal__footer">
                <div className="auth-modal__status">
                  Vos informations resteront pre-remplies quand vous reviendrez sur cette page.
                </div>
                <div className="marketing-modal__actions">
                  <Link
                    to={`/login?next=${encodeURIComponent(QUOTE_NEXT_PATH)}`}
                    className="marketing-button marketing-button--dark"
                    onClick={persistQuoteDraft}
                  >
                    Se connecter
                  </Link>
                  <Link
                    to={`/register?next=${encodeURIComponent(QUOTE_NEXT_PATH)}`}
                    className="marketing-button marketing-button--accent"
                    onClick={persistQuoteDraft}
                  >
                    Creer un compte
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SiteFooter note="Une page devis plus ambitieuse visuellement, mais surtout plus simple a renseigner et a exploiter ensuite." />
    </div>
  );
};

export default Devis;
