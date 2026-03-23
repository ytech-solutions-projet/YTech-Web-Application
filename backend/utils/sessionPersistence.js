const redis = require('redis');
const crypto = require('crypto');

class SessionPersistence {
    constructor() {
        this.client = null;
        this.config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || null,
            db: process.env.REDIS_DB || 0,
            keyPrefix: 'ytech:session:',
            defaultTTL: 24 * 60 * 60, // 24 heures
            cleanupInterval: 60 * 60 * 1000 // 1 heure
        };
        
        this.initialize();
    }

    async initialize() {
        try {
            this.client = redis.createClient({
                host: this.config.host,
                port: this.config.port,
                password: this.config.password,
                db: this.config.db,
                retry_delay_on_failover: 100,
                max_retries_per_request: 3
            });

            await this.client.connect();
            
            // Configuration de la persistance Redis
            await this.client.config('SET', 'save', '900 1 300 10 60 10000');
            await this.client.config('SET', 'appendonly', 'yes');
            await this.client.config('SET', 'appendfsync', 'everysec');
            
            console.log('[SESSION] Persistence Redis configurée avec succès');
            
            // Démarrage du nettoyage automatique
            this.startCleanup();
            
        } catch (error) {
            console.error('[SESSION] Erreur initialisation Redis:', error);
        }
    }

    // Création d'une session persistante
    async createSession(userId, sessionData, options = {}) {
        try {
            const sessionId = crypto.randomUUID();
            const sessionKey = this.config.keyPrefix + sessionId;
            const ttl = options.ttl || this.config.defaultTTL;
            
            const session = {
                id: sessionId,
                userId: userId,
                data: sessionData,
                createdAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                ipAddress: options.ipAddress || null,
                userAgent: options.userAgent || null,
                isActive: true
            };
            
            // Sauvegarde dans Redis avec TTL
            await this.client.setEx(sessionKey, ttl, JSON.stringify(session));
            
            // Index pour retrouver les sessions utilisateur
            await this.client.sAdd(`ytech:user_sessions:${userId}`, sessionId);
            
            console.log(`[SESSION] Session créée: ${sessionId} pour utilisateur: ${userId}`);
            
            return sessionId;
        } catch (error) {
            console.error('[SESSION] Erreur création session:', error);
            throw error;
        }
    }

    // Récupération d'une session
    async getSession(sessionId) {
        try {
            const sessionKey = this.config.keyPrefix + sessionId;
            const sessionData = await this.client.get(sessionKey);
            
            if (!sessionData) {
                return null;
            }
            
            const session = JSON.parse(sessionData);
            
            // Mise à jour du dernier accès
            session.lastAccessed = new Date().toISOString();
            await this.client.setEx(sessionKey, this.config.defaultTTL, JSON.stringify(session));
            
            return session;
        } catch (error) {
            console.error('[SESSION] Erreur récupération session:', error);
            return null;
        }
    }

    // Mise à jour d'une session
    async updateSession(sessionId, updates) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                return false;
            }
            
            Object.assign(session.data, updates);
            session.lastAccessed = new Date().toISOString();
            
            const sessionKey = this.config.keyPrefix + sessionId;
            await this.client.setEx(sessionKey, this.config.defaultTTL, JSON.stringify(session));
            
            console.log(`[SESSION] Session mise à jour: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('[SESSION] Erreur mise à jour session:', error);
            return false;
        }
    }

    // Suppression d'une session
    async deleteSession(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                return false;
            }
            
            const sessionKey = this.config.keyPrefix + sessionId;
            await this.client.del(sessionKey);
            
            // Suppression de l'index utilisateur
            await this.client.sRem(`ytech:user_sessions:${session.userId}`, sessionId);
            
            console.log(`[SESSION] Session supprimée: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('[SESSION] Erreur suppression session:', error);
            return false;
        }
    }

    // Récupération de toutes les sessions d'un utilisateur
    async getUserSessions(userId) {
        try {
            const sessionIds = await this.client.sMembers(`ytech:user_sessions:${userId}`);
            const sessions = [];
            
            for (const sessionId of sessionIds) {
                const session = await this.getSession(sessionId);
                if (session && session.isActive) {
                    sessions.push(session);
                }
            }
            
            return sessions;
        } catch (error) {
            console.error('[SESSION] Erreur récupération sessions utilisateur:', error);
            return [];
        }
    }

    // Suppression de toutes les sessions d'un utilisateur
    async deleteUserSessions(userId) {
        try {
            const sessionIds = await this.client.sMembers(`ytech:user_sessions:${userId}`);
            
            for (const sessionId of sessionIds) {
                await this.deleteSession(sessionId);
            }
            
            console.log(`[SESSION] Toutes les sessions supprimées pour utilisateur: ${userId}`);
            return true;
        } catch (error) {
            console.error('[SESSION] Erreur suppression sessions utilisateur:', error);
            return false;
        }
    }

    // Nettoyage des sessions expirées
    async cleanupExpiredSessions() {
        try {
            const pattern = this.config.keyPrefix + '*';
            const keys = await this.client.keys(pattern);
            let cleanedCount = 0;
            
            for (const key of keys) {
                const ttl = await this.client.ttl(key);
                if (ttl === -1) { // Session sans TTL (expirée)
                    await this.client.del(key);
                    cleanedCount++;
                }
            }
            
            console.log(`[SESSION] Nettoyage terminé: ${cleanedCount} sessions supprimées`);
            return cleanedCount;
        } catch (error) {
            console.error('[SESSION] Erreur nettoyage sessions:', error);
            return 0;
        }
    }

    // Démarrage du nettoyage automatique
    startCleanup() {
        setInterval(async () => {
            await this.cleanupExpiredSessions();
        }, this.config.cleanupInterval);
    }

    // Statistiques des sessions
    async getSessionStats() {
        try {
            const pattern = this.config.keyPrefix + '*';
            const keys = await this.client.keys(pattern);
            
            let activeSessions = 0;
            let totalUsers = new Set();
            
            for (const key of keys) {
                const sessionData = await this.client.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.isActive) {
                        activeSessions++;
                        totalUsers.add(session.userId);
                    }
                }
            }
            
            return {
                totalSessions: keys.length,
                activeSessions: activeSessions,
                uniqueUsers: totalUsers.size,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[SESSION] Erreur statistiques:', error);
            return null;
        }
    }

    // Sauvegarde des sessions
    async backupSessions() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `/var/backups/ytech/sessions/sessions_${timestamp}.json`;
            
            const pattern = this.config.keyPrefix + '*';
            const keys = await this.client.keys(pattern);
            const sessions = [];
            
            for (const key of keys) {
                const sessionData = await this.client.get(key);
                if (sessionData) {
                    sessions.push({
                        key: key,
                        data: JSON.parse(sessionData)
                    });
                }
            }
            
            const fs = require('fs');
            const path = require('path');
            
            // Création du répertoire si nécessaire
            const dir = path.dirname(backupPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(backupPath, JSON.stringify(sessions, null, 2));
            
            console.log(`[SESSION] Backup créé: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('[SESSION] Erreur backup sessions:', error);
            return null;
        }
    }

    // Restauration des sessions
    async restoreSessions(backupPath) {
        try {
            const fs = require('fs');
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            
            let restoredCount = 0;
            
            for (const session of backupData) {
                await this.client.set(session.key, JSON.stringify(session.data));
                restoredCount++;
            }
            
            console.log(`[SESSION] Restauration terminée: ${restoredCount} sessions restaurées`);
            return restoredCount;
        } catch (error) {
            console.error('[SESSION] Erreur restauration sessions:', error);
            return 0;
        }
    }

    // Fermeture propre
    async close() {
        if (this.client) {
            await this.client.quit();
            console.log('[SESSION] Client Redis fermé');
        }
    }
}

module.exports = SessionPersistence;
