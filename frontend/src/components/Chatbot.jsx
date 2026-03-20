import React, { useEffect, useRef, useState } from 'react';
import './Chatbot.css';

const quickActions = [
  { label: 'Demander un devis', prompt: 'Je voudrais demander un devis' },
  { label: 'Voir les tarifs', prompt: 'Quels sont vos tarifs ?' },
  { label: 'Parler delai', prompt: 'Comment le delai impacte le prix ?' },
  { label: 'Nous contacter', prompt: 'Comment vous contacter ?' }
];

const createMessage = (text, sender) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  text,
  sender,
  timestamp: new Date().toISOString()
});

const includesOneOf = (message, keywords) => keywords.some((keyword) => message.includes(keyword));

const generateBotResponse = (userMessage) => {
  const message = userMessage.toLowerCase();

  if (includesOneOf(message, ['bonjour', 'salut', 'hello', 'bonsoir'])) {
    return 'Bonjour. Je peux vous aider sur les services, les tarifs, le devis ou les delais de realisation.';
  }

  if (includesOneOf(message, ['prix', 'tarif', 'cout', 'budget'])) {
    return [
      'Voici quelques reperes de prix :',
      '',
      '- Site vitrine : 5 000 - 15 000 DH',
      '- E-commerce : 15 000 - 50 000 DH',
      '- Application web : 20 000 - 80 000 DH',
      '- Application mobile : 25 000 - 100 000 DH',
      '',
      'Le delai joue aussi sur le prix :',
      '- Urgent : +35%',
      '- Rapide : +18%',
      '- Normal : base standard',
      '- Flexible : -8%',
      '',
      'Pour une estimation plus logique, utilisez la page devis.'
    ].join('\n');
  }

  if (includesOneOf(message, ['devis', 'devi', 'estimation'])) {
    return [
      'Pour obtenir un devis plus precis, le plus utile est de renseigner :',
      '',
      '- le type de service',
      '- les fonctionnalites souhaitees',
      '- le delai vise',
      '',
      'Plus le delai est court, plus le prix monte car le projet doit etre priorise.',
      'La page devis du site affiche maintenant une estimation initiale avant envoi.'
    ].join('\n');
  }

  if (includesOneOf(message, ['contact', 'telephone', 'email', 'appeler'])) {
    return [
      'Vous pouvez contacter YTECH ici :',
      '',
      '- Email : contact@ytech.ma',
      '- Telephone : +212 6 00 00 00 00',
      '- Ville : Casablanca, Maroc',
      '',
      'Vous pouvez aussi utiliser la page contact ou demander directement un devis.'
    ].join('\n');
  }

  if (includesOneOf(message, ['service', 'offre', 'prestation'])) {
    return [
      'Nous proposons principalement :',
      '',
      '- Sites vitrines',
      '- Sites e-commerce',
      '- Applications web',
      '- Applications mobiles',
      '- SEO et marketing',
      '- Maintenance et support',
      '',
      'Si vous voulez, dites-moi le type de projet et je vous oriente.'
    ].join('\n');
  }

  if (includesOneOf(message, ['temps', 'delai', 'duree', 'urgent', 'rapide'])) {
    return [
      'Les delais varient selon le type de projet :',
      '',
      '- Site vitrine : 2 a 4 semaines',
      '- E-commerce : 4 a 8 semaines',
      '- Application web : 6 a 10 semaines',
      '- Application mobile : 8 a 12 semaines',
      '',
      'Si le projet est urgent, le budget augmente car il faut mobiliser l equipe plus vite.'
    ].join('\n');
  }

  if (includesOneOf(message, ['portfolio', 'realisation', 'projet', 'exemple'])) {
    return [
      'YTECH peut intervenir sur plusieurs formats de projets :',
      '',
      '- presentation d activite',
      '- vente en ligne',
      '- espace client',
      '- outil interne',
      '',
      'Vous pouvez voir des exemples sur la page portfolio du site.'
    ].join('\n');
  }

  if (includesOneOf(message, ['maroc', 'casablanca', 'local'])) {
    return [
      'YTECH est basee a Casablanca, au Maroc.',
      '',
      'Le site et les parcours ont ete penses pour des entreprises et structures locales, avec un ton simple et un accompagnement direct.'
    ].join('\n');
  }

  if (includesOneOf(message, ['merci', 'ok', 'parfait'])) {
    return 'Avec plaisir. Si vous voulez, je peux aussi vous orienter vers la page la plus adaptee entre services, contact et devis.';
  }

  return [
    'Je peux surtout vous aider sur ces sujets :',
    '',
    '- services proposes',
    '- estimation de prix',
    '- impact du delai sur le devis',
    '- contact et orientation',
    '',
    'Vous pouvez aussi cliquer sur une action rapide juste en dessous.'
  ].join('\n');
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setMessages([
      createMessage(
        'Bonjour. Je suis l assistant YTECH. Je peux vous aider sur les services, les devis, les prix et les delais.',
        'bot'
      )
    ]);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  const submitMessage = (rawMessage) => {
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage || isTyping) {
      return;
    }

    const userMessage = createMessage(trimmedMessage, 'user');
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    timeoutRef.current = setTimeout(() => {
      const botResponse = createMessage(generateBotResponse(trimmedMessage), 'bot');
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 900);
  };

  const handleSendMessage = () => {
    submitMessage(inputMessage);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSendMessage();
  };

  const handleQuickAction = (prompt) => {
    setIsOpen(true);
    submitMessage(prompt);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className="chatbot-container">
      {!isOpen ? (
        <button
          type="button"
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir l assistant YTECH"
        >
          <span className="chatbot-toggle__badge">YT</span>
          <span className="chatbot-toggle__label">Assistant</span>
        </button>
      ) : null}

      {isOpen ? (
        <section className="chatbot-window" role="dialog" aria-label="Assistant YTECH">
          <header className="chatbot-header">
            <div className="chatbot-header__copy">
              <span className="chatbot-header__eyebrow">Assistant YTECH</span>
              <h2 className="chatbot-header__title">Questions rapides sur votre projet</h2>
              <p className="chatbot-header__text">
                Services, devis, delais et premiers reperes de budget.
              </p>
            </div>

            <button
              type="button"
              className="chatbot-header__close"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer l assistant YTECH"
            >
              x
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message chatbot-message--${message.sender}`}
              >
                <div className="chatbot-bubble">
                  <div className="chatbot-bubble__text">{message.text}</div>
                  <div className="chatbot-bubble__time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}

            {isTyping ? (
              <div className="chatbot-message chatbot-message--bot">
                <div className="chatbot-bubble chatbot-bubble--typing">
                  <div className="chatbot-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-actions">
            <div className="chatbot-actions__scroller">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="chatbot-action"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tapez votre message..."
              className="chatbot-input__field"
            />
            <button
              type="submit"
              className="chatbot-input__send"
              disabled={!inputMessage.trim() || isTyping}
            >
              Envoyer
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
};

export default Chatbot;
