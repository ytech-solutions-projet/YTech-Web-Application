const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const LogPersistence = require('./logPersistence');

class DiskSpaceMonitor {
    constructor() {
        this.config = {
            alertThreshold: 85, // % d'utilisation critique
            warningThreshold: 75, // % d'utilisation warning
            checkInterval: 5 * 60 * 1000, // 5 minutes
            monitoredPaths: [
                '/',
                '/var',
                '/var/www',
                '/var/backups',
                '/var/log',
                '/tmp'
            ],
            reportPath: '/var/www/ytech/monitoring'
        };
        
        this.logger = new LogPersistence();
        this.initializeMonitoring();
    }

    // Initialisation du monitoring
    initializeMonitoring() {
        // Création du répertoire de monitoring
        if (!fs.existsSync(this.config.reportPath)) {
            fs.mkdirSync(this.config.reportPath, { recursive: true });
        }
        
        // Démarrage du monitoring
        this.startMonitoring();
        
        // Premier check immédiat
        this.checkDiskSpace();
        
        console.log('[DISK] Monitoring de l\'espace disque démarré');
    }

    // Démarrage du monitoring automatique
    startMonitoring() {
        setInterval(() => {
            this.checkDiskSpace();
        }, this.config.checkInterval);
    }

    // Vérification de l'espace disque
    async checkDiskSpace() {
        try {
            const results = await this.getDiskUsage();
            const alerts = [];
            
            for (const result of results) {
                const usage = parseInt(result.usage);
                
                // Génération des alertes
                if (usage >= this.config.alertThreshold) {
                    const alert = this.createAlert(result, 'CRITICAL');
                    alerts.push(alert);
                    this.handleCriticalAlert(alert);
                } else if (usage >= this.config.warningThreshold) {
                    const alert = this.createAlert(result, 'WARNING');
                    alerts.push(alert);
                    this.handleWarningAlert(alert);
                }
                
                // Logging
                this.logger.writeLog('system', 'info', `Espace disque ${result.mount}: ${usage}% utilisé`, {
                    filesystem: result.filesystem,
                    size: result.size,
                    used: result.used,
                    available: result.available,
                    mount: result.mount
                });
            }
            
            // Sauvegarde des résultats
            this.saveMonitoringResults(results);
            
            // Génération du rapport
            this.generateReport(results, alerts);
            
            return results;
            
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur monitoring espace disque', { error: error.message });
            return null;
        }
    }

