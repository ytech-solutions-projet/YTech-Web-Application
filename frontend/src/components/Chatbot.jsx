import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chatbot.css';
import {
  chatbotQuickActions,
  getWelcomeReply,
  resolveChatbotReply
} from '../utils/chatbotEngine';

const createMessage = (text, sender, metadata = {}) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  text,
  sender,
  timestamp: new Date().toISOString(),
  ...metadata
});

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const welcomeReply = getWelcomeReply();

    setMessages([
      createMessage(
        welcomeReply.text,
        'bot',
        {
          topic: welcomeReply.topic,
          actions: welcomeReply.actions || []
        }
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
    const conversationHistory = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const reply = resolveChatbotReply(trimmedMessage, conversationHistory);
      const botResponse = createMessage(reply.text, 'bot', {
        topic: reply.topic,
        actions: reply.actions || []
      });
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, Math.min(1500, Math.max(520, trimmedMessage.length * 18)));
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

  const handleMessageAction = (action) => {
    if (!action) {
      return;
    }

    if (action.type === 'route' && action.route) {
      navigate(action.route);
      setIsOpen(false);
      return;
    }
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
              <h2 className="chatbot-header__title">Questions sur votre projet et le site</h2>
              <p className="chatbot-header__text">
                Services, devis, paiement, suivi, messagerie et contact.
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
                  {message.sender === 'bot' && Array.isArray(message.actions) && message.actions.length > 0 ? (
                    <div className="chatbot-bubble__actions">
                      {message.actions.map((action) => (
                        <button
                          key={`${message.id}-${action.label}`}
                          type="button"
                          className="chatbot-bubble__action"
                          onClick={() => handleMessageAction(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
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
              {chatbotQuickActions.map((action) => (
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
