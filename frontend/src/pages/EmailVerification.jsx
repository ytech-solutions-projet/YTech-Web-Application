import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import PublicHero from '../components/PublicHero';
import SiteFooter from '../components/SiteFooter';
import { fetchJson } from '../utils/http';
import { resolveSafeNextPath } from '../utils/navigation';
import '../styles/auth.css';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(`${value ?? ''}`.trim());

const EmailVerification = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const initialEmail = searchParams.get('email') || '';
  const nextPath = resolveSafeNextPath(searchParams.get('next'), '/dashboard');
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [verificationState, setVerificationState] = useState(token ? 'loading' : 'idle');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState(initialEmail);
  const [resendError, setResendError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [devVerificationUrl, setDevVerificationUrl] = useState(
    location.state?.devVerificationUrl || ''
  );
  const [devVerificationToken, setDevVerificationToken] = useState(
    location.state?.devVerificationToken || ''
  );

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let isMounted = true;

    const verifyEmail = async () => {
      setVerificationState('loading');
      setVerificationMessage('');

      try {
        const { payload } = await fetchJson(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);

        if (!isMounted) {
          return;
        }

        setVerificationState('success');
        setVerificationMessage(payload.message || 'Email verifie. Vous pouvez maintenant vous connecter.');
        setVerifiedEmail(payload.email || initialEmail);
        setResendEmail(payload.email || initialEmail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setVerificationState('error');
        setVerificationMessage(error.message || 'Le lien de verification est invalide ou expire.');
      }
    };

    verifyEmail();

    return () => {
      isMounted = false;
    };
  }, [initialEmail, token]);

  const handleResendSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = resendEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setResendError('Renseignez une adresse email valide.');
      setResendMessage('');
      return;
    }

    setIsResending(true);
    setResendError('');
    setResendMessage('');

    try {
      const { payload } = await fetchJson('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: normalizedEmail
        })
      });

      setResendEmail(normalizedEmail);
      setVerifiedEmail(normalizedEmail);
      setDevVerificationUrl(payload.verificationUrl || '');
      setDevVerificationToken(payload.verificationToken || '');
      setResendMessage(
        payload.message || 'Si le compte existe et n est pas encore verifie, un nouveau lien a ete envoye.'
      );
    } catch (error) {
      setResendError(error.message || 'Impossible de renvoyer le lien pour le moment.');
    } finally {
      setIsResending(false);
    }
  };

  const loginParams = new URLSearchParams();
  if (verifiedEmail) {
    loginParams.set('email', verifiedEmail);
    loginParams.set('verified', '1');
  }
  loginParams.set('next', nextPath);
  const loginPath = `/login?${loginParams.toString()}`;
  const showResendForm = verificationState !== 'success';

  return (
    <div className="marketing-page auth-page">
      <PublicHero
        eyebrow="Verification email"
        title={
          token
            ? 'Nous verifions votre adresse email.'
            : 'Verifiez votre email avant de vous connecter.'
        }
        description={
          token
            ? 'Le lien de verification active la connexion et confirme que le compte est bien rattache a une vraie adresse.'
            : 'Une fois votre compte cree, confirmez votre adresse email pour activer la connexion et limiter les inscriptions non souhaitees.'
        }
        actions={[
          { to: loginPath, label: 'Connexion', variant: 'primary' },
          { to: '/contact?intent=support', label: "Besoin d'aide", variant: 'secondary' }
        ]}
        highlights={['Email confirme', 'Connexion debloquee', 'Renvoi du lien']}
        aside={
          <>
            <span className="hero-panel__eyebrow">Pourquoi cette etape ?</span>
            <h2 className="hero-panel__title">Un compte YTECH doit d abord confirmer son email.</h2>
            <p className="hero-panel__text">
              Cela nous aide a filtrer les inscriptions douteuses et a travailler avec des contacts valides.
            </p>
            <ul className="hero-panel__list">
              <li>Le lien active la connexion.</li>
              <li>Vous pouvez demander un nouveau lien a tout moment.</li>
              <li>L adresse de recu et de contact reste ainsi plus fiable.</li>
            </ul>
          </>
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-form-shell auth-form-shell">
            <aside className="marketing-side-card auth-side-card">
              <span className="hero-panel__eyebrow">Etapes</span>
              <h2 className="hero-panel__title">Le parcours reste simple.</h2>
              <p className="hero-panel__text">
                Ouvrez l email de verification, cliquez sur le lien puis revenez a la connexion.
              </p>
              <ul className="stack-list">
                <li>Verification demandee apres inscription.</li>
                <li>Lien renvoyable si besoin.</li>
                <li>Connexion disponible uniquement apres confirmation.</li>
              </ul>
            </aside>

            <div className="marketing-form-card auth-form-card">
              <h2 className="marketing-form-card__title">Activation du compte</h2>
              <p className="marketing-form-card__text">
                {token
                  ? 'Nous traitons maintenant votre lien de verification.'
                  : 'Consultez votre boite mail puis utilisez le formulaire ci-dessous si vous avez besoin d un nouveau lien.'}
              </p>

              {verificationState === 'loading' ? (
                <div className="marketing-alert">Verification en cours...</div>
              ) : null}

              {verificationMessage ? <div className="marketing-alert">{verificationMessage}</div> : null}

              {devVerificationUrl ? (
                <div className="auth-dev-panel">
                  <p>
                    Mode local: aucun email n est envoye ici. Ouvrez directement{' '}
                    <a href={devVerificationUrl}>le lien de verification</a>.
                  </p>
                  {devVerificationToken ? <code>{devVerificationToken}</code> : null}
                </div>
              ) : null}

              {verificationState === 'success' ? (
                <div className="auth-form-footer">
                  <p>
                    Votre email est pret. <Link to={loginPath}>Se connecter maintenant</Link>
                  </p>
                  <p>
                    Besoin de revenir au site ? <Link to="/">Retour a l accueil</Link>
                  </p>
                </div>
              ) : null}

              {showResendForm ? (
                <form className="marketing-form auth-form" onSubmit={handleResendSubmit}>
                  <div className="marketing-field">
                    <label htmlFor="verification-email">Email du compte</label>
                    <input
                      id="verification-email"
                      className={`marketing-input ${resendError ? 'is-error' : ''}`}
                      type="email"
                      value={resendEmail}
                      onChange={(event) => {
                        setResendEmail(event.target.value);
                        if (resendError) {
                          setResendError('');
                        }
                      }}
                      placeholder="votre@email.com"
                    />
                    <div className="marketing-field__hint">
                      Utilisez la meme adresse que lors de l inscription.
                    </div>
                    {resendError ? <div className="marketing-field__error">{resendError}</div> : null}
                  </div>

                  {resendMessage ? <div className="marketing-alert">{resendMessage}</div> : null}

                  <button
                    type="submit"
                    className="marketing-button marketing-button--dark auth-submit"
                    disabled={isResending}
                  >
                    {isResending ? 'Envoi en cours...' : 'Renvoyer le lien'}
                  </button>
                </form>
              ) : null}

              <div className="auth-form-footer">
                <p>
                  Vous avez deja verifie votre email ? <Link to={loginPath}>Aller a la connexion</Link>
                </p>
                <p>
                  Besoin d aide ? <Link to="/contact?intent=support">Contacter YTECH</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter note="Activation du compte via verification email avant connexion." />
    </div>
  );
};

export default EmailVerification;
