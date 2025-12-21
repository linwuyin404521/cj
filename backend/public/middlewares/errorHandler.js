//错误处理中间件
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // 记录错误
  logger.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  // 默认错误响应
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  // 生产环境隐藏错误详情
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? '服务器内部错误' 
      : message
  };
  
  // 开发环境添加错误详情
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }
  
  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    errorResponse.message = messages.join(', ');
    errorResponse.errors = err.errors;
  }
  
  // Mongoose重复键错误
  if (err.code === 11000) {
    errorResponse.message = '数据已存在';
    errorResponse.field = Object.keys(err.keyPattern)[0];
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Token无效';
  }
  
  if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token已过期';
  }
  
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;