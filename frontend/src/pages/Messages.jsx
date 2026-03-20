import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/app-shell.css';
import { formatDate, formatTime, getInitials } from '../utils/helpers';
import { readAuthUser } from '../utils/storage';
import { listMessages, sendMessage } from '../utils/businessApi';

const Messages = () => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let intervalId;
    let isMounted = true;
    const authUser = readAuthUser();

    if (!authUser) {
      navigate('/login');
      return undefined;
    }

    setUser(authUser);

    const loadMessages = async () => {
      try {
        const nextMessages = await listMessages();
        if (!isMounted) {
          return;
        }

        setMessages(nextMessages.sort((first, second) => new Date(first.timestamp) - new Date(second.timestamp)));
        setIsConnected(true);
      } catch (error) {
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    loadMessages();
    intervalId = window.setInterval(loadMessages, 15000);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!newMessage.trim() || !user) {
      return;
    }

    try {
      setSubmitError('');
      const message = await sendMessage({
        content: newMessage.trim()
      });

      setMessages((prev) =>
        [...prev, message].sort((first, second) => new Date(first.timestamp) - new Date(second.timestamp))
      );
      setNewMessage('');
      setIsConnected(true);
    } catch (error) {
      setSubmitError(error.message || "Impossible d'envoyer le message");
      setIsConnected(false);
    }
  };

  const groupMessagesByDate = (items) => {
    return items.reduce((groups, message) => {
      const dateKey = new Date(message.timestamp).toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(message);
      return groups;
    }, {});
  };

  const formatGroupDate = (dateKey) => {
    const date = new Date(dateKey);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }

    return formatDate(date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          <div className="workspace-empty">
            <div className="workspace-empty__icon">...</div>
            <div className="workspace-empty__title">Chargement de la messagerie</div>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="workspace-page">
      <div className="workspace-shell">
        <section className="workspace-hero">
          <div className="workspace-hero__content">
            <div className="workspace-hero__copy">
              <span className="workspace-hero__eyebrow">Messagerie client</span>
              <h1 className="workspace-hero__title">Echangez avec l'equipe YTECH</h1>
              <p className="workspace-hero__text">
                Une conversation unique, plus propre et plus facile a suivre pour toutes vos
                questions, retours et points projet.
              </p>
            </div>
            <div className="workspace-hero__meta">
              <span className="workspace-hero__badge">{getInitials(user.name) || 'YT'}</span>
              <span className="workspace-pill is-success">
                {isConnected ? 'Support en ligne' : 'Support hors ligne'}
              </span>
            </div>
          </div>
        </section>

        <section className="workspace-chat" style={{ gridTemplateColumns: '1fr' }}>
          <div className="workspace-chat__main">
            <div className="workspace-chat__main-header">
              <div className="workspace-chat__contact">
                <span className="workspace-chat__avatar">SUP</span>
                <div className="workspace-chat__contact-copy">
                  <strong>Support YTECH</strong>
                  <span className={`workspace-pill ${isConnected ? 'is-success' : 'is-warning'}`}>
                    {isConnected ? 'Disponible' : 'Indisponible'}
                  </span>
                </div>
              </div>
              <span className="workspace-note">{messages.length} message(s) dans cette conversation</span>
            </div>

            <div className="workspace-chat__messages">
              {messages.length === 0 ? (
                <div className="workspace-empty">
                  <div className="workspace-empty__icon">MSG</div>
                  <div className="workspace-empty__title">Bienvenue dans votre messagerie</div>
                  <div className="workspace-empty__text">
                    Envoyez votre premier message pour ouvrir la conversation avec notre equipe.
                  </div>
                </div>
              ) : (
                Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
                  <div key={dateKey}>
                    <div className="workspace-chat__date">
                      <span>{formatGroupDate(dateKey)}</span>
                    </div>

                    {dateMessages.map((message) => {
                      const isSelf = message.senderId === user.email;

                      return (
                        <div
                          key={message.id}
                          className={`workspace-chat__row ${isSelf ? 'is-self' : 'is-other'}`}
                        >
                          <div className="workspace-chat__bubble-wrap">
                            {!isSelf && (
                              <div className="workspace-chat__sender">{message.senderName || 'YTECH'}</div>
                            )}
                            <div className="workspace-chat__bubble">{message.content}</div>
                            <div className="workspace-chat__meta">
                              <span>{formatTime(message.timestamp)}</span>
                              {isSelf && <span>{message.status === 'sent' ? 'Envoye' : 'Lu'}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="workspace-chat__composer" onSubmit={handleSendMessage}>
              {submitError ? <div className="workspace-note">{submitError}</div> : null}
              <input
                className="workspace-input"
                type="text"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Tapez votre message..."
              />
              <button className="workspace-send-btn" type="submit" disabled={!newMessage.trim()}>
                Envoyer
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Messages;
