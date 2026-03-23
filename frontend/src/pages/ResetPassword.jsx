import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { fetchJson } from '../utils/http';
import '../styles/auth.css';

const initialFormData = {
  newPassword: '',
  confirmPassword: ''
};

const passwordRequirements = [
  '12 caracteres minimum',
  'Une lettre minuscule et une lettre majuscule',
  'Au moins un chiffre et un caractere special'
];

const resetPasswordCards = [
  {
    eyebrow: 'Validation',
    title: 'Verification du lien avant affichage.',
    text: 'Le token est controle avant la soumission finale pour eviter un parcours inutile.'
  },
  {
    eyebrow: 'Securite',
    title: 'Sessions precedentes invalidees.',
    text: 'Une fois le mot de passe change, les anciennes sessions client sont fermees proprement.'
  },
  {
    eyebrow: 'Retour',
    title: 'Reconnexion simple apres confirmation.',
    text: 'Une fois la mise a jour terminee, vous pouvez revenir directement sur la connexion.'
  }
];

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [tokenStatus, setTokenStatus] = useState(token ? 'checking' : 'invalid');
  const [tokenError, setTokenError] = useState(token ? '' : 'Lien de reinitialisation incomplet.');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        return;
      }

      setTokenStatus('checking');
      setTokenError('');

      try {
        await fetchJson(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`);
        if (isMounted) {
          setTokenStatus('valid');
        }
      } catch (error) {
        if (isMounted) {
          setTokenStatus('invalid');
          setTokenError(error.message || 'Ce lien de reinitialisation n est plus valide.');
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

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

    if (!formData.newPassword) {
      nextErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else {
      const meetsLength = formData.newPassword.length >= 12;
      const hasLower = /[a-z]/.test(formData.newPassword);
      const hasUpper = /[A-Z]/.test(formData.newPassword);
      const hasDigit = /\d/.test(formData.newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(formData.newPassword);

      if (!(meetsLength && hasLower && hasUpper && hasDigit && hasSpecial)) {
        nextErrors.newPassword = 'Le mot de passe ne respecte pas les exigences de securite';
      }
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Confirmez le nouveau mot de passe';
    } else if (formData.confirmPassword !== formData.newPassword) {
      nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (tokenStatus !== 'valid' || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const { payload } = await fetchJson('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword
        })
      });

      setSubmitSuccess(payload.message || 'Mot de passe reinitialise avec succes');
      setTimeout(() => navigate('/login'), 1800);
    } catch (error) {
      setSubmitError(error.message || 'Impossible de reinitialiser le mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketing-page auth-page">
      <PublicHero
        eyebrow="Nouveau mot de passe"
        title="Definissez un acces a jour pour votre espace YTECH"
        description="Le lien de reinitialisation est verifie avant validation. Une fois le mot de passe mis a jour, vos anciennes sessions sont fermees."
        actions={[
          { to: '/login', label: 'Retour connexion', variant: 'primary' },
          { to: '/forgot-password', label: 'Demander un autre lien', variant: 'secondary' }
        ]}
        highlights={['Lien verifie', 'Sessions fermees', 'Retour rapide']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Exigences</span>
            <h2 className="hero-panel__title">Choisissez un mot de passe robuste et unique.</h2>
            <p className="hero-panel__text">
              Nous recommandons un mot de passe que vous n utilisez pas ailleurs afin de proteger votre espace client.
            </p>
            <ul className="hero-panel__list">
              {passwordRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </>
        }
      />

      <section className="marketing-section marketing-section--compact">
        <div className="container">
          <div className="card-grid card-grid--three">
            {resetPasswordCards.map((card) => (
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
              <span className="hero-panel__eyebrow">Etat du lien</span>
              <h2 className="hero-panel__title">Le lien de reinitialisation est controle avant la suite.</h2>
              <p className="hero-panel__text">
                Si le lien est expire ou deja utilise, il faudra simplement demander un nouveau message.
              </p>
              <ul className="stack-list">
                <li>Verification immediate du token.</li>
                <li>Mot de passe renforce avant validation.</li>
                <li>Retour connexion disponible a la fin du parcours.</li>
              </ul>
              <div className="auth-quick-links">
                <Link className="text-link" to="/forgot-password">
                  Demander un nouveau lien
                </Link>
                <Link className="text-link" to="/login">
                  Retour connexion
                </Link>
              </div>
            </aside>

            <div className="marketing-form-card auth-form-card">
              <h2 className="marketing-form-card__title">Reinitialiser le mot de passe</h2>
              <p className="marketing-form-card__text">
                Definissez un nouveau mot de passe pour retrouver votre acces au dashboard client.
              </p>

              {tokenStatus === 'checking' ? (
                <div className="marketing-alert">Verification du lien en cours...</div>
              ) : null}
              {tokenError ? <div className="marketing-alert">{tokenError}</div> : null}
              {submitError ? <div className="marketing-alert">{submitError}</div> : null}
              {submitSuccess ? <div className="marketing-alert">{submitSuccess}</div> : null}

              <form className="marketing-form auth-form" onSubmit={handleSubmit}>
                <div className="marketing-field">
                  <label htmlFor="newPassword">Nouveau mot de passe</label>
                  <input
                    id="newPassword"
                    className={`marketing-input ${errors.newPassword ? 'is-error' : ''}`}
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Choisissez un nouveau mot de passe"
                    disabled={tokenStatus !== 'valid'}
                  />
                  <div className="marketing-field__hint">
                    12 caracteres minimum avec majuscule, minuscule, chiffre et caractere special.
                  </div>
                  {errors.newPassword ? (
                    <div className="marketing-field__error">{errors.newPassword}</div>
                  ) : null}
                </div>

                <div className="marketing-field">
                  <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                  <input
                    id="confirmPassword"
                    className={`marketing-input ${errors.confirmPassword ? 'is-error' : ''}`}
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirmez votre nouveau mot de passe"
                    disabled={tokenStatus !== 'valid'}
                  />
                  {errors.confirmPassword ? (
                    <div className="marketing-field__error">{errors.confirmPassword}</div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="marketing-button marketing-button--dark auth-submit"
                  disabled={isSubmitting || tokenStatus !== 'valid'}
                >
                  {isSubmitting ? 'Mise a jour en cours...' : 'Mettre a jour le mot de passe'}
                </button>
              </form>

              <div className="auth-form-footer">
                <p>
                  Besoin d un nouveau lien ? <Link to="/forgot-password">Refaire la demande</Link>
                </p>
                <p>
                  Retour direct a la connexion ? <Link to="/login">Se connecter</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter note="Choix d un nouveau mot de passe avec verification du lien et fermeture des anciennes sessions." />
    </div>
  );
};

export default ResetPassword;
