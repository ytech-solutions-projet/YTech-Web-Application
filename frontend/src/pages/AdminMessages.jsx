import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/app-shell.css';
import { formatDate, formatTime, getInitials } from '../utils/helpers';
import { readAuthUser } from '../utils/storage';
import {
  listContactRequests,
  listMessages,
  listQuotes,
  sendMessage
} from '../utils/businessApi';

const getContactRequestLabel = (request = {}) => {
  if (typeof request.requestLabel === 'string' && request.requestLabel.trim()) {
    return request.requestLabel.trim();
  }

  return request.requestCategory === 'quote_help' ? 'Aide devis' : "Besoin d'aide";
};

const buildCombinedMessages = (directMessages = [], quotes = [], contactRequests = []) => {
  const normalizedQuotes = quotes.map((quote) => ({
    ...quote,
    type: 'quote_request',
    senderId: quote.senderId || quote.email,
    senderName: quote.senderName || quote.name,
    recipientId: 'admin',
    recipientName: 'Admin YTECH'
  }));

  const normalizedContacts = contactRequests.map((request) => ({
    ...request,
    type: 'contact_request',
    contactCategory: request.requestCategory || 'support',
    contactLabel: getContactRequestLabel(request),
    senderId: request.email,
    senderName: request.name,
    recipientId: 'admin',
    recipientName: 'Admin YTECH',
    content: `Type de demande: ${getContactRequestLabel(request)}
Nom: ${request.name}
Email: ${request.email}
Telephone: ${request.phone || 'Non specifie'}
Entreprise: ${request.company || 'Non specifiee'}
Service: ${request.service || 'Non specifie'}
Budget: ${request.budget || 'Non specifie'}
Delai: ${request.timeline || 'Non specifie'}

Description:
${request.projectDescription || ''}`,
    timestamp: request.timestamp,
    status: request.status || 'pending'
  }));

  return [...directMessages, ...normalizedQuotes, ...normalizedContacts].sort(
    (first, second) => new Date(first.timestamp) - new Date(second.timestamp)
  );
};

