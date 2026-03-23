const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
let cron = null;

try {
    cron = require('node-cron');
} catch (error) {
    console.warn('[PERSISTENCE] node-cron indisponible, planification desactivee');
}

class PersistenceManager {
    constructor() {
        this.config = {
            dbPath: process.env.DB_BACKUP_PATH || '/var/backups/ytech/postgresql',
            uploadPath: process.env.UPLOAD_PATH || '/var/www/ytech/uploads',
            logPath: process.env.LOG_PATH || '/var/www/ytech/logs',
            monitoringPath: process.env.MONITORING_PATH || '/var/www/ytech/monitoring'
        };
        
        this.initializeDirectories();
        this.setupSchedules();
    }

    // Initialisation des répertoires de persistance
    initializeDirectories() {
        const directories = [
            this.config.dbPath,
            this.config.uploadPath,
            this.config.logPath,
            this.config.monitoringPath,
            path.join(this.config.logPath, 'security'),
            path.join(this.config.logPath, 'audit'),
            path.join(this.config.logPath, 'performance'),
            path.join(this.config.uploadPath, 'images'),
            path.join(this.config.uploadPath, 'documents'),
            path.join(this.config.uploadPath, 'temp')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[PERSISTENCE] Répertoire créé: ${dir}`);
            }
        });
    }

    // Configuration des tâches planifiées
    setupSchedules() {
        // Backup PostgreSQL tous les jours à 2h
        if (!cron || typeof cron.schedule !== 'function') {
            console.warn('[PERSISTENCE] Taches planifiees ignorees car node-cron est indisponible');
            return;
        }

        cron.schedule('0 2 * * *', () => {
            this.backupPostgreSQL();
        });

        // Backup uploads tous les jours à 3h
        cron.schedule('0 3 * * *', () => {
            this.backupUploads();
        });

        // Nettoyage des logs tous les jours à 1h
        cron.schedule('0 1 * * *', () => {
            this.cleanupLogs();
        });

        // Nettoyage des sessions toutes les 6 heures
        cron.schedule('0 */6 * * *', () => {
            this.cleanupSessions();
        });

        // Monitoring de l'espace disque toutes les heures
        cron.schedule('0 * * * *', () => {
            this.monitorDiskSpace();
        });

        console.log('[PERSISTENCE] Tâches planifiées configurées');
    }

    // Backup PostgreSQL
    async backupPostgreSQL() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.config.dbPath, `ytech_db_${timestamp}.sql`);
            
            const command = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > ${backupFile}`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('[PERSISTENCE] Erreur backup PostgreSQL:', error);
                    return;
                }
                
                // Compression du backup
                exec(`gzip ${backupFile}`, (err) => {
                    if (!err) {
                        console.log(`[PERSISTENCE] Backup PostgreSQL compressé: ${backupFile}.gz`);
                        this.cleanupOldBackups(this.config.dbPath, 30); // Garder 30 jours
                    }
                });
            });
        } catch (error) {
            console.error('[PERSISTENCE] Erreur lors du backup PostgreSQL:', error);
        }
    }

    // Backup des uploads
    async backupUploads() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.config.dbPath, `uploads_${timestamp}.tar.gz`);
            
            const command = `tar -czf ${backupFile} -C ${path.dirname(this.config.uploadPath)} ${path.basename(this.config.uploadPath)}`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('[PERSISTENCE] Erreur backup uploads:', error);
                    return;
                }
                
                console.log(`[PERSISTENCE] Backup uploads créé: ${backupFile}`);
                this.cleanupOldBackups(this.config.dbPath, 7); // Garder 7 jours
            });
        } catch (error) {
            console.error('[PERSISTENCE] Erreur lors du backup uploads:', error);
        }
    }

    // Nettoyage des anciens backups
    cleanupOldBackups(directory, retentionDays) {
        try {
            const files = fs.readdirSync(directory);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            files.forEach(file => {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    console.log(`[PERSISTENCE] Ancien fichier supprimé: ${file}`);
                }
            });
        } catch (error) {
            console.error('[PERSISTENCE] Erreur nettoyage backups:', error);
        }
    }

    // Nettoyage des logs
    cleanupLogs() {
        try {
            const logDirs = [
                path.join(this.config.logPath, 'security'),
                path.join(this.config.logPath, 'audit'),
                path.join(this.config.logPath, 'performance'),
                this.config.logPath
            ];

            logDirs.forEach(dir => {
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - 30);

                    files.forEach(file => {
                        if (file.endsWith('.log')) {
                            const filePath = path.join(dir, file);
                            const stats = fs.statSync(filePath);
                            
                            if (stats.mtime < cutoffDate) {
                                // Compression avant suppression
                                if (!file.endsWith('.gz')) {
                                    exec(`gzip ${filePath}`, () => {
                                        console.log(`[PERSISTENCE] Log compressé: ${file}`);
                                    });
                                }
                            }
                        }
                    });
                }
            });
        } catch (error) {
            console.error('[PERSISTENCE] Erreur nettoyage logs:', error);
        }
    }

    // Nettoyage des sessions expirées
    async cleanupSessions() {
        try {
            // Si vous utilisez Redis pour les sessions
            if (process.env.SESSION_STORAGE === 'redis') {
                const redis = require('redis');
                const client = redis.createClient();
                
                // Nettoyage des clés de session expirées
                const pattern = 'session:*';
                const keys = await client.keys(pattern);
                
                for (const key of keys) {
                    const ttl = await client.ttl(key);
                    if (ttl === -1) { // Session sans expiration
                        await client.del(key);
                        console.log(`[PERSISTENCE] Session expirée supprimée: ${key}`);
                    }
                }
                
                await client.quit();
            }
        } catch (error) {
            console.error('[PERSISTENCE] Erreur nettoyage sessions:', error);
        }
    }

    // Monitoring de l'espace disque
    monitorDiskSpace() {
        try {
            exec('df -h', (error, stdout) => {
                if (error) {
                    console.error('[PERSISTENCE] Erreur monitoring disque:', error);
                    return;
                }

                const lines = stdout.split('\n');
                lines.forEach(line => {
                    if (line.includes('/var') || line.includes('/home')) {
                        const parts = line.split(/\s+/);
                        const usage = parts[4];
                        const percentage = parseInt(usage.replace('%', ''));
                        
                        if (percentage > 80) {
                            console.warn(`[PERSISTENCE] ⚠️ Espace disque critique: ${usage} utilisé`);
                            this.sendDiskSpaceAlert(usage);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('[PERSISTENCE] Erreur monitoring disque:', error);
        }
    }

    // Alerte d'espace disque
    sendDiskSpaceAlert(usage) {
        const alertMessage = {
            timestamp: new Date().toISOString(),
            type: 'DISK_SPACE_ALERT',
            message: `Espace disque critique: ${usage} utilisé`,
            server: process.env.HOSTNAME || 'YTECH-Server',
            severity: 'HIGH'
        };

        // Écrire dans les logs de sécurité
        const logFile = path.join(this.config.logPath, 'security', 'system_alerts.log');
        fs.appendFileSync(logFile, JSON.stringify(alertMessage) + '\n');
        
        console.error('[PERSISTENCE] 🚨 Alerte espace disque:', usage);
    }

    // Vérification de l'intégrité des données
    async verifyDataIntegrity() {
        try {
            // Vérification de la connexion PostgreSQL
            const { Client } = require('pg');
            const client = new Client({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });

            await client.connect();
            
            // Vérification des tables principales
            const tables = ['users', 'projects', 'contact_requests', 'sessions'];
            for (const table of tables) {
                const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`[PERSISTENCE] Table ${table}: ${result.rows[0].count} enregistrements`);
            }
            
            await client.end();
            console.log('[PERSISTENCE] ✅ Intégrité des données vérifiée');
        } catch (error) {
            console.error('[PERSISTENCE] Erreur vérification intégrité:', error);
        }
    }

    // Génération de rapport de persistance
    generatePersistenceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            directories: {},
            diskUsage: {},
            lastBackups: {},
            status: 'HEALTHY'
        };

        // Analyse des répertoires
        Object.entries(this.config).forEach(([key, path]) => {
            if (fs.existsSync(path)) {
                const stats = fs.statSync(path);
                report.directories[key] = {
                    path: path,
                    exists: true,
                    modified: stats.mtime
                };
            }
        });

        return report;
    }
}

module.exports = PersistenceManager;
