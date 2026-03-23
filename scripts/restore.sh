#!/bin/bash

# ===============================================
# 🗄️ YTECH RESTORE SCRIPT
# ===============================================

# Configuration
BACKUP_BASE_DIR="/var/backups/ytech"
LOG_FILE="/var/log/ytech-restore.log"

# Configuration depuis les variables d'environnement
DB_HOST=${DB_HOST:-"10.10.10.3"}
DB_USER=${DB_USER:-"ytech_user"}
DB_PASSWORD=${DB_PASSWORD:-"YtechDb2026"}
DB_NAME=${DB_NAME:-"ytech_db"}
UPLOAD_PATH=${UPLOAD_PATH:-"/var/www/ytech/uploads"}
REDIS_HOST=${REDIS_HOST:-"localhost"}

# Création du répertoire de logs
mkdir -p "$(dirname "$LOG_FILE")"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction de sélection de backup
select_backup() {
    local backup_type=$1
    local backup_dir="$BACKUP_BASE_DIR/$backup_type"
    
    echo "Backups disponibles pour $backup_type:"
    local i=1
    local backups=()
    
    while IFS= read -r -d '' backup; do
        backups+=("$backup")
        echo "  $i) $(basename "$backup") ($(stat -c %y "$backup" | cut -d' ' -f1-2))"
        i=$((i + 1))
    done < <(find "$backup_dir" -name "*.gz" -o -name "*.tar.gz" | sort -z)
    
    if [ ${#backups[@]} -eq 0 ]; then
        log "❌ Aucun backup trouvé pour $backup_type"
        return 1
    fi
    
    read -p "Sélectionnez un backup (1-${#backups[@]}): " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#backups[@]} ]; then
        echo "${backups[$((choice - 1))]}"
        return 0
    else
        log "❌ Sélection invalide"
        return 1
    fi
}

# Restore PostgreSQL
restore_postgresql() {
    log "🔄 Début restore PostgreSQL..."
    
    local backup_file=$(select_backup "postgresql")
    if [ $? -ne 0 ] || [ -z "$backup_file" ]; then
        return 1
    fi
    
    log "📁 Backup sélectionné: $(basename "$backup_file")"
    
    # Confirmation
    read -p "⚠️  Ceci remplacera complètement la base de données. Continuer? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "❌ Restore annulé"
        return 1
    fi
    
    # Décompression
    local temp_file="/tmp/restore_$(basename "$backup_file" .gz).sql"
    if ! gunzip -c "$backup_file" > "$temp_file"; then
        log "❌ Erreur décompression backup PostgreSQL"
        return 1
    fi
    
    # Arrêt des services qui utilisent la base de données
    log "⏸️  Arrêt des services..."
    systemctl stop ytech-backend
    
    # Suppression de la base de données existante
    log "🗑️  Suppression de la base de données existante..."
    PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>> "$LOG_FILE"
    
    # Création de la base de données
    log "🆕 Création de la base de données..."
    PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>> "$LOG_FILE"
    
    # Restore des données
    log "📥 Importation des données..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$temp_file" 2>> "$LOG_FILE"; then
        log "✅ Restore PostgreSQL terminé avec succès"
        
        # Nettoyage
        rm -f "$temp_file"
        
        # Redémarrage des services
        log "🔄 Redémarrage des services..."
        systemctl start ytech-backend
        
        return 0
    else
        log "❌ Erreur restore PostgreSQL"
        
        # Nettoyage
        rm -f "$temp_file"
        
        return 1
    fi
}

# Restore Redis
restore_redis() {
    log "🔄 Début restore Redis..."
    
    local backup_file=$(select_backup "redis")
    if [ $? -ne 0 ] || [ -z "$backup_file" ]; then
        return 1
    fi
    
    log "📁 Backup sélectionné: $(basename "$backup_file")"
    
    # Confirmation
    read -p "⚠️  Ceci remplacera toutes les sessions Redis. Continuer? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "❌ Restore annulé"
        return 1
    fi
    
    # Décompression
    local temp_file="/tmp/restore_$(basename "$backup_file" .gz).rdb"
    if ! gunzip -c "$backup_file" > "$temp_file"; then
        log "❌ Erreur décompression backup Redis"
        return 1
    fi
    
    # Arrêt de Redis
    log "⏸️  Arrêt de Redis..."
    systemctl stop redis
    
    # Backup du fichier dump actuel
    if [ -f "/var/lib/redis/dump.rdb" ]; then
        cp "/var/lib/redis/dump.rdb" "/var/lib/redis/dump.rdb.backup.$(date +%s)"
    fi
    
    # Copie du fichier restore
    log "📥 Copie du fichier dump..."
    if cp "$temp_file" "/var/lib/redis/dump.rdb"; then
        # Correction des permissions
        chown redis:redis "/var/lib/redis/dump.rdb"
        chmod 644 "/var/lib/redis/dump.rdb"
        
        # Redémarrage de Redis
        log "🔄 Redémarrage de Redis..."
        systemctl start redis
        
        # Vérification
        sleep 2
        if redis-cli -h "$REDIS_HOST" ping > /dev/null 2>&1; then
            log "✅ Restore Redis terminé avec succès"
            
            # Nettoyage
            rm -f "$temp_file"
            
            return 0
        else
            log "❌ Redis ne répond pas après le restore"
            return 1
        fi
    else
        log "❌ Erreur copie fichier dump Redis"
        return 1
    fi
}

# Restore des uploads
restore_uploads() {
    log "🔄 Début restore uploads..."
    
    local backup_file=$(select_backup "uploads")
    if [ $? -ne 0 ] || [ -z "$backup_file" ]; then
        return 1
    fi
    
    log "📁 Backup sélectionné: $(basename "$backup_file")"
    
    # Confirmation
    read -p "⚠️  Ceci remplacera tous les fichiers uploadés. Continuer? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "❌ Restore annulé"
        return 1
    fi
    
    # Backup du répertoire actuel
    if [ -d "$UPLOAD_PATH" ]; then
        mv "$UPLOAD_PATH" "$UPLOAD_PATH.backup.$(date +%s)"
    fi
    
    # Recréation du répertoire
    mkdir -p "$UPLOAD_PATH"
    
    # Extraction
    log "📥 Extraction des fichiers..."
    if tar -xzf "$backup_file" -C "$(dirname "$UPLOAD_PATH")"; then
        log "✅ Restore uploads terminé avec succès"
        
        # Correction des permissions
        chown -R www-data:www-data "$UPLOAD_PATH"
        chmod -R 755 "$UPLOAD_PATH"
        
        # Restore des métadonnées si disponible
        local metadata_file=$(find "$BACKUP_BASE_DIR/uploads" -name "metadata_*.json" | sort | tail -1)
        if [ -n "$metadata_file" ] && [ -f "$metadata_file" ]; then
            cp "$metadata_file" "$UPLOAD_PATH/metadata.json"
            log "✅ Métadonnées restaurées"
        fi
        
        return 0
    else
        log "❌ Erreur extraction uploads"
        return 1
    fi
}

# Restore de la configuration
restore_config() {
    log "🔄 Début restore configuration..."
    
    local backup_file=$(select_backup "config")
    if [ $? -ne 0 ] || [ -z "$backup_file" ]; then
        return 1
    fi
    
    log "📁 Backup sélectionné: $(basename "$backup_file")"
    
    # Confirmation
    read -p "⚠️  Ceci remplacera les fichiers de configuration. Continuer? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "❌ Restore annulé"
        return 1
    fi
    
    # Extraction temporaire
    local temp_dir="/tmp/config_restore_$(date +%s)"
    mkdir -p "$temp_dir"
    
    if tar -xzf "$backup_file" -C "$temp_dir"; then
        # Restore des fichiers de configuration
        local config_dir="$temp_dir/$(basename "$temp_dir" .tar.gz)"
        
        # Backup des configs actuelles
        local config_backup_dir="/etc/ytech/config.backup.$(date +%s)"
        mkdir -p "$config_backup_dir"
        
        # Restore .env files
        if [ -f "$config_dir/.env" ]; then
            cp "/var/www/ytech/backend/.env" "$config_backup_dir/backend.env.backup"
            cp "$config_dir/.env" "/var/www/ytech/backend/.env"
            log "✅ Backend .env restauré"
        fi
        
        if [ -f "$config_dir/frontend.env" ]; then
            cp "/var/www/ytech/frontend/.env" "$config_backup_dir/frontend.env.backup"
            cp "$config_dir/frontend.env" "/var/www/ytech/frontend/.env"
            log "✅ Frontend .env restauré"
        fi
        
        # Restore Nginx config
        if [ -f "$config_dir/ytech" ]; then
            cp "/etc/nginx/sites-available/ytech" "$config_backup_dir/ytech.backup"
            cp "$config_dir/ytech" "/etc/nginx/sites-available/ytech"
            nginx -t && systemctl reload nginx
            log "✅ Configuration Nginx restaurée"
        fi
        
        # Restore services systemd
        if [ -f "$config_dir/ytech-backend.service" ]; then
            cp "$config_dir/ytech-backend.service" "/etc/systemd/system/"
            systemctl daemon-reload
            log "✅ Service backend restauré"
        fi
        
        if [ -f "$config_dir/ytech-frontend.service" ]; then
            cp "$config_dir/ytech-frontend.service" "/etc/systemd/system/"
            systemctl daemon-reload
            log "✅ Service frontend restauré"
        fi
        
        log "✅ Restore configuration terminé avec succès"
        
        # Nettoyage
        rm -rf "$temp_dir"
        
        return 0
    else
        log "❌ Erreur extraction configuration"
        return 1
    fi
}

# Restore complet
restore_full() {
    log "🔄 Début restore complet..."
    
    # Confirmation
    read -p "⚠️  Ceci remplacera TOUTES les données. Continuer? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "❌ Restore annulé"
        return 1
    fi
    
    local success_count=0
    local total_count=4
    
    # Restore dans l'ordre: config -> postgresql -> redis -> uploads
    if restore_config; then
        success_count=$((success_count + 1))
    fi
    
    if restore_postgresql; then
        success_count=$((success_count + 1))
    fi
    
    if restore_redis; then
        success_count=$((success_count + 1))
    fi
    
    if restore_uploads; then
        success_count=$((success_count + 1))
    fi
    
    # Bilan
    if [ $success_count -eq $total_count ]; then
        log "✅ Restore complet terminé avec succès: $success_count/$total_count"
        
        # Redémarrage de tous les services
        log "🔄 Redémarrage complet des services..."
        systemctl restart ytech-backend
        systemctl restart ytech-frontend
        systemctl restart nginx
        systemctl restart redis
        
        return 0
    else
        log "⚠️ Restore partiel: $success_count/$total_count"
        return 1
    fi
}

# Menu principal
main() {
    log "🚀 Démarrage du restore YTECH"
    
    echo "==============================================="
    echo "🗄️ YTECH RESTORE SCRIPT"
    echo "==============================================="
    echo "1) Restore PostgreSQL"
    echo "2) Restore Redis"
    echo "3) Restore Uploads"
    echo "4) Restore Configuration"
    echo "5) Restore Complet (TOUT)"
    echo "0) Quitter"
    echo "==============================================="
    
    read -p "Choisissez une option: " choice
    
    case $choice in
        1)
            restore_postgresql
            ;;
        2)
            restore_redis
            ;;
        3)
            restore_uploads
            ;;
        4)
            restore_config
            ;;
        5)
            restore_full
            ;;
        0)
            log "👋 Au revoir"
            exit 0
            ;;
        *)
            log "❌ Option invalide"
            exit 1
            ;;
    esac
}

# Exécution
main "$@"
