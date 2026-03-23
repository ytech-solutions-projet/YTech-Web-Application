#!/bin/bash

# ===============================================
# 🗄️ YTECH AUTOMATED BACKUP SCRIPT
# ===============================================

# Configuration
BACKUP_BASE_DIR="/var/backups/ytech"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="/var/log/ytech-backup.log"
RETENTION_DAYS=30

# Configuration depuis les variables d'environnement
DB_HOST=${DB_HOST:-"10.10.10.3"}
DB_USER=${DB_USER:-"ytech_user"}
DB_PASSWORD=${DB_PASSWORD:-"YtechDb2026"}
DB_NAME=${DB_NAME:-"ytech_db"}
UPLOAD_PATH=${UPLOAD_PATH:-"/var/www/ytech/uploads"}
REDIS_HOST=${REDIS_HOST:-"localhost"}

# Création des répertoires de backup
mkdir -p "$BACKUP_BASE_DIR/postgresql"
mkdir -p "$BACKUP_BASE_DIR/uploads"
mkdir -p "$BACKUP_BASE_DIR/redis"
mkdir -p "$BACKUP_BASE_DIR/config"
mkdir -p "$(dirname "$LOG_FILE")"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction de vérification de l'espace disque
check_disk_space() {
    local usage=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 85 ]; then
        log "⚠️ Alerte: Espace disque à ${usage}% sur $BACKUP_BASE_DIR"
        return 1
    fi
    return 0
}

# Backup PostgreSQL
backup_postgresql() {
    log "🔄 Début backup PostgreSQL..."
    
    local backup_file="$BACKUP_BASE_DIR/postgresql/ytech_db_$DATE.sql"
    local compressed_file="$backup_file.gz"
    
    # Vérification de la connexion
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log "❌ Erreur de connexion PostgreSQL"
        return 1
    fi
    
    # Backup
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$backup_file" 2>> "$LOG_FILE"; then
        # Compression
        gzip "$backup_file"
        
        # Vérification
        if [ -f "$compressed_file" ]; then
            local size=$(du -h "$compressed_file" | cut -f1)
            log "✅ Backup PostgreSQL compressé: $compressed_file ($size)"
            
            # Backup du schéma séparément
            local schema_file="$BACKUP_BASE_DIR/postgresql/schema_$DATE.sql"
            PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --schema-only > "$schema_file" 2>> "$LOG_FILE"
            gzip "$schema_file"
            
            return 0
        else
            log "❌ Erreur compression backup PostgreSQL"
            return 1
        fi
    else
        log "❌ Erreur backup PostgreSQL"
        return 1
    fi
}

# Backup Redis
backup_redis() {
    log "🔄 Début backup Redis..."
    
    local backup_file="$BACKUP_BASE_DIR/redis/redis_dump_$DATE.rdb"
    
    # Sauvegarde du dump Redis
    if redis-cli -h "$REDIS_HOST" BGSAVE > /dev/null 2>> "$LOG_FILE"; then
        # Attendre que le backup soit terminé
        while [ "$(redis-cli -h "$REDIS_HOST" LASTSAVE)" = "$(redis-cli -h "$REDIS_HOST" LASTSAVE)" ]; do
            sleep 1
        done
        
        # Copie du fichier dump
        if [ -f "/var/lib/redis/dump.rdb" ]; then
            cp "/var/lib/redis/dump.rdb" "$backup_file"
            gzip "$backup_file"
            
            local size=$(du -h "$backup_file.gz" | cut -f1)
            log "✅ Backup Redis compressé: $backup_file.gz ($size)"
            return 0
        else
            log "❌ Fichier dump Redis non trouvé"
            return 1
        fi
    else
        log "❌ Erreur backup Redis"
        return 1
    fi
}

# Backup des uploads
backup_uploads() {
    log "🔄 Début backup uploads..."
    
    local backup_file="$BACKUP_BASE_DIR/uploads/uploads_$DATE.tar.gz"
    
    if [ -d "$UPLOAD_PATH" ]; then
        # Création du tar.gz
        if tar -czf "$backup_file" -C "$(dirname "$UPLOAD_PATH")" "$(basename "$UPLOAD_PATH")" 2>> "$LOG_FILE"; then
            local size=$(du -h "$backup_file" | cut -f1)
            log "✅ Backup uploads créé: $backup_file ($size)"
            
            # Backup des métadonnées séparément
            if [ -f "$UPLOAD_PATH/metadata.json" ]; then
                cp "$UPLOAD_PATH/metadata.json" "$BACKUP_BASE_DIR/uploads/metadata_$DATE.json"
            fi
            
            return 0
        else
            log "❌ Erreur backup uploads"
            return 1
        fi
    else
        log "⚠️ Répertoire uploads non trouvé: $UPLOAD_PATH"
        return 1
    fi
}

