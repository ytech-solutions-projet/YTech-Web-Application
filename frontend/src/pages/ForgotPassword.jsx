import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { fetchJson } from '../utils/http';
import '../styles/auth.css';

const initialFormData = {
  email: ''
};

const buildLocalResetUrl = (resetToken) => {
  if (!resetToken || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/reset-password?token=${encodeURIComponent(resetToken)}`;
};

const forgotPasswordBenefits = [
  'Envoi discret sans reveler si un compte existe',
  'Lien de reinitialisation a duree limitee',
  'Retour rapide vers votre espace client apres mise a jour'
];

const forgotPasswordCards = [
  {
    eyebrow: 'Securite',
    title: 'Un lien temporaire et dedie.',
    text: 'Le lien de reinitialisation est limite dans le temps pour reduire les risques d usage non souhaite.'
  },
  {
    eyebrow: 'Confidentialite',
    title: 'Reponse neutre cote interface.',
    text: 'La page confirme la demande sans exposer publiquement si un compte est lie a cet email.'
  },
  {
    eyebrow: 'Support',
    title: 'Un parcours simple a reprendre.',
    text: 'Une fois le mot de passe change, vous pourrez revenir sur la connexion sans etape inutile.'
  }
];

const ForgotPassword = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [devResetToken, setDevResetToken] = useState('');

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
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = "L'email n'est pas valide";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const { payload } = await fetchJson('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase()
        })
      });

      setDevResetToken(payload.resetToken || '');
      setDevResetUrl(payload.resetUrl || buildLocalResetUrl(payload.resetToken || ''));
      setSubmitSuccess(
        payload.message || 'Si cet email existe, un lien de reinitialisation sera envoye.'
      );
    } catch (error) {
      setSubmitError(error.message || 'Impossible de traiter votre demande pour le moment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketing-page auth-page">
      <PublicHero
        eyebrow="Mot de passe oublie"
        title="Recuperez l acces a votre espace client"
        description="Entrez votre email pour recevoir un lien de reinitialisation. Le message reste volontairement discret pour proteger vos acces."
        actions={[
          { to: '/login', label: 'Retour connexion', variant: 'primary' },
          { to: '/contact?intent=support', label: 'Besoin d aide', variant: 'secondary' }
        ]}
        highlights={['Lien temporaire', 'Message discret', 'Support YTECH']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Protection</span>
            <h2 className="hero-panel__title">Le parcours reste simple sans relacher la securite.</h2>
            <p className="hero-panel__text">
              Nous generons un lien de reinitialisation limite dans le temps et nous gardons une reponse neutre cote interface.
            </p>
            <ul className="hero-panel__list">
              {forgotPasswordBenefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </>
        }
      />

      <section className="marketing-section marketing-section--compact">
        <div className="container">
          <div className="card-grid card-grid--three">
            {forgotPasswordCards.map((card) => (
              <article key={card.title} className="panel-card">
                <span className="panel-card__eyebrow">{card.eyebrow}</span>
                <h2 className="panel-card__title">{card.title}</h2>
                <p className="panel-card__text">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-form-shell auth-form-shell">
            <aside className="marketing-side-card auth-side-card">
              <span className="hero-panel__eyebrow">Avant de valider</span>
              <h2 className="hero-panel__title">Utilisez l email lie a votre compte YTECH.</h2>
              <p className="hero-panel__text">
                Si cet email correspond a un compte actif, vous recevrez un lien pour definir un nouveau mot de passe.
              </p>
              <ul className="stack-list">
                <li>Le lien expire rapidement pour limiter son exposition.</li>
                <li>La reponse reste la meme meme si aucun compte n est trouve.</li>
                <li>Si besoin, YTECH peut aussi vous orienter via le support.</li>
              </ul>
              <div className="auth-quick-links">
                <Link className="text-link" to="/login">
                  Retour connexion
                </Link>
                <Link className="text-link" to="/contact?intent=support">
                  Contacter YTECH
                </Link>
              </div>
            </aside>

            <div className="marketing-form-card auth-form-card">
              <h2 className="marketing-form-card__title">Recevoir un lien de reinitialisation</h2>
              <p className="marketing-form-card__text">
                Saisissez votre email. Si un compte existe, nous enverrons le lien sur cette boite.
              </p>

              {submitError ? <div className="marketing-alert">{submitError}</div> : null}
              {submitSuccess ? <div className="marketing-alert">{submitSuccess}</div> : null}
              {devResetUrl ? (
                <div className="auth-dev-panel">
                  <p>
                    Mode local: aucun email n est envoye ici. Ouvrez directement{' '}
                    <a href={devResetUrl}>le lien de reinitialisation</a>.
                  </p>
                  {devResetToken ? <code>{devResetToken}</code> : null}
                </div>
              ) : null}

              <form className="marketing-form auth-form" onSubmit={handleSubmit}>
                <div className="marketing-field">
                  <label htmlFor="email">Email professionnel</label>
                  <input
                    id="email"
                    className={`marketing-input ${errors.email ? 'is-error' : ''}`}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                  />
                  <div className="marketing-field__hint">
                    Verifiez aussi vos spams si vous ne voyez pas le message arriver.
                  </div>
                  {errors.email ? <div className="marketing-field__error">{errors.email}</div> : null}
                </div>

                <button
                  type="submit"
                  className="marketing-button marketing-button--dark auth-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>

              <div className="auth-form-footer">
                <p>
                  Vous avez retrouve votre mot de passe ? <Link to="/login">Se connecter</Link>
                </p>
                <p>
                  Besoin d aide ? <Link to="/contact?intent=support">Nous contacter</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter note="Reinitialisation securisee du mot de passe et reprise rapide de votre espace client." />
    </div>
  );
};

export default ForgotPassword;
