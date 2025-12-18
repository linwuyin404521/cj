const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validation');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post(
  '/register',
  validate([
    require('express-validator').body('name').notEmpty().withMessage('姓名不能为空'),
    require('express-validator').body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    require('express-validator').body('password').isLength({ min: 6 }).withMessage('密码至少6位')
  ]),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post(
  '/login',
  validate([
    require('express-validator').body('phone').notEmpty().withMessage('手机号不能为空'),
    require('express-validator').body('password').notEmpty().withMessage('密码不能为空')
  ]),
  authController.login
);

/**
 * @route   POST /api/auth/phone-login
 * @desc    手机号登录（免密登录）
 * @access  Public
 */
router.post(
  '/phone-login',
  validate([
    require('express-validator').body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号')
  ]),
  authController.phoneLogin
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', require('../middlewares/auth').auth, authController.getMe);

/**
 * @route   PUT /api/auth/update-password
 * @desc    修改密码
 * @access  Private
 */
router.put(
  '/update-password',
  require('../middlewares/auth').auth,
  validate([
    require('express-validator').body('oldPassword').notEmpty().withMessage('原密码不能为空'),
    require('express-validator').body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位')
  ]),
  authController.updatePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', require('../middlewares/auth').auth, authController.logout);

/**
 * @route   POST /api/auth/send-verification
 * @desc    发送验证码
 * @access  Public
 */
router.post(
  '/send-verification',
  validate([
    require('express-validator').body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    require('express-validator').body('type')
      .isIn(['register', 'login', 'reset-password'])
      .withMessage('验证码类型无效')
  ]),
  authController.sendVerificationCode
);

/**
 * @route   POST /api/auth/verify-code
 * @desc    验证验证码
 * @access  Public
 */
router.post(
  '/verify-code',
  validate([
    require('express-validator').body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    require('express-validator').body('code').isLength({ min: 4, max: 6 }).withMessage('验证码格式错误'),
    require('express-validator').body('type')
      .isIn(['register', 'login', 'reset-password'])
      .withMessage('验证码类型无效')
  ]),
  authController.verifyCode
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    重置密码
 * @access  Public
 */
router.post(
  '/reset-password',
  validate([
    require('express-validator').body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    require('express-validator').body('code').notEmpty().withMessage('验证码不能为空'),
    require('express-validator').body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位')
  ]),
  authController.resetPassword
);

module.exports = router;