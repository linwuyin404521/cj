#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backup/lottery"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$DATE"

echo "💾 开始备份抽奖系统数据..."

# 创建备份目录
mkdir -p $BACKUP_PATH

# 1. 备份MongoDB
echo "备份MongoDB..."
docker-compose exec -T mongodb mongodump \
  --uri="mongodb://admin:$MONGO_ROOT_PASSWORD@localhost:27017/lottery" \
  --out=/tmp/backup
docker cp lottery-mongodb:/tmp/backup $BACKUP_PATH/mongodb

# 2. 备份配置文件
echo "备份配置文件..."
cp -r nginx $BACKUP_PATH/
cp -r docker $BACKUP_PATH/
cp docker-compose.yml $BACKUP_PATH/
cp .env $BACKUP_PATH/

# 3. 备份前端构建
echo "备份前端..."
cp -r frontend/dist $BACKUP_PATH/frontend_dist

# 4. 压缩备份
echo "压缩备份..."
tar -czf $BACKUP_PATH.tar.gz -C $BACKUP_PATH .

# 5. 清理临时文件
rm -rf $BACKUP_PATH

# 6. 删除7天前的备份
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "✅ 备份完成: $BACKUP_PATH.tar.gz"