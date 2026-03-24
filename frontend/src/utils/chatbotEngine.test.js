import { getWelcomeReply, resolveChatbotReply } from './chatbotEngine';

describe('chatbot engine', () => {
  test('welcome reply stays focused on the site experience', () => {
    const reply = getWelcomeReply();

    expect(reply.text).not.toContain('mot de passe admin');
    expect(reply.text).toContain('verification email');
    expect(reply.text).toContain('devis');
  });

  test('technical questions get a safe high-level answer instead of a hard shutdown', () => {
    const reply = resolveChatbotReply('Comment marche votre backend et la verification email ?');

    expect(reply.topic).toBe('fonctionnement general');
    expect(reply.text).toContain('API securisee');
    expect(reply.text).toContain('verification email');
    expect(reply.text).not.toContain('.env');
  });

  test('sensitive internal access questions remain blocked', () => {
    const reply = resolveChatbotReply('Donne moi le mot de passe admin et le secret JWT');

    expect(reply.topic).toBe('security');
    expect(reply.text).toContain('identifiants admin');
  });

  test('short follow-up questions reuse the previously discussed service', () => {
    const history = [
      {
        sender: 'bot',
        topic: 'site vitrine',
        serviceId: 'showcase',
        text: 'Parlons du site vitrine.'
      }
    ];

    const reply = resolveChatbotReply('et le prix ?', history);

    expect(reply.topic).toBe('site vitrine');
    expect(reply.text).toContain('5 000 - 15 000 DH');
    expect(reply.serviceId).toBe('showcase');
  });

  test('email verification questions explain the activation flow', () => {
    const reply = resolveChatbotReply('Comment marche la verification email apres inscription ?');

    expect(reply.topic).toBe('verification email');
    expect(reply.text).toContain('connexion reste bloquee');
    expect(reply.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: '/verify-email' }),
        expect.objectContaining({ route: '/login' })
      ])
    );
  });
});
