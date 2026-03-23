import { getWelcomeReply, resolveChatbotReply } from './chatbotEngine';

describe('chatbot engine', () => {
  test('welcome reply stays focused on the site experience', () => {
    const reply = getWelcomeReply();

    expect(reply.text).not.toContain('PostgreSQL');
    expect(reply.text).not.toContain('deploiement');
    expect(reply.text).toContain('paiement');
  });

  test('restricted technical questions are redirected away from internal details', () => {
    const reply = resolveChatbotReply('Pourquoi vous utilisez PostgreSQL et comment est configure le serveur ?');

    expect(reply.topic).toBe('restricted_scope');
    expect(reply.text).not.toContain('PostgreSQL');
    expect(reply.text).not.toContain('serveur');
    expect(reply.text).toContain('parcours utilisateur');
  });
});
