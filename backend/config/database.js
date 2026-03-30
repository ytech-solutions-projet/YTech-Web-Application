/**
 * YTECH - Configuration PostgreSQL
 */

const fs = require('fs');
const { Pool } = require('pg');
const { normalizeText, parseBoolean, parseInteger } = require('../utils/security');

class Database {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.verboseLogs = parseBoolean(process.env.DB_DEBUG_LOGS, !this.isProduction);
    this.ssl = this.buildSslConfig();
    this.poolConfig = this.buildPoolConfig();

    this.pool = new Pool(this.poolConfig);

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

  buildSslConfig() {
    const sslEnabled = parseBoolean(process.env.DB_SSL, this.isProduction);

    if (!sslEnabled) {
      return false;
    }

    const ssl = {
      require: true,
      rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, this.isProduction)
    };

    const caFile = normalizeText(process.env.DB_SSL_CA_FILE, { maxLength: 2048 });
    if (caFile) {
      try {
        ssl.ca = fs.readFileSync(caFile, 'utf8');
      } catch (error) {
        console.warn(`Impossible de lire le certificat PostgreSQL ${caFile}:`, error.message);
      }
    }

    return ssl;
  }

  buildPoolConfig() {
    const databaseUrl = normalizeText(process.env.DATABASE_URL, { maxLength: 4096 });
    const sharedConfig = {
      max: parseInteger(process.env.DB_POOL_MAX, 20),
      idleTimeoutMillis: parseInteger(process.env.DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMillis: parseInteger(process.env.DB_CONNECTION_TIMEOUT_MS, 5000),
      ssl: this.ssl,
      statement_timeout: parseInteger(process.env.DB_STATEMENT_TIMEOUT_MS, 10000),
      query_timeout: parseInteger(process.env.DB_QUERY_TIMEOUT_MS, 10000),
      application_name:
        normalizeText(process.env.DB_APPLICATION_NAME, { maxLength: 64 }) || 'YTECH_Backend',
      charset: 'utf8',
      keepAlive: parseBoolean(process.env.DB_KEEP_ALIVE, true),
      keepAliveInitialDelayMillis: parseInteger(
        process.env.DB_KEEP_ALIVE_INITIAL_DELAY_MS,
        10000
      )
    };

    if (databaseUrl) {
      return {
        connectionString: databaseUrl,
        ...sharedConfig
      };
    }

    return {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'ytech_user',
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'ytech_db',
      port: parseInteger(process.env.DB_PORT, 5432),
      ...sharedConfig
    };
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
