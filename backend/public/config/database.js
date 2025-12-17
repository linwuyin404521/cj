const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connect();
  }

  async connect() {
    try {
      const mongoURI = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_TEST_URI 
        : process.env.MONGODB_URI;
      
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      // 连接事件监听
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB连接已建立');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB连接错误:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB连接断开');
      });

      // 进程退出时关闭连接
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB连接已关闭');
        process.exit(0);
      });

    } catch (error) {
      logger.error('MongoDB连接失败:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB连接已关闭');
    } catch (error) {
      logger.error('关闭MongoDB连接失败:', error);
    }
  }
}

module.exports = new Database();