const AdminMessages = () => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
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

    if (authUser.role !== 'admin') {
      navigate('/dashboard');
      return undefined;
    }

    setUser(authUser);

    const loadData = async () => {
      try {
        const [directMessages, quotes, contactRequests] = await Promise.all([
          listMessages(),
          listQuotes(),
          listContactRequests()
        ]);

        if (!isMounted) {
          return;
        }

        const combinedMessages = buildCombinedMessages(directMessages, quotes, contactRequests);
        setMessages(combinedMessages);
        setIsConnected(true);
      } catch (error) {
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    loadData();
    intervalId = window.setInterval(loadData, 15000);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [navigate]);

  useEffect(() => {
    const conversationMap = {};

    messages.forEach((message) => {
      const clientId = message.senderId === 'admin' ? message.recipientId : message.senderId;
      const clientName = message.senderId === 'admin' ? message.recipientName : message.senderName;

      if (!clientId || clientId === 'admin') {
        return;
      }

      if (!conversationMap[clientId]) {
        conversationMap[clientId] = {
          id: clientId,
          name: clientName,
          lastMessage: message,
          isContactRequest: message.type === 'contact_request',
          isQuoteRequest: message.type === 'quote_request',
          contactLabel: message.type === 'contact_request' ? message.contactLabel : ''
        };
      }

      if (new Date(message.timestamp) > new Date(conversationMap[clientId].lastMessage.timestamp)) {
        conversationMap[clientId].lastMessage = message;
      }

      if (message.type === 'contact_request') {
        conversationMap[clientId].isContactRequest = true;
        conversationMap[clientId].contactLabel = message.contactLabel || getContactRequestLabel(message);
      }

      if (message.type === 'quote_request') {
        conversationMap[clientId].isQuoteRequest = true;
      }
    });

    const nextConversations = Object.values(conversationMap).sort(
      (first, second) => new Date(second.lastMessage.timestamp) - new Date(first.lastMessage.timestamp)
    );

    setConversations(nextConversations);

    if (!selectedConversationId && nextConversations[0]) {
      setSelectedConversationId(nextConversations[0].id);
    } else if (
      selectedConversationId &&
      !nextConversations.some((conversation) => conversation.id === selectedConversationId)
    ) {
      setSelectedConversationId(nextConversations[0]?.id || null);
    }
  }, [messages, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const currentMessages = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return messages.filter(
      (message) =>
        (message.senderId === selectedConversation.id && message.recipientId === 'admin') ||
        (message.senderId === 'admin' && message.recipientId === selectedConversation.id)
    );
  }, [messages, selectedConversation]);

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

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!newMessage.trim() || !selectedConversation) {
      return;
    }

    try {
      setSubmitError('');
      const message = await sendMessage({
        recipientId: selectedConversation.id,
        recipientName: selectedConversation.name,
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

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-shell">
          <div className="workspace-empty">
            <div className="workspace-empty__icon">...</div>
            <div className="workspace-empty__title">Chargement de l'espace admin</div>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(currentMessages);

  return (
    <div className="workspace-page">
      <div className="workspace-shell">
        <section className="workspace-hero">
          <div className="workspace-hero__content">
            <div className="workspace-hero__copy">
              <span className="workspace-hero__eyebrow">Panneau admin</span>
              <h1 className="workspace-hero__title">Messagerie et demandes entrantes</h1>
              <p className="workspace-hero__text">
                Centralisez ici les conversations, les demandes de contact et les demandes de
                devis dans une interface plus nette et plus facile a traiter.
              </p>
            </div>
            <div className="workspace-hero__meta">
              <span className="workspace-hero__badge">{getInitials(user.name) || 'AD'}</span>
              <span className={`workspace-pill ${isConnected ? 'is-success' : 'is-warning'}`}>
                {isConnected ? 'Connecte' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </section>

        <section className="workspace-chat">
          <aside className="workspace-chat__sidebar">
            <div className="workspace-chat__header">
              <div>
                <h2 className="workspace-section-title">Conversations</h2>
                <p className="workspace-section-copy">{conversations.length} fil(s) disponibles</p>
              </div>
              <span className={`workspace-pill ${isConnected ? 'is-success' : 'is-warning'}`}>
                {isConnected ? 'Serveur synchro' : 'Hors ligne'}
              </span>
            </div>

            <div className="workspace-chat__list">
              {conversations.length === 0 ? (
                <div className="workspace-empty">
                  <div className="workspace-empty__icon">MSG</div>
                  <div className="workspace-empty__title">Aucune conversation</div>
                  <div className="workspace-empty__text">
                    Les nouveaux messages et demandes apparaitront ici.
                  </div>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={[
                      'workspace-chat__conversation',
                      selectedConversationId === conversation.id ? 'active' : '',
                      conversation.isContactRequest || conversation.isQuoteRequest ? 'is-priority' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    aria-pressed={selectedConversationId === conversation.id}
                  >
                    <div className="workspace-chat__conversation-top">
                      <div className="workspace-chat__conversation-name">{conversation.name}</div>
                      <div className="workspace-chat__conversation-time">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </div>
                    </div>
                    <div className="workspace-chat__conversation-preview">
                      {conversation.isContactRequest
                        ? conversation.contactLabel || "Besoin d'aide"
                        : conversation.isQuoteRequest
                          ? 'Demande de devis'
                          : conversation.lastMessage.content}
                    </div>
                    <div>
                      {conversation.isContactRequest ? (
                        <span className="workspace-pill is-warning">
                          {conversation.contactLabel || "Besoin d'aide"}
                        </span>
                      ) : conversation.isQuoteRequest ? (
                        <span className="workspace-pill is-info">Devis</span>
                      ) : (
                        <span className="workspace-pill">Conversation</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="workspace-chat__main">
            {selectedConversation ? (
              <>
                <div className="workspace-chat__main-header">
                  <div className="workspace-chat__contact">
                    <span className="workspace-chat__avatar">
                      {getInitials(selectedConversation.name) || 'CL'}
                    </span>
                    <div className="workspace-chat__contact-copy">
                      <strong>{selectedConversation.name}</strong>
                      <span
                        className={`workspace-pill ${
                          selectedConversation.isContactRequest || selectedConversation.isQuoteRequest
                            ? 'is-warning'
                            : 'is-success'
                        }`}
                      >
                        {selectedConversation.isContactRequest
                          ? selectedConversation.contactLabel || "Besoin d'aide"
                          : selectedConversation.isQuoteRequest
                            ? 'Demande devis'
                            : 'Client actif'}
                      </span>
                    </div>
                  </div>
                  <span className="workspace-note">
                    {currentMessages.length} message(s) dans ce fil
                  </span>
                </div>

                <div className="workspace-chat__messages">
                  {currentMessages.length === 0 ? (
                    <div className="workspace-empty">
                      <div className="workspace-empty__icon">REP</div>
                      <div className="workspace-empty__title">Aucun message dans ce fil</div>
                      <div className="workspace-empty__text">
                        Envoyez une premiere reponse pour lancer la conversation.
                      </div>
                    </div>
                  ) : (
                    Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
                      <div key={dateKey}>
                        <div className="workspace-chat__date">
                          <span>{formatGroupDate(dateKey)}</span>
                        </div>

                        {dateMessages.map((message) => {
                          const isSelf = message.senderId === 'admin';
                          const isPriority =
                            message.type === 'contact_request' || message.type === 'quote_request';

                          return (
                            <div
                              key={message.id}
                              className={`workspace-chat__row ${isSelf ? 'is-self' : 'is-other'}`}
                            >
                              <div className="workspace-chat__bubble-wrap">
                                {!isSelf && (
                                  <div className="workspace-chat__sender">
                                    {message.senderName || selectedConversation.name}
                                  </div>
                                )}
                                <div
                                  className={`workspace-chat__bubble ${
                                    isPriority ? 'is-priority' : ''
                                  }`}
                                >
                                  {isPriority && (
                                    <div className="workspace-chat__bubble-tag">
                                      {message.type === 'contact_request'
                                        ? message.contactLabel || "Besoin d'aide"
                                        : 'Demande de devis'}
                                    </div>
                                  )}
                                  {message.content}
                                </div>
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
                    placeholder={`Repondre a ${selectedConversation.name}...`}
                  />
                  <button className="workspace-send-btn" type="submit" disabled={!newMessage.trim()}>
                    Envoyer
                  </button>
                </form>
              </>
            ) : (
              <div className="workspace-chat__messages">
                <div className="workspace-empty">
                  <div className="workspace-empty__icon">ADM</div>
                  <div className="workspace-empty__title">Selectionnez une conversation</div>
                  <div className="workspace-empty__text">
                    Choisissez un fil a gauche pour repondre a un client ou consulter une demande.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminMessages;
