#!/bin/bash

# 系统监控脚本
set -e

echo "📊 系统监控报告"
echo "================"

# 检查服务状态
echo "🔍 服务状态:"
docker-compose -f docker/docker-compose.yml ps

echo -e "\n📈 资源使用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo -e "\n🗄️  数据库状态:"
docker-compose -f docker/docker-compose.yml exec mongodb \
    mongosh --username $MONGO_ROOT_USER --password $MONGO_ROOT_PASSWORD \
    --authenticationDatabase admin --eval "
    db = db.getSiblingDB('lottery_system');
    print('用户数量:', db.users.countDocuments());
    print('奖品数量:', db.prizes.countDocuments());
    print('抽奖记录:', db.lotteryrecords.countDocuments());
    print('今日抽奖:', db.lotteryrecords.countDocuments({
        spinDate: { \$gte: new Date(new Date().setHours(0,0,0,0)) }
    }));
    "

echo -e "\n🌐 Nginx 访问日志统计:"
docker-compose -f docker/docker-compose.yml logs --tail=100 nginx | \
    grep -E '"GET|"POST' | \
    awk '{print \$1}' | \
    sort | uniq -c | sort -rn | head -10

echo -e "\n🔄 最近错误:"
docker-compose -f docker/docker-compose.yml logs --tail=50 | grep -i error | tail -10

echo -e "\n💾 磁盘使用:"
df -h | grep -E "Filesystem|/dev/"