# Backup de la configuration
backup_config() {
    log "🔄 Début backup configuration..."
    
    local config_backup_dir="$BACKUP_BASE_DIR/config/config_$DATE"
    mkdir -p "$config_backup_dir"
    
    # Backup des fichiers de configuration
    local config_files=(
        "/var/www/ytech/backend/.env"
        "/var/www/ytech/frontend/.env"
        "/etc/nginx/sites-available/ytech"
        "/etc/systemd/system/ytech-backend.service"
        "/etc/systemd/system/ytech-frontend.service"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$config_backup_dir/"
            log "✅ Config sauvegardée: $config_file"
        fi
    done
    
    # Compression du backup de config
    tar -czf "$config_backup_dir.tar.gz" -C "$(dirname "$config_backup_dir")" "$(basename "$config_backup_dir")"
    rm -rf "$config_backup_dir"
    
    log "✅ Backup configuration terminé"
}

# Nettoyage des anciens backups
cleanup_old_backups() {
    log "🧹 Nettoyage des anciens backups..."
    
    local deleted_count=0
    
    # Nettoyage PostgreSQL
    find "$BACKUP_BASE_DIR/postgresql" -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
    deleted_count=$((deleted_count + $(find "$BACKUP_BASE_DIR/postgresql" -name "*.gz" -mtime +$RETENTION_DAYS | wc -l)))
    
    # Nettoyage Redis
    find "$BACKUP_BASE_DIR/redis" -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
    deleted_count=$((deleted_count + $(find "$BACKUP_BASE_DIR/redis" -name "*.gz" -mtime +$RETENTION_DAYS | wc -l)))
    
    # Nettoyage Uploads
    find "$BACKUP_BASE_DIR/uploads" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
    deleted_count=$((deleted_count + $(find "$BACKUP_BASE_DIR/uploads" -name "*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)))
    
    # Nettoyage Configuration
    find "$BACKUP_BASE_DIR/config" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
    deleted_count=$((deleted_count + $(find "$BACKUP_BASE_DIR/config" -name "*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)))
    
    log "✅ Nettoyage terminé: $deleted_count fichiers supprimés"
}

# Vérification de l'intégrité des backups
verify_backups() {
    log "🔍 Vérification de l'intégrité des backups..."
    
    local errors=0
    
    # Vérification PostgreSQL
    local latest_pg_backup=$(find "$BACKUP_BASE_DIR/postgresql" -name "*.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "$latest_pg_backup" ]; then
        if gzip -t "$latest_pg_backup" 2>/dev/null; then
            log "✅ Backup PostgreSQL valide: $(basename "$latest_pg_backup")"
        else
            log "❌ Backup PostgreSQL corrompu: $(basename "$latest_pg_backup")"
            errors=$((errors + 1))
        fi
    fi
    
    # Vérification Redis
    local latest_redis_backup=$(find "$BACKUP_BASE_DIR/redis" -name "*.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "$latest_redis_backup" ]; then
        if gzip -t "$latest_redis_backup" 2>/dev/null; then
            log "✅ Backup Redis valide: $(basename "$latest_redis_backup")"
        else
            log "❌ Backup Redis corrompu: $(basename "$latest_redis_backup")"
            errors=$((errors + 1))
        fi
    fi
    
    # Vérification Uploads
    local latest_upload_backup=$(find "$BACKUP_BASE_DIR/uploads" -name "*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "$latest_upload_backup" ]; then
        if tar -tzf "$latest_upload_backup" >/dev/null 2>&1; then
            log "✅ Backup uploads valide: $(basename "$latest_upload_backup")"
        else
            log "❌ Backup uploads corrompu: $(basename "$latest_upload_backup")"
            errors=$((errors + 1))
        fi
    fi
    
    return $errors
}

# Génération du rapport de backup
generate_report() {
    local report_file="$BACKUP_BASE_DIR/backup_report_$DATE.json"
    
    local total_size=$(du -sb "$BACKUP_BASE_DIR" | cut -f1)
    local human_size=$(du -sh "$BACKUP_BASE_DIR" | cut -f1)
    
    local pg_count=$(find "$BACKUP_BASE_DIR/postgresql" -name "*.gz" | wc -l)
    local redis_count=$(find "$BACKUP_BASE_DIR/redis" -name "*.gz" | wc -l)
    local upload_count=$(find "$BACKUP_BASE_DIR/uploads" -name "*.tar.gz" | wc -l)
    local config_count=$(find "$BACKUP_BASE_DIR/config" -name "*.tar.gz" | wc -l)
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "total_size_bytes": $total_size,
    "total_size_human": "$human_size",
    "backup_counts": {
        "postgresql": $pg_count,
        "redis": $redis_count,
        "uploads": $upload_count,
        "config": $config_count
    },
    "retention_days": $RETENTION_DAYS,
    "backup_directory": "$BACKUP_BASE_DIR"
}
EOF
    
    log "📊 Rapport généré: $report_file"
}

# Fonction principale
main() {
    log "🚀 Début du backup YTECH - $DATE"
    
    # Vérification de l'espace disque
    if ! check_disk_space; then
        log "❌ Espace disque insuffisant, arrêt du backup"
        exit 1
    fi
    
    local success_count=0
    local total_count=4
    
    # Exécution des backups
    if backup_postgresql; then
        success_count=$((success_count + 1))
    fi
    
    if backup_redis; then
        success_count=$((success_count + 1))
    fi
    
    if backup_uploads; then
        success_count=$((success_count + 1))
    fi
    
    if backup_config; then
        success_count=$((success_count + 1))
    fi
    
    # Nettoyage
    cleanup_old_backups
    
    # Vérification
    verify_backups
    
    # Rapport
    generate_report
    
    # Bilan
    if [ $success_count -eq $total_count ]; then
        log "✅ Backup terminé avec succès: $success_count/$total_count"
        exit 0
    else
        log "⚠️ Backup partiel: $success_count/$total_count"
        exit 1
    fi
}

# Exécution
main "$@"
