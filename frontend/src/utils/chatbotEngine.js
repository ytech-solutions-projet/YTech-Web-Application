const createRouteAction = (label, route) => ({
  type: 'route',
  label,
  route
});

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesOneOf = (message, keywords) =>
  keywords.some((keyword) => message.includes(normalizeText(keyword)));

const countMatches = (message, keywords) =>
  keywords.reduce((total, keyword) => total + (message.includes(normalizeText(keyword)) ? 1 : 0), 0);

const appendAction = (actions, nextAction) => {
  if (!nextAction) {
    return;
  }

  const alreadyExists = actions.some(
    (action) => action.type === nextAction.type && action.label === nextAction.label && action.route === nextAction.route
  );

  if (!alreadyExists) {
    actions.push(nextAction);
  }
};

const formatSections = (sections) =>
  sections
    .filter((section) => Array.isArray(section.lines) && section.lines.length > 0)
    .map((section) => {
      const body = section.lines.join('\n');
      return section.title ? `${section.title}\n${body}` : body;
    })
    .join('\n\n');

const serviceCatalog = [
  {
    id: 'showcase',
    label: 'Site vitrine',
    keywords: ['site vitrine', 'vitrine', 'site simple', 'presentation', 'presence en ligne'],
    goalKeywords: ['presenter mon activite', 'presence en ligne', 'site pour entreprise', 'site de presentation'],
    priceRange: '5 000 - 15 000 DH',
    timeline: '2 a 4 semaines',
    summary: 'Ideal pour presenter une activite, rassurer les clients et generer les premiers contacts.',
    bestFor: 'entreprise, independant, cabinet, restaurant ou marque qui veut une presence claire'
  },
  {
    id: 'ecommerce',
    label: 'Site e-commerce',
    keywords: ['e commerce', 'ecommerce', 'boutique en ligne', 'shop', 'vente en ligne'],
    goalKeywords: ['vendre en ligne', 'catalogue', 'panier', 'commande', 'paiement en ligne', 'boutique'],
    priceRange: '15 000 - 50 000 DH',
    timeline: '4 a 8 semaines',
    summary: 'Adapte a la vente en ligne avec catalogue, tunnel d achat et paiement.',
    bestFor: 'marque ou commerce qui veut prendre des commandes et encaisser en ligne'
  },
  {
    id: 'webapp',
    label: 'Application web',
    keywords: ['application web', 'app web', 'plateforme', 'outil interne', 'saas'],
    goalKeywords: ['espace client', 'dashboard', 'gestion interne', 'outil metier', 'workflow', 'reservation', 'rendez vous'],
    priceRange: '20 000 - 80 000 DH',
    timeline: '6 a 10 semaines',
    summary: 'Pour un espace client, un outil metier, une plateforme de gestion ou un produit sur mesure.',
    bestFor: 'besoin de comptes, statuts, tableaux de bord, workflows ou logique metier'
  },
  {
    id: 'mobile',
    label: 'Application mobile',
    keywords: ['application mobile', 'app mobile', 'ios', 'android', 'mobile'],
    goalKeywords: ['smartphone', 'telephone', 'app iPhone', 'app Android', 'notification mobile'],
    priceRange: '25 000 - 100 000 DH',
    timeline: '8 a 12 semaines',
    summary: 'Concue pour les usages mobiles avec une logique produit plus complete.',
    bestFor: 'projet centre sur un usage mobile quotidien ou des notifications natives'
  },
  {
    id: 'seo',
    label: 'SEO et marketing',
    keywords: ['seo', 'referencement', 'marketing', 'visibilite', 'google'],
    goalKeywords: ['etre visible', 'etre trouve sur google', 'plus de trafic', 'plus de leads', 'referencement'],
    priceRange: 'Sur cadrage selon objectif',
    timeline: 'Mise en place rapide puis suivi continu',
    summary: 'Pour gagner en visibilite, attirer plus de trafic qualifie et mieux convertir.',
    bestFor: 'site existant qui doit generer plus de trafic ou mieux performer'
  },
  {
    id: 'maintenance',
    label: 'Maintenance et support',
    keywords: ['maintenance', 'support', 'correction', 'suivi technique', 'bug'],
    goalKeywords: ['corriger un bug', 'mise a jour', 'support technique', 'stabiliser le site', 'maintenance'],
    priceRange: 'Selon le volume et la frequence',
    timeline: 'Intervention ponctuelle ou suivi mensuel',
    summary: 'Pour garder le projet stable, securise et a jour dans le temps.',
    bestFor: 'site ou application deja en ligne qui demande un suivi regulier'
  }
];

