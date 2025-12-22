#!/bin/bash
# scripts/monitor.sh

# 检查服务状态
check_service() {
    local service=$1
    local port=$2
    
    if docker-compose ps $service | grep -q "Up"; then
        echo "✅ $service 运行正常"
        return 0
    else
        echo "❌ $service 服务异常"
        return 1
    fi
}

# 检查端口
check_port() {
    local host=$1
    local port=$2
    
    if nc -z $host $port > /dev/null 2>&1; then
        echo "✅ 端口 $port 可访问"
        return 0
    else
        echo "❌ 端口 $port 不可访问"
        return 1
    fi
}

# 检查磁盘空间
check_disk() {
    local threshold=80
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $usage -ge $threshold ]; then
        echo "⚠️  磁盘空间不足: $usage%"
        return 1
    else
        echo "✅ 磁盘空间正常: $usage%"
        return 0
    fi
}

# 检查内存
check_memory() {
    local threshold=90
    local usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ $usage -ge $threshold ]; then
        echo "⚠️  内存使用率高: $usage%"
        return 1
    else
        echo "✅ 内存使用正常: $usage%"
        return 0
    fi
}

# 主监控逻辑
echo "📊 抽奖系统监控检查 $(date)"
echo "=============================="

# 检查服务
check_service mongodb 27017
check_service backend 3000
check_service frontend 80
check_service nginx 80

echo "---"

# 检查端口
check_port localhost 27017
check_port localhost 3000
check_port localhost 80

echo "---"

# 检查系统资源
check_disk
check_memory

echo "=============================="
echo "监控检查完成"