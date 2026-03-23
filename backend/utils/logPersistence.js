const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Transform } = require('stream');

class LogPersistence {
    constructor() {
        this.config = {
            logPath: process.env.LOG_PATH || '/var/www/ytech/logs',
            maxFileSize: parseInt(process.env.LOG_MAX_SIZE) || 100 * 1024 * 1024, // 100MB
            retentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 30,
            compressionEnabled: process.env.LOG_COMPRESSION !== 'false',
            logLevels: ['error', 'warn', 'info', 'debug'],
            categories: ['security', 'audit', 'performance', 'application', 'system']
        };
        
        this.initializeLogDirectories();
        this.setupLogRotation();
    }

    // Initialisation des répertoires de logs
    initializeLogDirectories() {
        const directories = [
            this.config.logPath,
            path.join(this.config.logPath, 'security'),
            path.join(this.config.logPath, 'audit'),
            path.join(this.config.logPath, 'performance'),
            path.join(this.config.logPath, 'application'),
            path.join(this.config.logPath, 'system'),
            path.join(this.config.logPath, 'archived')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[LOG] Répertoire créé: ${dir}`);
            }
        });
    }

    // Configuration de la rotation des logs
    setupLogRotation() {
        // Vérification de la taille des logs toutes les heures
        setInterval(() => {
            this.checkAndRotateLogs();
        }, 60 * 60 * 1000);
        
        // Nettoyage des anciens logs tous les jours à 1h
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(1, 0, 0, 0);
        
        const msUntilTomorrow = tomorrow - now;
        setTimeout(() => {
            this.cleanupOldLogs();
            setInterval(() => this.cleanupOldLogs(), 24 * 60 * 60 * 1000);
        }, msUntilTomorrow);
    }

    // Écriture d'un log avec persistance
    writeLog(category, level, message, metadata = {}) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                category,
                message,
                metadata,
                pid: process.pid,
                hostname: require('os').hostname()
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            const logFile = this.getLogFilePath(category, level);
            
            // Vérification de la taille avant écriture
            this.checkAndRotateLog(logFile);
            
            // Écriture synchrone pour garantir la persistance
            fs.appendFileSync(logFile, logLine);
            
            // Pour les logs critiques, écriture immédiate sur disque
            if (level === 'error' || level === 'warn') {
                fs.fsyncSync(fs.openSync(logFile, 'a'));
            }
            
        } catch (error) {
            console.error('[LOG] Erreur écriture log:', error);
        }
    }

    // Obtention du chemin du fichier de log
    getLogFilePath(category, level) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${category}_${level}_${date}.log`;
        return path.join(this.config.logPath, category, filename);
    }

    // Vérification et rotation d'un fichier de log
    checkAndRotateLog(logFile) {
        try {
            if (!fs.existsSync(logFile)) {
                return;
            }
            
            const stats = fs.statSync(logFile);
            
            if (stats.size >= this.config.maxFileSize) {
                this.rotateLog(logFile);
            }
        } catch (error) {
            console.error('[LOG] Erreur vérification rotation:', error);
        }
    }

    // Rotation d'un fichier de log
    rotateLog(logFile) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedFile = logFile.replace('.log', `_${timestamp}.log`);
            
            // Renommage du fichier actuel
            fs.renameSync(logFile, rotatedFile);
            
            // Compression si activée
            if (this.config.compressionEnabled) {
                this.compressLog(rotatedFile);
            }
            
            console.log(`[LOG] Rotation effectuée: ${logFile} -> ${rotatedFile}`);
            
        } catch (error) {
            console.error('[LOG] Erreur rotation log:', error);
        }
    }

    // Compression d'un fichier de log
    compressLog(logFile) {
        try {
            const compressedFile = logFile + '.gz';
            const readStream = fs.createReadStream(logFile);
            const writeStream = fs.createWriteStream(compressedFile);
            const gzip = zlib.createGzip();
            
            readStream.pipe(gzip).pipe(writeStream);
            
            writeStream.on('finish', () => {
                // Suppression du fichier original après compression
                fs.unlinkSync(logFile);
                
                // Déplacement vers le répertoire archivé
                const archivedDir = path.join(path.dirname(logFile), 'archived');
                if (!fs.existsSync(archivedDir)) {
                    fs.mkdirSync(archivedDir, { recursive: true });
                }
                const archivedFile = path.join(
                    archivedDir,
                    path.basename(compressedFile)
                );
                fs.renameSync(compressedFile, archivedFile);
                
                console.log(`[LOG] Log compressé: ${archivedFile}`);
            });
            
        } catch (error) {
            console.error('[LOG] Erreur compression log:', error);
        }
    }

    // Vérification et rotation de tous les logs
    checkAndRotateLogs() {
        try {
            const categories = this.config.categories;
            
            for (const category of categories) {
                const categoryDir = path.join(this.config.logPath, category);
                if (fs.existsSync(categoryDir)) {
                    const files = fs.readdirSync(categoryDir);
                    
                    for (const file of files) {
                        if (file.endsWith('.log')) {
                            const logFile = path.join(categoryDir, file);
                            this.checkAndRotateLog(logFile);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[LOG] Erreur vérification logs:', error);
        }
    }

    // Nettoyage des anciens logs
    cleanupOldLogs() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
            
            const categories = this.config.categories;
            let deletedCount = 0;
            
            for (const category of categories) {
                const categoryDir = path.join(this.config.logPath, category);
                const archivedDir = path.join(categoryDir, 'archived');
                
                // Nettoyage des fichiers de logs actuels
                if (fs.existsSync(categoryDir)) {
                    deletedCount += this.cleanupDirectory(categoryDir, cutoffDate);
                }
                
                // Nettoyage des archives
                if (fs.existsSync(archivedDir)) {
                    deletedCount += this.cleanupDirectory(archivedDir, cutoffDate);
                }
            }
            
            console.log(`[LOG] Nettoyage terminé: ${deletedCount} fichiers supprimés`);
            
        } catch (error) {
            console.error('[LOG] Erreur nettoyage logs:', error);
        }
    }

    // Nettoyage d'un répertoire de logs
    cleanupDirectory(directory, cutoffDate) {
        let deletedCount = 0;
        
        try {
            const files = fs.readdirSync(directory);
            
            for (const file of files) {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`[LOG] Ancien log supprimé: ${file}`);
                }
            }
        } catch (error) {
            console.error(`[LOG] Erreur nettoyage répertoire ${directory}:`, error);
        }
        
        return deletedCount;
    }

    // Recherche dans les logs
    searchLogs(category, level, query, options = {}) {
        try {
            const results = [];
            const categoryDir = path.join(this.config.logPath, category);
            
            if (!fs.existsSync(categoryDir)) {
                return results;
            }
            
            const files = fs.readdirSync(categoryDir);
            const logFiles = files
                .filter(file => file.includes(level) && file.endsWith('.log'))
                .sort()
                .reverse(); // Plus récents d'abord
            
            const limit = options.limit || 100;
            const startDate = options.startDate ? new Date(options.startDate) : null;
            const endDate = options.endDate ? new Date(options.endDate) : null;
            
            for (const file of logFiles) {
                if (results.length >= limit) break;
                
                const filePath = path.join(categoryDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    if (results.length >= limit) break;
                    
                    try {
                        const logEntry = JSON.parse(line);
                        
                        // Filtrage par dates
                        if (startDate && new Date(logEntry.timestamp) < startDate) continue;
                        if (endDate && new Date(logEntry.timestamp) > endDate) continue;
                        
                        // Recherche du query
                        if (query) {
                            const searchText = `${logEntry.message} ${JSON.stringify(logEntry.metadata)}`.toLowerCase();
                            if (!searchText.includes(query.toLowerCase())) continue;
                        }
                        
                        results.push(logEntry);
                        
                    } catch (parseError) {
                        // Ignorer les lignes invalides
                        continue;
                    }
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('[LOG] Erreur recherche logs:', error);
            return [];
        }
    }

    // Statistiques des logs
    getLogStats() {
        try {
            const stats = {
                totalFiles: 0,
                totalSize: 0,
                byCategory: {},
                byLevel: {},
                oldestLog: null,
                newestLog: null
            };
            
            const categories = this.config.categories;
            
            for (const category of categories) {
                const categoryDir = path.join(this.config.logPath, category);
                
                if (fs.existsSync(categoryDir)) {
                    const categoryStats = this.getCategoryStats(categoryDir);
                    
                    stats.byCategory[category] = categoryStats;
                    stats.totalFiles += categoryStats.files;
                    stats.totalSize += categoryStats.size;
                    
                    // Agrégation par niveau
                    for (const [level, count] of Object.entries(categoryStats.byLevel)) {
                        stats.byLevel[level] = (stats.byLevel[level] || 0) + count;
                    }
                    
                    // Mise à jour des dates
                    if (categoryStats.oldest && (!stats.oldestLog || categoryStats.oldest < stats.oldestLog)) {
                        stats.oldestLog = categoryStats.oldest;
                    }
                    if (categoryStats.newest && (!stats.newestLog || categoryStats.newest > stats.newestLog)) {
                        stats.newestLog = categoryStats.newest;
                    }
                }
            }
            
            return stats;
            
        } catch (error) {
            console.error('[LOG] Erreur statistiques logs:', error);
            return null;
        }
    }

    // Statistiques d'une catégorie
    getCategoryStats(categoryDir) {
        const stats = {
            files: 0,
            size: 0,
            byLevel: {},
            oldest: null,
            newest: null
        };
        
        try {
            const files = fs.readdirSync(categoryDir);
            
            for (const file of files) {
                const filePath = path.join(categoryDir, file);
                const fileStats = fs.statSync(filePath);
                
                stats.files++;
                stats.size += fileStats.size;
                
                if (!stats.oldest || fileStats.mtime < stats.oldest) {
                    stats.oldest = fileStats.mtime;
                }
                if (!stats.newest || fileStats.mtime > stats.newest) {
                    stats.newest = fileStats.mtime;
                }
                
                // Extraction du niveau depuis le nom du fichier
                const level = this.config.logLevels.find(l => file.includes(`_${l}_`));
                if (level) {
                    stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
                }
            }
            
        } catch (error) {
            console.error(`[LOG] Erreur statistiques catégorie ${categoryDir}:`, error);
        }
        
        return stats;
    }

    // Export des logs
    exportLogs(category, level, startDate, endDate, format = 'json') {
        try {
            const results = this.searchLogs(category, level, '', {
                startDate,
                endDate,
                limit: 10000
            });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportPath = path.join(this.config.logPath, 'exports');
            
            if (!fs.existsSync(exportPath)) {
                fs.mkdirSync(exportPath, { recursive: true });
            }
            
            const filename = `${category}_${level}_export_${timestamp}.${format}`;
            const filePath = path.join(exportPath, filename);
            
            let content;
            
            switch (format) {
                case 'json':
                    content = JSON.stringify(results, null, 2);
                    break;
                case 'csv':
                    content = this.convertToCSV(results);
                    break;
                case 'txt':
                    content = results.map(entry => 
                        `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`
                    ).join('\n');
                    break;
                default:
                    throw new Error(`Format non supporté: ${format}`);
            }
            
            fs.writeFileSync(filePath, content);
            
            console.log(`[LOG] Export créé: ${filePath}`);
            return filePath;
            
        } catch (error) {
            console.error('[LOG] Erreur export logs:', error);
            return null;
        }
    }

    // Conversion en CSV
    convertToCSV(logs) {
        if (logs.length === 0) return '';
        
        const headers = ['timestamp', 'level', 'category', 'message', 'metadata'];
        const csvRows = [headers.join(',')];
        
        for (const log of logs) {
            const row = [
                `"${log.timestamp}"`,
                `"${log.level}"`,
                `"${log.category}"`,
                `"${log.message.replace(/"/g, '""')}"`,
                `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        }
        
        return csvRows.join('\n');
    }

    // Méthodes statiques pour faciliter l'utilisation
    static error(category, message, metadata = {}) {
        const logger = new LogPersistence();
        logger.writeLog(category, 'error', message, metadata);
    }
    
    static warn(category, message, metadata = {}) {
        const logger = new LogPersistence();
        logger.writeLog(category, 'warn', message, metadata);
    }
    
    static info(category, message, metadata = {}) {
        const logger = new LogPersistence();
        logger.writeLog(category, 'info', message, metadata);
    }
    
    static debug(category, message, metadata = {}) {
        const logger = new LogPersistence();
        logger.writeLog(category, 'debug', message, metadata);
    }
}

module.exports = LogPersistence;
