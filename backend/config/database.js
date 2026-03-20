/**
 * YTECH - Configuration Base de Données PostgreSQL
 * Architecture sécurisée et optimisée avec PostgreSQL
 */

const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'ytech_user',
      password: process.env.DB_PASSWORD || 'ytech_secure_password_2024',
      database: process.env.DB_NAME || 'ytech_db',
      port: process.env.DB_PORT || 5432,
      max: 20, // Maximum nombre de connexions
      idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
      connectionTimeoutMillis: 2000, // Timeout de connexion 2s
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
        require: true
      } : false,
      // Options de sécurité PostgreSQL
      statement_timeout: 10000, // Timeout des requêtes 10s
      query_timeout: 10000,
      application_name: 'YTECH_Backend',
      // Charset UTF-8
      charset: 'utf8'
    });

    // Gestion des erreurs de connexion
    this.pool.on('error', (err, client) => {
      console.error('Erreur inattendue du pool PostgreSQL:', err);
    });

    // Monitoring des connexions
    this.pool.on('connect', (client) => {
      console.log('Nouvelle connexion PostgreSQL établie');
    });

    this.pool.on('remove', (client) => {
      console.log('Connexion PostgreSQL supprimée du pool');
    });
  }

  /**
   * Exécuter une requête SQL avec promesses
   * @param {string} sql - Requête SQL paramétrée
   * @param {Array} params - Paramètres de la requête
   * @returns {Promise<Array>} - Résultats de la requête
   */
  async query(sql, params = []) {
    const start = Date.now();
    
    try {
      // Log de la requête (sans les données sensibles)
      const logSql = sql.replace(/\$\d+/g, '?');
      console.log(`[PostgreSQL] Requête: ${logSql} (${params.length} paramètres)`);
      
      const result = await this.pool.query(sql, params);
      
      // Log de performance
      const duration = Date.now() - start;
      
      // Dans node-pg, result est directement le tableau de résultats
      const rows = Array.isArray(result) ? result : (result.rows || []);
      const rowCount = rows.length;
      console.log(`[PostgreSQL] Exécutée en ${duration}ms, ${rowCount} lignes`);
      
      return rows;
    } catch (error) {
      // Log détaillé de l'erreur
      console.error('[PostgreSQL] Erreur SQL:', {
        error: error.message,
        code: error.code,
        severity: error.severity,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        query: sql,
        params: params.length > 0 ? '[PARAMS_HIDDEN]' : '[]'
      });
      
      // Gestion des erreurs spécifiques à PostgreSQL
      if (error.code === '23505') {
        throw new Error('Violation de contrainte unique');
      } else if (error.code === '23503') {
        throw new Error('Violation de contrainte de clé étrangère');
      } else if (error.code === '23514') {
        throw new Error('Violation de contrainte CHECK');
      } else if (error.code === '23502') {
        throw new Error('Violation de contrainte NOT NULL');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Impossible de se connecter à PostgreSQL');
      } else if (error.code === '28P01') {
        throw new Error('Authentification PostgreSQL échouée');
      } else {
        throw error;
      }
    }
  }

  /**
   * Executer une requete SQL et retourner le resultat brut PostgreSQL
   * @param {string} sql - Requete SQL parametree
   * @param {Array} params - Parametres de la requete
   * @returns {Promise<Object>} - Resultat brut node-postgres
   */
  async execute(sql, params = []) {
    const start = Date.now();

    try {
      const logSql = sql.replace(/\$\d+/g, '?');
      console.log(`[PostgreSQL] Requete brute: ${logSql} (${params.length} parametres)`);

      const result = await this.pool.query(sql, params);
      const duration = Date.now() - start;
      console.log(`[PostgreSQL] Requete brute executee en ${duration}ms, ${result.rowCount || 0} lignes affectees`);

      return result;
    } catch (error) {
      console.error('[PostgreSQL] Erreur requete brute:', {
        error: error.message,
        code: error.code,
        query: sql,
        params: params.length > 0 ? '[PARAMS_HIDDEN]' : '[]'
      });

      throw error;
    }
  }

  /**
   * Exécuter une transaction sécurisée
   * @param {Function} callback - Fonction à exécuter dans la transaction
   * @returns {Promise<any>} - Résultat de la transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Isolation level pour la sécurité
      await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Transaction rollback:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Requête préparée pour meilleure performance et sécurité
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres
   * @returns {Promise<Array>} - Résultats
   */
  async preparedQuery(sql, params = []) {
    const client = await this.pool.connect();
    
    try {
      // Préparer la requête
      const prepared = await client.query({
        text: sql,
        values: params,
        name: sql.substring(0, 32).replace(/\s+/g, '_') // Nom unique pour le cache
      });
      
      return prepared.rows;
    } catch (error) {
      console.error('[PostgreSQL] Erreur requête préparée:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Vérifier la santé de la base de données
   * @returns {Promise<Object>} - État de santé détaillé
   */
  async healthCheck() {
    try {
      // Test de connexion basique
      await this.query('SELECT 1');
      
      // Statistiques du pool
      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
      
      // Informations sur la base
      const dbInfo = await this.query(`
        SELECT 
          version() as version,
          current_database() as database,
          current_user as user,
          inet_server_addr() as server_ip
      `);
      
      // Taille des tables
      const tableSizes = await this.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      return {
        status: 'healthy',
        pool: poolStats,
        database: dbInfo[0],
        tables: tableSizes,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Vérifier la connexion simple
   * @returns {Promise<boolean>} - État de la connexion
   */
  async testConnection() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Erreur de connexion PostgreSQL:', error.message);
      return false;
    }
  }

  /**
   * Obtenir des statistiques de performance
   * @returns {Promise<Object>} - Stats détaillées
   */
  async getPerformanceStats() {
    try {
      const stats = await this.query(`
        SELECT 
          datname as database,
          numbackends as connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as tuples_returned,
          tup_fetched as tuples_fetched
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);
      
      return stats[0] || {};
    } catch (error) {
      console.error('Erreur stats performance:', error);
      return {};
    }
  }

  /**
   * Fermer toutes les connexions proprement
   */
  async close() {
    try {
      await this.pool.end();
      console.log('[PostgreSQL] Pool de connexions fermé');
    } catch (error) {
      console.error('[PostgreSQL] Erreur fermeture pool:', error);
    }
  }

  /**
   * Échapper les valeurs pour prévenir les injections (utilise les requêtes préparées)
   * @deprecated Utiliser les requêtes paramétrées à la place
   */
  escape(value) {
    // PostgreSQL utilise des requêtes préparées, pas d'échappement manuel
    console.warn('[PostgreSQL] Utilisez les requêtes paramétrées au lieu de escape()');
    return value;
  }
}

// Instance singleton avec monitoring
const database = new Database();

// Export pour monitoring
module.exports = database;
