const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendSMS, verifySMSCode } = require('../utils/smsService');

// 验证码存储（生产环境应使用Redis）
const verificationCodes = new Map();

class AuthController {
  /**
   * 用户注册
   */
  async register(req, res) {
    try {
      const { name, phone, email, password } = req.body;
      
      // 检查用户是否已存在
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该手机号已注册'
        });
      }
      
      // 创建新用户
      const user = new User({
        name,
        phone,
        email,
        password,
        role: phone === '13800138000' ? 'admin' : 'user' // 示例：特定号码为管理员
      });
      
      await user.save();
      
      // 生成JWT令牌
      const token = this.generateToken(user._id, user.role);
      
      // 记录日志
      logger.info(`用户注册成功: ${phone}`, {
        userId: user._id,
        phone: user.phone,
        name: user.name
      });
      
      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            points: user.points,
            level: user.level
          },
          token
        }
      });
      
    } catch (error) {
      logger.error('用户注册失败:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: '该手机号已注册'
        });
      }
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: '注册失败，请稍后重试'
      });
    }
  }
  
  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { phone, password } = req.body;
      
      // 查找用户（包含密码字段）
      const user = await User.findOne({ phone }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 验证密码
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
      
      // 检查用户状态
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '账户已被禁用'
        });
      }
      
      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();
      
      // 生成JWT令牌
      const token = this.generateToken(user._id, user.role);
      
      // 记录登录日志
      logger.info(`用户登录成功: ${phone}`, {
        userId: user._id,
        ip: req.ip
      });
      
      res.status(200).json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            points: user.points,
            level: user.level,
            totalDraws: user.totalDraws,
            totalWins: user.totalWins,
            winRate: user.winRate
          },
          token
        }
      });
      
    } catch (error) {
      logger.error('用户登录失败:', error);
      res.status(500).json({
        success: false,
        message: '登录失败'
      });
    }
  }
  
  /**
   * 手机号免密登录（发送验证码）
   */
  async phoneLogin(req, res) {
    try {
      const { phone } = req.body;
      
      // 检查用户是否存在
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在，请先注册'
        });
      }
      
      // 生成验证码（6位数字）
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 存储验证码（有效期10分钟）
      verificationCodes.set(phone, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0 // 尝试次数
      });
      
      // 发送短信验证码（模拟）
      if (process.env.NODE_ENV === 'production') {
        // 实际发送短信
        // await sendSMS(phone, `您的验证码是：${code}，10分钟内有效`);
      } else {
        // 开发环境直接返回验证码
        logger.info(`验证码 ${code} 已发送到 ${phone}（开发模式）`);
      }
      
      res.status(200).json({
        success: true,
        message: '验证码已发送',
        data: {
          phone,
          expiresIn: 600, // 10分钟，单位秒
          // 开发环境返回验证码
          ...(process.env.NODE_ENV !== 'production' && { code })
        }
      });
      
    } catch (error) {
      logger.error('发送验证码失败:', error);
      res.status(500).json({
        success: false,
        message: '发送验证码失败'
      });
    }
  }
  
  /**
   * 验证验证码
   */
  async verifyCode(req, res) {
    try {
      const { phone, code } = req.body;
      
      // 获取存储的验证码
      const storedCode = verificationCodes.get(phone);
      
      if (!storedCode) {
        return res.status(400).json({
          success: false,
          message: '验证码不存在或已过期'
        });
      }
      
      // 检查是否过期
      if (Date.now() > storedCode.expiresAt) {
        verificationCodes.delete(phone);
        return res.status(400).json({
          success: false,
          message: '验证码已过期'
        });
      }
      
      // 检查尝试次数
      if (storedCode.attempts >= 5) {
        verificationCodes.delete(phone);
        return res.status(400).json({
          success: false,
          message: '验证码尝试次数过多'
        });
      }
      
      // 验证验证码
      if (storedCode.code !== code) {
        storedCode.attempts += 1;
        verificationCodes.set(phone, storedCode);
        
        return res.status(400).json({
          success: false,
          message: '验证码错误',
          data: {
            remainingAttempts: 5 - storedCode.attempts
          }
        });
      }
      
      // 验证成功，删除验证码
      verificationCodes.delete(phone);
      
      // 查找用户
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();
      
      // 生成JWT令牌
      const token = this.generateToken(user._id, user.role);
      
      logger.info(`验证码登录成功: ${phone}`);
      
      res.status(200).json({
        success: true,
        message: '验证成功',
        data: {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            points: user.points,
            level: user.level
          },
          token
        }
      });
      
    } catch (error) {
      logger.error('验证码验证失败:', error);
      res.status(500).json({
        success: false,
        message: '验证失败'
      });
    }
  }
  
  /**
   * 获取当前用户信息
   */
  async getProfile(req, res) {
    try {
      // 用户信息已在auth中间件中添加到req.user
      const user = req.user;
      
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            points: user.points,
            level: user.level,
            totalDraws: user.totalDraws,
            totalWins: user.totalWins,
            winRate: user.winRate,
            todayDraws: user.todayDraws,
            createdAt: user.createdAt
          }
        }
      });
      
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }
  
  /**
   * 更新用户信息
   */
  async updateProfile(req, res) {
    try {
      const user = req.user;
      const { name, email } = req.body;
      
      // 更新字段
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      
      await user.save();
      
      logger.info(`用户信息更新: ${user.phone}`);
      
      res.status(200).json({
        success: true,
        message: '信息更新成功',
        data: {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email
          }
        }
      });
      
    } catch (error) {
      logger.error('更新用户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '更新失败'
      });
    }
  }
  
  /**
   * 修改密码
   */
  async changePassword(req, res) {
    try {
      const user = req.user;
      const { currentPassword, newPassword } = req.body;
      
      // 验证当前密码
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '当前密码错误'
        });
      }
      
      // 更新密码
      user.password = newPassword;
      await user.save();
      
      logger.info(`用户修改密码: ${user.phone}`);
      
      res.status(200).json({
        success: true,
        message: '密码修改成功'
      });
      
    } catch (error) {
      logger.error('修改密码失败:', error);
      res.status(500).json({
        success: false,
        message: '修改密码失败'
      });
    }
  }
  
  /**
   * 刷新访问令牌
   */
  async refreshToken(req, res) {
    try {
      const user = req.user;
      
      // 生成新的JWT令牌
      const token = this.generateToken(user._id, user.role);
      
      res.status(200).json({
        success: true,
        message: '令牌刷新成功',
        data: { token }
      });
      
    } catch (error) {
      logger.error('刷新令牌失败:', error);
      res.status(500).json({
        success: false,
        message: '刷新令牌失败'
      });
    }
  }
  
  /**
   * 用户登出
   */
  async logout(req, res) {
    try {
      const user = req.user;
      
      logger.info(`用户登出: ${user.phone}`);
      
      // 在实际应用中，这里可以加入令牌黑名单机制
      
      res.status(200).json({
        success: true,
        message: '登出成功'
      });
      
    } catch (error) {
      logger.error('用户登出失败:', error);
      res.status(500).json({
        success: false,
        message: '登出失败'
      });
    }
  }
  
  /**
   * 生成JWT令牌
   */
  generateToken(userId, role = 'user') {
    const payload = {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  }
}

module.exports = new AuthController();