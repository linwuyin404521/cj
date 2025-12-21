//认证中间件
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    // 从请求头获取token
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // 如果header中没有，尝试从cookie中获取
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      throw new Error('未提供认证令牌');
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findOne({ 
      _id: decoded.userId,
      status: 'active'
    });
    
    if (!user) {
      throw new Error('用户不存在或已被禁用');
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    req.token = token;
    next();
    
  } catch (error) {
    logger.warn('认证失败:', error.message);
    
    // JWT特定错误处理
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }
    
    res.status(401).json({
      success: false,
      message: '请先登录'
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足，需要管理员权限'
        });
      }
      next();
    });
  } catch (error) {
    next(error);
  }
};

// 可选认证（如果用户登录了则获取用户信息，没登录也可以继续）
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ 
        _id: decoded.userId,
        status: 'active'
      });
      
      if (user) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // 认证失败不影响后续流程
    next();
  }
};

module.exports = { auth, adminAuth, optionalAuth };