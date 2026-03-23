const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let sharp = null;

try {
    sharp = require('sharp');
} catch (error) {
    console.warn('[UPLOAD] sharp indisponible, les miniatures seront desactivees');
}

class UploadPersistence {
    constructor() {
        this.config = {
            uploadPath: process.env.UPLOAD_PATH || '/var/www/ytech/uploads',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
            allowedTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
                'text/plain',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            backupPath: '/var/backups/ytech/uploads',
            compressionEnabled: true,
            thumbnailSize: { width: 300, height: 300 }
        };
        
        this.initializeDirectories();
    }

    // Initialisation des répertoires d'upload
    initializeDirectories() {
        const directories = [
            this.config.uploadPath,
            path.join(this.config.uploadPath, 'images'),
            path.join(this.config.uploadPath, 'documents'),
            path.join(this.config.uploadPath, 'temp'),
            path.join(this.config.uploadPath, 'thumbnails'),
            this.config.backupPath
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[UPLOAD] Répertoire créé: ${dir}`);
            }
        });
    }

    // Validation du fichier
    validateFile(file) {
        // Vérification de la taille
        if (file.size > this.config.maxFileSize) {
            throw new Error(`Fichier trop volumineux. Maximum: ${this.config.maxFileSize / 1024 / 1024}MB`);
        }

        // Vérification du type MIME
        if (!this.config.allowedTypes.includes(file.mimetype)) {
            throw new Error(`Type de fichier non autorisé: ${file.mimetype}`);
        }

        return true;
    }

    // Génération d'un nom de fichier sécurisé
    generateSecureFilename(originalName) {
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        return `${timestamp}_${random}_${sanitizedName}${ext}`;
    }

    // Détermination du sous-répertoire selon le type
    getSubDirectory(mimetype) {
        if (mimetype.startsWith('image/')) {
            return 'images';
        } else if (mimetype.includes('document') || mimetype.includes('pdf')) {
            return 'documents';
        }
        return 'temp';
    }

    // Upload d'un fichier avec persistance
    async uploadFile(file, options = {}) {
        try {
            // Validation
            this.validateFile(file);
            
            // Génération du nom sécurisé
            const secureFilename = this.generateSecureFilename(file.name);
            const subDir = this.getSubDirectory(file.mimetype);
            const filePath = path.join(this.config.uploadPath, subDir, secureFilename);
            
            // Création du répertoire si nécessaire
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Sauvegarde du fichier
            fs.writeFileSync(filePath, file.data);
            
            // Création de thumbnail si c'est une image
            let thumbnailPath = null;
            if (file.mimetype.startsWith('image/')) {
                thumbnailPath = await this.createThumbnail(filePath, secureFilename);
            }
            
            // Métadonnées du fichier
            const metadata = {
                originalName: file.name,
                secureName: secureFilename,
                path: filePath,
                thumbnailPath: thumbnailPath,
                size: file.size,
                mimetype: file.mimetype,
                uploadedAt: new Date().toISOString(),
                uploadedBy: options.userId || 'anonymous',
                checksum: this.calculateChecksum(filePath),
                isPublic: options.isPublic || false,
                tags: options.tags || []
            };
            
            // Sauvegarde des métadonnées
            await this.saveMetadata(secureFilename, metadata);
            
            console.log(`[UPLOAD] Fichier uploadé: ${secureFilename}`);
            
            return {
                success: true,
                filename: secureFilename,
                path: `/uploads/${subDir}/${secureFilename}`,
                thumbnailPath: thumbnailPath ? `/uploads/thumbnails/${path.basename(thumbnailPath)}` : null,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('[UPLOAD] Erreur upload:', error);
            throw error;
        }
    }

    // Création de thumbnail pour les images
    async createThumbnail(imagePath, filename) {
        try {
            if (!sharp) {
                return null;
            }

            const thumbnailDir = path.join(this.config.uploadPath, 'thumbnails');
            const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);
            
            await sharp(imagePath)
                .resize(this.config.thumbnailSize.width, this.config.thumbnailSize.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            
            console.log(`[UPLOAD] Thumbnail créé: ${thumbnailPath}`);
            return thumbnailPath;
            
        } catch (error) {
            console.error('[UPLOAD] Erreur création thumbnail:', error);
            return null;
        }
    }

    // Calcul du checksum pour vérification d'intégrité
    calculateChecksum(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    // Sauvegarde des métadonnées
    async saveMetadata(filename, metadata) {
        try {
            const metadataPath = path.join(this.config.uploadPath, 'metadata.json');
            let metadataStore = {};
            
            if (fs.existsSync(metadataPath)) {
                metadataStore = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            }
            
            metadataStore[filename] = metadata;
            fs.writeFileSync(metadataPath, JSON.stringify(metadataStore, null, 2));
            
        } catch (error) {
            console.error('[UPLOAD] Erreur sauvegarde métadonnées:', error);
        }
    }

    // Récupération des métadonnées
    getMetadata(filename) {
        try {
            const metadataPath = path.join(this.config.uploadPath, 'metadata.json');
            if (!fs.existsSync(metadataPath)) {
                return null;
            }
            
            const metadataStore = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            return metadataStore[filename] || null;
            
        } catch (error) {
            console.error('[UPLOAD] Erreur récupération métadonnées:', error);
            return null;
        }
    }

    // Suppression d'un fichier
    async deleteFile(filename) {
        try {
            const metadata = this.getMetadata(filename);
            if (!metadata) {
                throw new Error('Fichier non trouvé');
            }
            
            // Suppression du fichier principal
            if (fs.existsSync(metadata.path)) {
                fs.unlinkSync(metadata.path);
            }
            
            // Suppression du thumbnail
            if (metadata.thumbnailPath && fs.existsSync(metadata.thumbnailPath)) {
                fs.unlinkSync(metadata.thumbnailPath);
            }
            
            // Suppression des métadonnées
            const metadataPath = path.join(this.config.uploadPath, 'metadata.json');
            const metadataStore = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            delete metadataStore[filename];
            fs.writeFileSync(metadataPath, JSON.stringify(metadataStore, null, 2));
            
            console.log(`[UPLOAD] Fichier supprimé: ${filename}`);
            return true;
            
        } catch (error) {
            console.error('[UPLOAD] Erreur suppression fichier:', error);
            return false;
        }
    }

    // Backup des fichiers uploadés
    async backupUploads() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.config.backupPath, `uploads_${timestamp}.tar.gz`);
            
            const command = `tar -czf ${backupFile} -C ${path.dirname(this.config.uploadPath)} ${path.basename(this.config.uploadPath)}`;
            
            const { exec } = require('child_process');
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('[UPLOAD] Erreur backup:', error);
                    return;
                }
                
                console.log(`[UPLOAD] Backup créé: ${backupFile}`);
                this.cleanupOldBackups();
            });
            
        } catch (error) {
            console.error('[UPLOAD] Erreur backup uploads:', error);
        }
    }

    // Nettoyage des anciens backups
    cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.config.backupPath);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7); // Garder 7 jours
            
            files.forEach(file => {
                const filePath = path.join(this.config.backupPath, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    console.log(`[UPLOAD] Ancien backup supprimé: ${file}`);
                }
            });
        } catch (error) {
            console.error('[UPLOAD] Erreur nettoyage backups:', error);
        }
    }

    // Vérification de l'intégrité des fichiers
    async verifyIntegrity() {
        try {
            const metadataPath = path.join(this.config.uploadPath, 'metadata.json');
            if (!fs.existsSync(metadataPath)) {
                return { valid: 0, invalid: 0, missing: 0 };
            }
            
            const metadataStore = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            let valid = 0, invalid = 0, missing = 0;
            
            for (const [filename, metadata] of Object.entries(metadataStore)) {
                if (!fs.existsSync(metadata.path)) {
                    missing++;
                    continue;
                }
                
                const currentChecksum = this.calculateChecksum(metadata.path);
                if (currentChecksum !== metadata.checksum) {
                    invalid++;
                    console.warn(`[UPLOAD] Fichier corrompu: ${filename}`);
                } else {
                    valid++;
                }
            }
            
            return { valid, invalid, missing };
        } catch (error) {
            console.error('[UPLOAD] Erreur vérification intégrité:', error);
            return { valid: 0, invalid: 0, missing: 0 };
        }
    }

    // Statistiques des uploads
    getUploadStats() {
        try {
            const metadataPath = path.join(this.config.uploadPath, 'metadata.json');
            if (!fs.existsSync(metadataPath)) {
                return null;
            }
            
            const metadataStore = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const stats = {
                totalFiles: Object.keys(metadataStore).length,
                totalSize: 0,
                typeDistribution: {},
                uploadsPerDay: {},
                latestUpload: null
            };
            
            for (const metadata of Object.values(metadataStore)) {
                stats.totalSize += metadata.size;
                
                // Distribution par type
                const type = metadata.mimetype.split('/')[0];
                stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
                
                // Uploads par jour
                const day = metadata.uploadedAt.split('T')[0];
                stats.uploadsPerDay[day] = (stats.uploadsPerDay[day] || 0) + 1;
                
                // Dernier upload
                if (!stats.latestUpload || metadata.uploadedAt > stats.latestUpload) {
                    stats.latestUpload = metadata.uploadedAt;
                }
            }
            
            return stats;
        } catch (error) {
            console.error('[UPLOAD] Erreur statistiques:', error);
            return null;
        }
    }

    // Nettoyage des fichiers temporaires
    cleanupTempFiles() {
        try {
            const tempDir = path.join(this.config.uploadPath, 'temp');
            if (!fs.existsSync(tempDir)) {
                return;
            }
            
            const files = fs.readdirSync(tempDir);
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - 24); // Supprimer après 24h
            
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    console.log(`[UPLOAD] Fichier temporaire supprimé: ${file}`);
                }
            });
        } catch (error) {
            console.error('[UPLOAD] Erreur nettoyage temporaires:', error);
        }
    }
}

module.exports = UploadPersistence;