const topicFallbacks = [
  {
    id: 'quote',
    keywords: ['devis', 'estimation', 'chiffrage', 'cadrage', 'combien ca coute'],
    text: [
      'Devis',
      '- Le devis se base sur le service, les fonctionnalites et le delai souhaite.',
      '- Plus le delai est urgent, plus le prix monte car le projet doit etre priorise.',
      '- La page devis vous donne une estimation initiale avant l envoi.'
    ].join('\n')
  },
  {
    id: 'payment',
    keywords: ['paiement', 'payer', 'reglement', 'acompte'],
    text: [
      'Paiement',
      '- Le client paie seulement apres validation du devis par l admin.',
      '- Une fois le paiement confirme, le projet passe automatiquement en cours.',
      '- Le paiement est accessible depuis le dashboard et le suivi des devis.'
    ].join('\n')
  },
  {
    id: 'dashboard',
    keywords: ['dashboard', 'tableau de bord', 'suivi', 'avancement'],
    text: [
      'Dashboard',
      '- Le client voit l etat de son devis, son projet et le bouton de paiement si besoin.',
      '- L admin voit les nouveaux devis, les paiements en attente et les messages recents.',
      '- Le dashboard sert maintenant vraiment de centre de pilotage.'
    ].join('\n')
  },
  {
    id: 'verification_email',
    keywords: ['verification email', 'activation compte', 'lien de verification', 'email non verifie'],
    text: [
      'Verification email',
      '- Apres inscription, un email de verification est envoye a l adresse du compte.',
      '- La connexion reste bloquee tant que le lien n a pas ete clique.',
      '- En cas de souci, la page de verification permet aussi de renvoyer un nouveau lien.'
    ].join('\n')
  },
  {
    id: 'contact',
    keywords: ['contact', 'email', 'telephone', 'joindre', 'appeler'],
    text: [
      'Contact',
      '- Email : contact@ytech.ma',
      '- Telephone : +212 6 00 00 00 00',
      '- Il y a maintenant une difference claire entre le contact general et l aide devis.'
    ].join('\n')
  }
];

const sensitiveInternalKeywords = [
  'mot de passe admin',
  'password admin',
  'identifiant admin',
  'compte admin',
  'jwt secret',
  'session secret',
  'api key',
  'cle api',
  'mot de passe base de donnees',
  'db password',
  'acces ssh',
  'ssh',
  'secret',
  '.env'
];

const technicalOverviewKeywords = [
  'react',
  'node',
  'backend',
  'frontend',
  'api',
  'base de donnees',
  'database',
  'postgres',
  'postgresql',
  'technique',
  'deploy',
  'deploiement',
  'serveur',
  'web server',
  'architecture',
  'stack'
];

const shortFollowUpKeywords = [
  'et le prix',
  'et le delai',
  'et le devis',
  'plus de details',
  'tu conseilles quoi',
  'tu me conseilles quoi',
  'lequel choisir',
  'laquelle choisir'
];

const getServiceById = (serviceId) => serviceCatalog.find((service) => service.id === serviceId) || null;

const detectService = (message) =>
  serviceCatalog.find((service) => service.keywords.some((keyword) => message.includes(normalizeText(keyword)))) || null;