    // Obtention de l'utilisation du disque
    getDiskUsage() {
        return new Promise((resolve, reject) => {
            exec('df -h', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                const lines = stdout.split('\n').slice(1); // Ignorer l'en-tête
                const results = [];
                
                for (const line of lines) {
                    if (line.trim()) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 6) {
                            const result = {
                                filesystem: parts[0],
                                size: parts[1],
                                used: parts[2],
                                available: parts[3],
                                usage: parts[4].replace('%', ''),
                                mount: parts[5]
                            };
                            
                            // Filtrer les chemins monitoringés
                            if (this.isPathMonitored(result.mount)) {
                                results.push(result);
                            }
                        }
                    }
                }
                
                resolve(results);
            });
        });
    }

    // Vérification si un chemin est monitoringé
    isPathMonitored(mount) {
        return this.config.monitoredPaths.some(path => {
            return mount === path || mount.startsWith(path + '/');
        });
    }

    // Création d'une alerte
    createAlert(diskInfo, severity) {
        return {
            timestamp: new Date().toISOString(),
            type: 'DISK_SPACE',
            severity: severity,
            filesystem: diskInfo.filesystem,
            mount: diskInfo.mount,
            usage: diskInfo.usage,
            size: diskInfo.size,
            used: diskInfo.used,
            available: diskInfo.available,
            message: `Espace disque ${severity.toLowerCase()}: ${diskInfo.usage}% utilisé sur ${diskInfo.mount}`,
            hostname: require('os').hostname()
        };
    }

    // Gestion des alertes critiques
    handleCriticalAlert(alert) {
        this.logger.writeLog('system', 'error', alert.message, alert);
        
        // Actions automatiques pour les alertes critiques
        this.performAutomaticCleanup(alert.mount);
        
        // Notification (si configurée)
        this.sendNotification(alert);
    }

    // Gestion des alertes warning
    handleWarningAlert(alert) {
        this.logger.writeLog('system', 'warn', alert.message, alert);
        
        // Notification (si configurée)
        this.sendNotification(alert);
    }

    // Nettoyage automatique
    async performAutomaticCleanup(mount) {
        try {
            const cleanupActions = [];
            
            // Nettoyage des logs si sur /var
            if (mount.startsWith('/var')) {
                cleanupActions.push(this.cleanupLogs());
            }
            
            // Nettoyage des fichiers temporaires si sur /tmp
            if (mount.startsWith('/tmp')) {
                cleanupActions.push(this.cleanupTempFiles());
            }
            
            // Nettoyage des anciens backups si sur /var/backups
            if (mount.includes('/backups')) {
                cleanupActions.push(this.cleanupOldBackups());
            }
            
            const results = await Promise.allSettled(cleanupActions);
            
            this.logger.writeLog('system', 'info', 'Nettoyage automatique effectué', {
                mount: mount,
                actions: results.map(r => r.status)
            });
            
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur nettoyage automatique', { error: error.message });
        }
    }

    // Nettoyage des logs
    cleanupLogs() {
        return new Promise((resolve) => {
            exec('find /var/log -name "*.log" -type f -mtime +7 -delete', (error) => {
                if (error) {
                    this.logger.writeLog('system', 'error', 'Erreur nettoyage logs', { error: error.message });
                } else {
                    this.logger.writeLog('system', 'info', 'Anciens logs supprimés');
                }
                resolve();
            });
        });
    }

    // Nettoyage des fichiers temporaires
    cleanupTempFiles() {
        return new Promise((resolve) => {
            exec('find /tmp -type f -mtime +1 -delete', (error) => {
                if (error) {
                    this.logger.writeLog('system', 'error', 'Erreur nettoyage temp', { error: error.message });
                } else {
                    this.logger.writeLog('system', 'info', 'Fichiers temporaires supprimés');
                }
                resolve();
            });
        });
    }

    // Nettoyage des anciens backups
    cleanupOldBackups() {
        return new Promise((resolve) => {
            exec('find /var/backups -type f -mtime +30 -delete', (error) => {
                if (error) {
                    this.logger.writeLog('system', 'error', 'Erreur nettoyage backups', { error: error.message });
                } else {
                    this.logger.writeLog('system', 'info', 'Anciens backups supprimés');
                }
                resolve();
            });
        });
    }

    // Envoi de notification
    sendNotification(alert) {
        // Implémenter selon vos besoins (email, webhook, etc.)
        if (process.env.DISK_ALERT_WEBHOOK) {
            const notification = {
                ...alert,
                webhook: process.env.DISK_ALERT_WEBHOOK
            };
            
            // Log de la notification
            this.logger.writeLog('system', 'info', 'Notification envoyée', notification);
        }
    }

    // Sauvegarde des résultats de monitoring
    saveMonitoringResults(results) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `disk_usage_${timestamp}.json`;
            const filepath = path.join(this.config.reportPath, filename);
            
            const data = {
                timestamp: new Date().toISOString(),
                results: results,
                hostname: require('os').hostname()
            };
            
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            
            // Nettoyage des anciens résultats
            this.cleanupOldMonitoringFiles();
            
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur sauvegarde monitoring', { error: error.message });
        }
    }

    // Nettoyage des anciens fichiers de monitoring
    cleanupOldMonitoringFiles() {
        try {
            const files = fs.readdirSync(this.config.reportPath);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7); // Garder 7 jours
            
            for (const file of files) {
                if (file.startsWith('disk_usage_') && file.endsWith('.json')) {
                    const filepath = path.join(this.config.reportPath, file);
                    const stats = fs.statSync(filepath);
                    
                    if (stats.mtime < cutoffDate) {
                        fs.unlinkSync(filepath);
                        this.logger.writeLog('system', 'info', `Ancien fichier monitoring supprimé: ${file}`);
                    }
                }
            }
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur nettoyage fichiers monitoring', { error: error.message });
        }
    }

    // Génération de rapport
    generateReport(results, alerts) {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                hostname: require('os').hostname(),
                summary: {
                    totalFilesystems: results.length,
                    criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
                    warningAlerts: alerts.filter(a => a.severity === 'WARNING').length,
                    averageUsage: results.reduce((sum, r) => sum + parseInt(r.usage), 0) / results.length
                },
                filesystems: results,
                alerts: alerts
            };
            
            const reportPath = path.join(this.config.reportPath, 'disk_space_report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            // Génération du rapport HTML
            this.generateHTMLReport(report);
            
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur génération rapport', { error: error.message });
        }
    }

    // Génération du rapport HTML
    generateHTMLReport(report) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Rapport Espace Disque - YTECH</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .alert { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .critical { background: #ffebee; border-left: 4px solid #f44336; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; }
        .info { background: #e3f2fd; border-left: 4px solid #2196f3; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f4f4f4; }
        .usage-high { color: #f44336; font-weight: bold; }
        .usage-medium { color: #ff9800; font-weight: bold; }
        .usage-low { color: #4caf50; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Rapport Espace Disque - YTECH</h1>
        <p><strong>Serveur:</strong> ${report.hostname}</p>
        <p><strong>Date:</strong> ${new Date(report.timestamp).toLocaleString('fr-FR')}</p>
        <p><strong>Utilisation moyenne:</strong> ${report.summary.averageUsage.toFixed(1)}%</p>
    </div>
    
    ${report.alerts.length > 0 ? `
    <h2>🚨 Alertes</h2>
    ${report.alerts.map(alert => `
        <div class="alert ${alert.severity.toLowerCase()}">
            <strong>${alert.severity}:</strong> ${alert.message}
            <br><small>${alert.filesystem} - ${alert.usage}% utilisé</small>
        </div>
    `).join('')}
    ` : '<div class="info">✅ Aucune alerte active</div>'}
    
    <h2>📊 Systèmes de Fichiers</h2>
    <table>
        <thead>
            <tr>
                <th>Système</th>
                <th>Taille</th>
                <th>Utilisé</th>
                <th>Disponible</th>
                <th>Utilisation</th>
                <th>Montage</th>
            </tr>
        </thead>
        <tbody>
            ${report.filesystems.map(fs => `
                <tr>
                    <td>${fs.filesystem}</td>
                    <td>${fs.size}</td>
                    <td>${fs.used}</td>
                    <td>${fs.available}</td>
                    <td class="${parseInt(fs.usage) >= 85 ? 'usage-high' : parseInt(fs.usage) >= 75 ? 'usage-medium' : 'usage-low'}">
                        ${fs.usage}%
                    </td>
                    <td>${fs.mount}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="info">
        <p><small>Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}</small></p>
    </div>
</body>
</html>`;
        
        const htmlPath = path.join(this.config.reportPath, 'disk_space_report.html');
        fs.writeFileSync(htmlPath, html);
    }

    // Obtention du rapport actuel
    getCurrentReport() {
        try {
            const reportPath = path.join(this.config.reportPath, 'disk_space_report.json');
            if (fs.existsSync(reportPath)) {
                return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            }
            return null;
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur lecture rapport', { error: error.message });
            return null;
        }
    }

    // Obtention de l'historique
    getHistory(days = 7) {
        try {
            const files = fs.readdirSync(this.config.reportPath);
            const history = [];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            for (const file of files) {
                if (file.startsWith('disk_usage_') && file.endsWith('.json')) {
                    const filepath = path.join(this.config.reportPath, file);
                    const stats = fs.statSync(filepath);
                    
                    if (stats.mtime >= cutoffDate) {
                        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                        history.push({
                            timestamp: data.timestamp,
                            averageUsage: data.results.reduce((sum, r) => sum + parseInt(r.usage), 0) / data.results.length
                        });
                    }
                }
            }
            
            return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            this.logger.writeLog('system', 'error', 'Erreur lecture historique', { error: error.message });
            return [];
        }
    }
}

module.exports = DiskSpaceMonitor;
