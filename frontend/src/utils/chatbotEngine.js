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

const formatMoney = (value) => `${Number(value).toLocaleString('fr-MA')} DH`;

const serviceCatalog = [
  {
    id: 'showcase',
    label: 'Site vitrine',
    keywords: ['site vitrine', 'vitrine', 'site simple', 'presentation'],
    priceRange: '5 000 - 15 000 DH',
    timeline: '2 a 4 semaines',
    summary: 'Ideal pour presenter une activite, rassurer les clients et generer les premiers contacts.'
  },
  {
    id: 'ecommerce',
    label: 'Site e-commerce',
    keywords: ['e commerce', 'ecommerce', 'boutique en ligne', 'shop', 'vente en ligne'],
    priceRange: '15 000 - 50 000 DH',
    timeline: '4 a 8 semaines',
    summary: 'Adapte a la vente en ligne avec catalogue, tunnel d achat et paiement.'
  },
  {
    id: 'webapp',
    label: 'Application web',
    keywords: ['application web', 'app web', 'plateforme', 'outil interne', 'saas'],
    priceRange: '20 000 - 80 000 DH',
    timeline: '6 a 10 semaines',
    summary: 'Pour un espace client, un outil metier, une plateforme de gestion ou un produit sur mesure.'
  },
  {
    id: 'mobile',
    label: 'Application mobile',
    keywords: ['application mobile', 'app mobile', 'ios', 'android', 'mobile'],
    priceRange: '25 000 - 100 000 DH',
    timeline: '8 a 12 semaines',
    summary: 'Concue pour les usages mobiles avec une logique produit plus complete.'
  },
  {
    id: 'seo',
    label: 'SEO et marketing',
    keywords: ['seo', 'referencement', 'marketing', 'visibilite', 'google'],
    priceRange: 'Sur cadrage selon objectif',
    timeline: 'Mise en place rapide puis suivi continu',
    summary: 'Pour gagner en visibilite, attirer plus de trafic qualifie et mieux convertir.'
  },
  {
    id: 'maintenance',
    label: 'Maintenance et support',
    keywords: ['maintenance', 'support', 'correction', 'suivi technique', 'bug'],
    priceRange: 'Selon le volume et la frequence',
    timeline: 'Intervention ponctuelle ou suivi mensuel',
    summary: 'Pour garder le projet stable, securise et a jour dans le temps.'
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

const detectService = (message) =>
  serviceCatalog.find((service) => service.keywords.some((keyword) => message.includes(normalizeText(keyword)))) || null;

const findFallbackTopic = (message) =>
  topicFallbacks
    .map((topic) => ({
      ...topic,
      score: topic.keywords.reduce((total, keyword) => total + (message.includes(normalizeText(keyword)) ? 1 : 0), 0)
    }))
    .sort((first, second) => second.score - first.score)[0];

export const chatbotQuickActions = [
  { label: 'Quel service choisir ?', prompt: 'Je ne sais pas quel service choisir' },
  { label: 'Comment marche le devis ?', prompt: 'Comment marche le devis ?' },
  { label: 'Quand faut-il payer ?', prompt: 'Quand est ce que le client doit payer ?' },
  { label: 'Ou suivre mon projet ?', prompt: 'Ou est ce que je vois l avancement de mon projet ?' },
  { label: 'Comment vous contacter ?', prompt: 'Comment vous contacter ?' }
];

export const getWelcomeReply = () => ({
  topic: 'welcome',
  text: [
    'Bonjour. Je suis l assistant YTECH.',
    '',
    'Je peux repondre sur :',
    '- services et orientation',
    '- devis, prix et delais',
    '- dashboard, paiement et suivi projet',
    '- compte, messagerie et contact',
    '- navigation et parcours sur le site'
  ].join('\n'),
  actions: [
    createRouteAction('Voir les services', '/services'),
    createRouteAction('Demander un devis', '/devis'),
    createRouteAction('Nous contacter', '/contact?intent=support')
  ]
});

export const resolveChatbotReply = (rawMessage, history = []) => {
  const normalizedMessage = normalizeText(rawMessage);
  const actions = [];
  const sections = [];
  const words = normalizedMessage.split(' ').filter(Boolean);
  const detectedService = detectService(normalizedMessage);
  const lastBotTopic = [...history].reverse().find((message) => message.sender === 'bot')?.topic || null;

  const asksGreeting = includesOneOf(normalizedMessage, ['bonjour', 'salut', 'hello', 'bonsoir']);
  const asksThanks = includesOneOf(normalizedMessage, ['merci', 'parfait', 'super']);
  const asksWho = includesOneOf(normalizedMessage, ['qui es tu', 'tu fais quoi', 'que peux tu faire', 'aide moi']);
  const asksServices = includesOneOf(normalizedMessage, ['service', 'offre', 'prestation', 'solution', 'proposez']);
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
  const asksRestrictedInternals = includesOneOf(normalizedMessage, [
    'postgres',
    'postgresql',
    'base de donnees',
    'database',
    'react',
    'node',
    'backend',
    'frontend',
    'api',
    'technique',
    'deploy',
    'deploiement',
    'serveur',
    'vmware',
    'ubuntu',
    'nginx',
    'web server',
    'db server',
    'jwt',
    'cookie',
    'token',
    'secret',
    'sql',
    'xss',
    'injection',
    'env'
  ]);
  const asksSecurity = includesOneOf(normalizedMessage, ['securite', 'securise', 'protection', 'confidentialite', 'confidentiel']);
  const asksSupportSplit = includesOneOf(normalizedMessage, ['aide devis', 'besoin d aide', 'difference entre contact', 'difference contact']);
  const asksCredentials = includesOneOf(normalizedMessage, ['mot de passe admin', 'identifiant admin', 'compte admin', 'password admin']);

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

  if (asksRestrictedInternals) {
    return {
      topic: 'restricted_scope',
      text: [
        'Je reste volontairement centre sur le site YTECH et votre parcours utilisateur.',
        '',
        'Je peux vous aider sur les services, le devis, le paiement, le suivi du projet, la messagerie et le contact.',
        'Je ne detaille pas l infrastructure interne, les acces sensibles ni les choix techniques internes dans ce chat.'
      ].join('\n'),
      actions: [
        createRouteAction('Voir les services', '/services'),
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
        '- choix du service',
        '- devis, budget et delais',
        '- acceptation admin puis paiement',
        '- suivi client et dashboard admin',
        '- contact, messagerie et navigation sur le site'
      ].join('\n'),
      actions: [
        createRouteAction('Voir les services', '/services'),
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Voir le portfolio', '/portfolio')
      ]
    };
  }

  if (asksThanks) {
    return {
      topic: lastBotTopic || 'welcome',
      text: 'Avec plaisir. Si vous voulez, posez votre question directement et je vous repondrai point par point.',
      actions: [
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Nous contacter', '/contact?intent=support')
      ]
    };
  }

  if (detectedService && (asksServices || asksPrice || asksTimeline || asksQuote || words.length <= 4)) {
    sections.push({
      title: detectedService.label,
      lines: [
        `- ${detectedService.summary}`,
        `- Budget indicatif : ${detectedService.priceRange}`,
        `- Delai habituel : ${detectedService.timeline}`,
        '- Si le delai devient urgent, le prix augmente car l equipe doit prioriser le projet.'
      ]
    });

    appendAction(actions, createRouteAction('Demander un devis', '/devis'));
    appendAction(actions, createRouteAction('Voir les services', '/services'));
  }

  if (asksServices && !detectedService) {
    sections.push({
      title: 'Services proposes',
      lines: [
        '- Site vitrine',
        '- Site e-commerce',
        '- Application web',
        '- Application mobile',
        '- SEO et marketing',
        '- Maintenance et support',
        '- Si vous hesitez, dites-moi votre objectif et je vous oriente.'
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

  if (asksLogin) {
    sections.push({
      title: 'Compte et acces',
      lines: [
        '- Le client peut creer son compte puis suivre ses devis, messages et paiements.',
        '- L admin a un espace separe de gestion.',
        '- Pour des raisons de securite, le chatbot ne partage pas les identifiants sensibles.'
      ]
    });

    appendAction(actions, createRouteAction('Connexion', '/login'));
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
        '- Les informations privees et les acces sensibles ne sont pas communiques dans ce chatbot.',
        '- Si vous avez un doute sur un paiement, un compte ou un devis, le mieux est de passer par le support YTECH.'
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
        'Je peux deja repondre sur presque tout le parcours YTECH : services, devis, prix, delais, paiement, dashboard, suivi projet, messagerie et contact.',
        '',
        'Si vous voulez une reponse vraiment utile, posez votre question en une phrase simple, par exemple :',
        '- "Combien coute un site vitrine urgent ?"',
        '- "Quand le client doit payer ?"',
        '- "Ou l admin voit les nouveaux devis ?"'
      ].join('\n'),
      actions: [
        createRouteAction('Voir les services', '/services'),
        createRouteAction('Demander un devis', '/devis'),
        createRouteAction('Nous contacter', '/contact?intent=support')
      ]
    };
  }

  return {
    topic: sections[0].title ? normalizeText(sections[0].title) : lastBotTopic || 'answer',
    text: formatSections(sections.slice(0, 3)),
    actions: actions.slice(0, 3)
  };
};