const detectGoal = (message) =>
  serviceCatalog
    .map((service) => ({
      service,
      score: countMatches(message, service.goalKeywords)
    }))
    .sort((first, second) => second.score - first.score)[0];

const findFallbackTopic = (message) =>
  topicFallbacks
    .map((topic) => ({
      ...topic,
      score: countMatches(message, topic.keywords)
    }))
    .sort((first, second) => second.score - first.score)[0];

const resolveServiceFromHistory = (history = []) => {
  const lastBotMessage = [...history].reverse().find((message) => message.sender === 'bot');

  if (!lastBotMessage) {
    return null;
  }

  if (lastBotMessage.serviceId) {
    return getServiceById(lastBotMessage.serviceId);
  }

  return (
    serviceCatalog.find((service) => normalizeText(service.label) === normalizeText(lastBotMessage.topic || '')) || null
  );
};

const inferServiceFromContext = (message, history = []) => {
  const explicitService = detectService(message);
  if (explicitService) {
    return explicitService;
  }

  const words = message.split(' ').filter(Boolean);
  const looksLikeShortFollowUp = words.length <= 6 || includesOneOf(message, shortFollowUpKeywords);
  if (!looksLikeShortFollowUp) {
    return null;
  }

  return resolveServiceFromHistory(history);
};

const buildServiceSection = (service, lines = []) => ({
  title: service.label,
  lines: [
    `- ${service.summary}`,
    `- Budget indicatif : ${service.priceRange}`,
    `- Delai habituel : ${service.timeline}`,
    `- Le plus adapte si vous cherchez : ${service.bestFor}.`,
    ...lines
  ]
});

export const chatbotQuickActions = [
  { label: 'Quel service choisir ?', prompt: 'Je ne sais pas quel service choisir' },
  { label: 'Comment marche le devis ?', prompt: 'Comment marche le devis ?' },
  { label: 'Verification email', prompt: 'Comment marche la verification email ?' },
  { label: 'Quand faut-il payer ?', prompt: 'Quand est ce que le client doit payer ?' },
  { label: 'Ou suivre mon projet ?', prompt: 'Ou est ce que je vois l avancement de mon projet ?' }
];

export const getWelcomeReply = () => ({
  topic: 'welcome',
  text: [
    'Bonjour. Je suis l assistant YTECH.',
    '',
    'Je peux vous aider sur :',
    '- choix du service selon votre besoin',
    '- devis, budget, delais et paiement',
    '- verification email, compte, messagerie et contact',
    '- dashboard, suivi projet et navigation sur le site',
    '',
    'Si vous voulez, decrivez simplement votre objectif et je vous oriente.'
  ].join('\n'),
  actions: [
    createRouteAction('Voir les services', '/services'),
    createRouteAction('Demander un devis', '/devis'),
    createRouteAction('Verifier mon email', '/verify-email')
  ]
});

