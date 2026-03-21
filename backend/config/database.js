/**
 * YTECH - Configuration PostgreSQL
 */

const { Pool } = require('pg');
const { parseBoolean } = require('../utils/security');

class Database {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.verboseLogs = parseBoolean(process.env.DB_DEBUG_LOGS, !this.isProduction);

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'ytech_user',
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'ytech_db',
      port: process.env.DB_PORT || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: this.isProduction
        ? {
            rejectUnauthorized: true,
            require: true
          }
        : false,
      statement_timeout: 10000,
      query_timeout: 10000,
      application_name: 'YTECH_Backend',
      charset: 'utf8'
    });

    this.pool.on('error', (error) => {
      console.error('Erreur inattendue du pool PostgreSQL:', error);
    });

    this.pool.on('connect', () => {
      if (this.verboseLogs) {
        console.log('Nouvelle connexion PostgreSQL etablie');
      }
    });

    this.pool.on('remove', () => {
      if (this.verboseLogs) {
        console.log('Connexion PostgreSQL supprimee du pool');
      }
    });
  }

  async query(sql, params = []) {
    const start = Date.now();

    try {
      if (this.verboseLogs) {
        const logSql = sql.replace(/\$\d+/g, '?');
        console.log(`[PostgreSQL] Requete: ${logSql} (${params.length} parametres)`);
      }

      const result = await this.pool.query(sql, params);
      const rows = Array.isArray(result) ? result : result.rows || [];

      if (this.verboseLogs) {
        const duration = Date.now() - start;
        console.log(`[PostgreSQL] Executee en ${duration}ms, ${rows.length} lignes`);
      }

      return rows;
    } catch (error) {
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

      if (error.code === '23505') {
        throw new Error('Violation de contrainte unique');
      }

      if (error.code === '23503') {
        throw new Error('Violation de contrainte de cle etrangere');
      }

      if (error.code === '23514') {
        throw new Error('Violation de contrainte CHECK');
      }

      if (error.code === '23502') {
        throw new Error('Violation de contrainte NOT NULL');
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Impossible de se connecter a PostgreSQL');
      }

      if (error.code === '28P01') {
        throw new Error('Authentification PostgreSQL echouee');
      }

      throw error;
    }
  }

  async execute(sql, params = []) {
    const start = Date.now();

    try {
      if (this.verboseLogs) {
        const logSql = sql.replace(/\$\d+/g, '?');
        console.log(`[PostgreSQL] Requete brute: ${logSql} (${params.length} parametres)`);
      }

      const result = await this.pool.query(sql, params);

      if (this.verboseLogs) {
        const duration = Date.now() - start;
        console.log(
          `[PostgreSQL] Requete brute executee en ${duration}ms, ${result.rowCount || 0} lignes affectees`
        );
      }

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

  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
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

  async preparedQuery(sql, params = []) {
    const client = await this.pool.connect();

    try {
      const prepared = await client.query({
        text: sql,
        values: params,
        name: sql.substring(0, 32).replace(/\s+/g, '_')
      });

      return prepared.rows;
    } catch (error) {
      console.error('[PostgreSQL] Erreur requete preparee:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    try {
      await this.query('SELECT 1');

      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      const dbInfo = await this.query(`
        SELECT
          version() as version,
          current_database() as database,
          current_user as user,
          inet_server_addr() as server_ip
      `);

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

  async testConnection() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Erreur de connexion PostgreSQL:', error.message);
      return false;
    }
  }

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

  async close() {
    try {
      await this.pool.end();
      console.log('[PostgreSQL] Pool de connexions ferme');
    } catch (error) {
      console.error('[PostgreSQL] Erreur fermeture pool:', error);
    }
  }

  escape(value) {
    console.warn('[PostgreSQL] Utilisez les requetes parametrees au lieu de escape()');
    return value;
  }
}

const database = new Database();

module.exports = database;
