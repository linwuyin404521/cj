#!/bin/bash

# 数据库备份脚本
set -e

BACKUP_DIR="mongodb/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

echo "📦 开始备份数据库..."

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
docker-compose -f docker/docker-compose.yml exec mongodb \
    mongodump --username $MONGO_ROOT_USER --password $MONGO_ROOT_PASSWORD \
    --authenticationDatabase admin --db lottery_system \
    --out /backup/$DATE

# 压缩备份文件
docker-compose -f docker/docker-compose.yml exec mongodb \
    tar -czf /backup/backup_$DATE.tar.gz -C /backup/$DATE .

# 清理临时文件
docker-compose -f docker/docker-compose.yml exec mongodb \
    rm -rf /backup/$DATE

echo "✅ 备份完成: $BACKUP_FILE"

# 删除7天前的备份
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "🗑️  已清理7天前的备份"