export const resolveChatbotReply = (rawMessage, history = []) => {
  const normalizedMessage = normalizeText(rawMessage);
  const actions = [];
  const sections = [];
  const words = normalizedMessage.split(' ').filter(Boolean);
  const detectedService = inferServiceFromContext(normalizedMessage, history);
  const detectedGoal = detectGoal(normalizedMessage);
  const lastBotTopic = [...history].reverse().find((message) => message.sender === 'bot')?.topic || null;

  const asksGreeting = includesOneOf(normalizedMessage, ['bonjour', 'salut', 'hello', 'bonsoir']);
  const asksThanks = includesOneOf(normalizedMessage, ['merci', 'parfait', 'super']);
  const asksWho = includesOneOf(normalizedMessage, ['qui es tu', 'tu fais quoi', 'que peux tu faire', 'aide moi']);
  const asksServices = includesOneOf(normalizedMessage, ['service', 'offre', 'prestation', 'solution', 'proposez']);
  const asksRecommendation = includesOneOf(normalizedMessage, [
    'quel service',
    'que choisir',
    'tu conseilles quoi',
    'je ne sais pas quoi choisir',
    'j hesite',
    'jhesite',
    'je ne sais pas quel service choisir'
  ]);
  const asksPrice = includesOneOf(normalizedMessage, ['prix', 'tarif', 'cout', 'coute', 'budget', 'combien']);
  const asksTimeline = includesOneOf(normalizedMessage, ['delai', 'duree', 'temps', 'urgent', 'rapide', 'flexible']);
  const asksQuote = includesOneOf(normalizedMessage, ['devis', 'estimation', 'chiffrage', 'cadrage']);
  const asksPayment = includesOneOf(normalizedMessage, ['paiement', 'payer', 'reglement', 'acompte', 'facture']);
  const asksDashboard = includesOneOf(normalizedMessage, ['dashboard', 'tableau de bord', 'suivi', 'avancement']);
  const asksAdmin = includesOneOf(normalizedMessage, ['admin', 'administrateur']);
  const asksContact = includesOneOf(normalizedMessage, ['contact', 'email', 'mail', 'telephone', 'joindre', 'appeler']);
  const asksPortfolio = includesOneOf(normalizedMessage, ['portfolio', 'realisation', 'projet', 'exemple', 'reference']);
  const asksLogin = includesOneOf(normalizedMessage, ['connexion', 'login', 'inscription', 'register', 'compte']);
  const asksMessages = includesOneOf(normalizedMessage, ['message', 'messagerie', 'conversation', 'chat']);
  const asksTheme = includesOneOf(normalizedMessage, ['dark mode', 'mode sombre', 'mode clair', 'white mode', 'theme']);
  const asksSecurity = includesOneOf(normalizedMessage, ['securite', 'securise', 'protection', 'confidentialite', 'confidentiel']);
  const asksSupportSplit = includesOneOf(normalizedMessage, ['aide devis', 'besoin d aide', 'difference entre contact', 'difference contact']);
  const asksCredentials = includesOneOf(normalizedMessage, ['mot de passe admin', 'identifiant admin', 'compte admin', 'password admin']);
  const asksEmailVerification = includesOneOf(normalizedMessage, [
    'verification email',
    'verifier email',
    'verifier mon email',
    'activer mon compte',
    'activation compte',
    'email non verifie',
    'email pas verifie',
    'lien de verification',
    'renvoyer le lien'
  ]);
  const asksPasswordReset = includesOneOf(normalizedMessage, [
    'mot de passe oublie',
    'mot de passe oublié',
    'reinitialiser mot de passe',
    'reset password',
    'lien de reinitialisation',
    'j ai oublie mon mot de passe'
  ]);
  const asksSensitiveInternals = includesOneOf(normalizedMessage, sensitiveInternalKeywords);
  const asksTechnicalOverview = includesOneOf(normalizedMessage, technicalOverviewKeywords);

  if (asksCredentials) {
    return {
      topic: 'security',
      text: [
        'Je ne peux pas communiquer des identifiants admin dans le chatbot.',
        '',
        'Pour la securite, ce type d information doit rester hors du chat public.',
        'Si vous avez besoin d acces, passez par l administrateur du projet.'
      ].join('\n'),
      actions: [createRouteAction('Contact general', '/contact?intent=support')]
    };
  }

  if (asksSensitiveInternals) {
    return {
      topic: 'restricted_scope',
      text: [
        'Je peux expliquer le fonctionnement general du site, mais pas les acces sensibles ni les secrets internes.',
        '',
        'Je peux par contre vous aider sur le parcours utilisateur, la verification email, le devis, le paiement et le suivi projet.'
      ].join('\n'),
      actions: [
        createRouteAction('Verifier mon email', '/verify-email'),
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Contacter YTECH', '/contact?intent=support')
      ]
    };
  }

  if ((asksGreeting && words.length <= 5) || asksWho) {
    return {
      topic: 'welcome',
      text: [
        'Bonjour. Je peux vous aider sur tout le parcours YTECH :',
        '- choix du service selon votre objectif',
        '- devis, budget et delais',
        '- verification email, connexion et recuperation d acces',
        '- dashboard, suivi, paiement et messagerie'
      ].join('\n'),
      actions: [
        createRouteAction('Voir les services', '/services'),
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Verifier mon email', '/verify-email')
      ]
    };
  }

  if (asksThanks) {
    return {
      topic: lastBotTopic || 'welcome',
      text: 'Avec plaisir. Si vous voulez, dites-moi directement votre besoin ou votre blocage et je vous repondrai plus precisement.',
      actions: [
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Nous contacter', '/contact?intent=support')
      ]
    };
  }

  if (asksTechnicalOverview) {
    sections.push({
      title: 'Fonctionnement general',
      lines: [
        '- Le site combine une interface web, une API securisee, une base de donnees et des emails transactionnels.',
        '- Cela sert a gerer le compte client, la verification email, les devis, la messagerie et le suivi du projet.',
        '- Je peux vous expliquer la logique globale ou le parcours utilisateur, sans detailler la configuration sensible.'
      ]
    });

    appendAction(actions, createRouteAction('Verification email', '/verify-email'));
    appendAction(actions, createRouteAction('Demander un devis', '/devis'));
  }

  if (asksEmailVerification) {
    sections.push({
      title: 'Verification email',
      lines: [
        '- Apres inscription, un email de verification est envoye a l adresse du compte.',
        '- Tant que le lien n a pas ete clique, la connexion reste bloquee.',
        '- Si le lien a expire ou n est pas arrive, la page de verification permet de renvoyer un nouveau lien.',
        '- Une fois l email confirme, vous pouvez vous connecter normalement.'
      ]
    });

    appendAction(actions, createRouteAction('Verifier mon email', '/verify-email'));
    appendAction(actions, createRouteAction('Connexion', '/login'));
  }

  if (asksPasswordReset) {
    sections.push({
      title: 'Mot de passe oublie',
      lines: [
        '- La page de reinitialisation envoie un lien a l adresse du compte.',
        '- Ce lien permet de definir un nouveau mot de passe sans passer par l ancien.',
        '- Si vous ne recevez rien, verifiez les spams puis refaites la demande.'
      ]
    });

    appendAction(actions, createRouteAction('Mot de passe oublie', '/forgot-password'));
    appendAction(actions, createRouteAction('Connexion', '/login'));
  }

  if (detectedService && (asksServices || asksRecommendation || asksPrice || asksTimeline || asksQuote || words.length <= 6)) {
    sections.push(
      buildServiceSection(detectedService, [
        '- Si vous me donnez votre objectif exact, je peux aussi vous dire si ce format est vraiment le bon.'
      ])
    );

    appendAction(actions, createRouteAction('Demander un devis', '/devis'));
    appendAction(actions, createRouteAction('Voir les services', '/services'));
  }

  if (!detectedService && detectedGoal?.score > 0 && (asksRecommendation || asksServices || asksQuote || asksPrice || asksTimeline)) {
    sections.push({
      title: 'Service conseille',
      lines: [
        `- D apres votre besoin, le plus coherent semble etre : ${detectedGoal.service.label}.`,
        `- ${detectedGoal.service.summary}`,
        `- Budget indicatif : ${detectedGoal.service.priceRange}`,
        `- Delai habituel : ${detectedGoal.service.timeline}`
      ]
    });

    appendAction(actions, createRouteAction('Demander un devis', '/devis'));
    appendAction(actions, createRouteAction('Voir les services', '/services'));
  }

  if (asksServices && !detectedService && !(detectedGoal?.score > 0 && asksRecommendation)) {
    sections.push({
      title: 'Services proposes',
      lines: [
        '- Site vitrine',
        '- Site e-commerce',
        '- Application web',
        '- Application mobile',
        '- SEO et marketing',
        '- Maintenance et support',
        '- Si vous hesitez, dites-moi votre objectif et je vous oriente vers le bon format.'
      ]
    });

    appendAction(actions, createRouteAction('Voir les services', '/services'));
    appendAction(actions, createRouteAction('Voir le portfolio', '/portfolio'));
  }

  if (asksPrice && !detectedService) {
    sections.push({
      title: 'Repere budget',
      lines: [
        '- Site vitrine : 5 000 - 15 000 DH',
        '- E-commerce : 15 000 - 50 000 DH',
        '- Application web : 20 000 - 80 000 DH',
        '- Application mobile : 25 000 - 100 000 DH',
        '- Le prix final depend du perimetre, des fonctionnalites et du delai.'
      ]
    });
  }

  if (asksTimeline && !detectedService) {
    sections.push({
      title: 'Delais',
      lines: [
        '- Site vitrine : 2 a 4 semaines',
        '- E-commerce : 4 a 8 semaines',
        '- Application web : 6 a 10 semaines',
        '- Application mobile : 8 a 12 semaines',
        '- Urgent : +35%, Rapide : +18%, Normal : base standard, Flexible : -8%'
      ]
    });
  }

  if (asksQuote) {
    sections.push({
      title: 'Fonctionnement du devis',
      lines: [
        '- Le client choisit un service, ajoute son besoin et le delai souhaite.',
        '- Une estimation initiale apparait avant l envoi.',
        '- L admin etudie ensuite la demande, peut accepter ou refuser, puis fixer le montant a payer.',
        '- Si le devis est accepte, le client paie avant le lancement du projet.'
      ]
    });

    appendAction(actions, createRouteAction('Formulaire devis', '/devis'));
    appendAction(actions, createRouteAction('Aide devis', '/contact?intent=quote-help'));
  }

  if (asksPayment) {
    sections.push({
      title: 'Paiement',
      lines: [
        '- Le paiement intervient apres validation du devis par l admin.',
        '- Le client retrouve le bouton de paiement dans son dashboard et dans le suivi des devis.',
        '- Une fois le paiement confirme, le devis passe automatiquement en cours.',
        '- L admin recoit aussi une notification sur ce passage.'
      ]
    });

    appendAction(actions, createRouteAction('Suivi des devis', '/devis-management'));
    appendAction(actions, createRouteAction('Page paiement', '/payment'));
  }

  if (asksDashboard && asksAdmin) {
    sections.push({
      title: 'Dashboard admin',
      lines: [
        '- L admin voit les nouveaux devis a traiter en priorite.',
        '- Il voit aussi les paiements en attente, les projets en cours et les derniers messages.',
        '- Depuis ce dashboard, il peut ouvrir directement la gestion du devis concerne.'
      ]
    });

    appendAction(actions, createRouteAction('Gerer les devis', '/devis-management'));
    appendAction(actions, createRouteAction('Messagerie admin', '/admin-messages'));
  } else if (asksDashboard) {
    sections.push({
      title: 'Dashboard client',
      lines: [
        '- Le client voit l etat de son devis et l avancement du projet.',
        '- Si le devis est approuve, le bouton de paiement apparait.',
        '- Une fois le paiement valide, le projet passe en cours et reste visible dans le suivi.'
      ]
    });

    appendAction(actions, createRouteAction('Voir le dashboard', '/dashboard'));
    appendAction(actions, createRouteAction('Mes devis', '/devis-management'));
  }

  if (asksMessages) {
    sections.push({
      title: 'Messagerie',
      lines: [
        '- Le client peut ecrire a l equipe depuis sa messagerie.',
        '- L admin voit les messages, les demandes de contact et les demandes de devis dans son espace.',
        '- Cela permet de suivre le projet sans sortir de l application.'
      ]
    });

    appendAction(actions, createRouteAction('Messagerie', '/messages'));
  }

  if (asksContact) {
    sections.push({
      title: 'Contact',
      lines: [
        '- Email : contact@ytech.ma',
        '- Telephone : +212 6 00 00 00 00',
        '- Le formulaire distingue maintenant le besoin d aide general et l aide liee au devis.'
      ]
    });

    appendAction(actions, createRouteAction('Contact general', '/contact?intent=support'));
    appendAction(actions, createRouteAction('Aide devis', '/contact?intent=quote-help'));
  }

  if (asksSupportSplit) {
    sections.push({
      title: 'Difference entre les deux formulaires',
      lines: [
        '- Besoin d aide : pour une question generale, un besoin de cadrage ou une demande simple.',
        '- Aide devis : pour clarifier un chiffrage, un perimetre, un delai ou un budget avant validation.',
        '- Les deux flux sont separes pour que la reponse soit plus logique cote client et cote admin.'
      ]
    });
  }

  if (asksLogin && !asksEmailVerification && !asksPasswordReset) {
    sections.push({
      title: 'Compte et acces',
      lines: [
        '- Le client peut creer son compte puis suivre ses devis, messages et paiements.',
        '- La premiere connexion demande d abord une verification email.',
        '- Si vous avez oublie votre mot de passe, un lien de reinitialisation est disponible.'
      ]
    });

    appendAction(actions, createRouteAction('Connexion', '/login'));
    appendAction(actions, createRouteAction('Creer un compte', '/register'));
  }

  if (asksTheme) {
    sections.push({
      title: 'Theme',
      lines: [
        '- L application prend en charge le mode clair et le mode sombre.',
        '- Le choix est memorise pour garder une experience coherente sur le site.'
      ]
    });
  }

  if (asksPortfolio) {
    sections.push({
      title: 'Portfolio',
      lines: [
        '- Le portfolio sert a montrer les formats de projets pris en charge.',
        '- Il aide a projeter le type de site, d application ou d espace client adapte a votre besoin.'
      ]
    });

    appendAction(actions, createRouteAction('Voir le portfolio', '/portfolio'));
  }

  if (asksSecurity) {
    sections.push({
      title: 'Securite',
      lines: [
        '- Le site applique des controles sur les formulaires, les acces et les parcours sensibles.',
        '- La verification email, les protections de session et les controles d acces renforcent le parcours.',
        '- Les informations privees et les acces sensibles ne sont pas communiques dans ce chatbot.'
      ]
    });
  }

  if (sections.length === 0) {
    const fallbackTopic = findFallbackTopic(normalizedMessage);

    if (fallbackTopic?.score > 0) {
      return {
        topic: fallbackTopic.id,
        text: fallbackTopic.text,
        actions: [
          createRouteAction('Dashboard', '/dashboard'),
          createRouteAction('Devis', '/devis'),
          createRouteAction('Contact', '/contact?intent=support')
        ]
      };
    }

    return {
      topic: 'fallback',
      text: [
        'Je peux vous aider plus precisement si vous me dites votre objectif ou votre blocage.',
        '',
        'Par exemple :',
        '- "Je veux vendre en ligne, quel service choisir ?"',
        '- "Comment marche la verification email apres inscription ?"',
        '- "Combien coute un site vitrine urgent ?"'
      ].join('\n'),
      actions: [
        createRouteAction('Voir les services', '/services'),
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Verifier mon email', '/verify-email')
      ]
    };
  }

  return {
    topic: sections[0].title ? normalizeText(sections[0].title) : lastBotTopic || 'answer',
    text: formatSections(sections.slice(0, 3)),
    actions: actions.slice(0, 3),
    serviceId: detectedService?.id || (detectedGoal?.score > 0 ? detectedGoal.service.id : null)
  };
};
