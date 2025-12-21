//
const winston = require('winston');//日志工具
const path = require('path');

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'lottery-api' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    // 错误日志文件
    new winston.transports.File({ 
      filename: path.join('logs', 'error.log'), 
      level: 'error' 
    }),
    // 所有日志文件
    new winston.transports.File({ 
      filename: path.join('logs', 'combined.log') 
    })
  ]
});

// 如果是开发环境，也输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;