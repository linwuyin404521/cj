const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');

// 加载环境变量
dotenv.config();

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const lotteryRoutes = require('./routes/lottery');
const recordRoutes = require('./routes/record');
const prizeRoutes = require('./routes/prize');
const adminRoutes = require('./routes/admin');

// 导入中间件
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet()); // 安全HTTP头
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression()); // 压缩响应
app.use(mongoSanitize()); // 防止NoSQL注入
app.use(xss()); // 防止XSS攻击

// 请求解析中间件
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/prizes', prizeRoutes);
app.use('/api/admin', adminRoutes);

// 404处理
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `无法找到 ${req.originalUrl}`
  });
});

// 错误处理中间件
app.use(errorHandler);

// 数据库连接
const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('✅ MongoDB连接成功');
  } catch (error) {
    logger.error('❌ MongoDB连接失败:', error.message);
    process.exit(1);
  }
};

// 启动服务器
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`🚀 服务器运行在 http://localhost:${PORT}`);
      logger.info(`📊 环境: ${process.env.NODE_ENV}`);
      logger.info(`📝 健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

// 优雅关闭
const shutdown = async () => {
  logger.info('正在关闭服务器...');
  await mongoose.connection.close();
  logger.info('MongoDB连接已关闭');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// 启动应用
if (require.main === module) {
  startServer();
}

module.exports = app; // 用于测试