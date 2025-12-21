//路由文件-用户路由
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateUser, validatePhone, validatePagination } = require('../middlewares/validation');
const { auth, adminAuth } = require('../middlewares/auth');

/**
 * @route   POST /api/users/save
 * @desc    创建或更新用户信息（免登录）
 * @access  Public
 */
router.post(
  '/save',
  validateUser,
  userController.createOrUpdateUser
);

/**
 * @route   GET /api/users/me
 * @desc    获取当前登录用户信息
 * @access  Private
 */
router.get('/me', auth, userController.getMe);

/**
 * @route   GET /api/users/:phone
 * @desc    根据手机号获取用户信息
 * @access  Public
 */
router.get(
  '/:phone',
  validate([
    require('express-validator').param('phone').isMobilePhone('zh-CN').withMessage('手机号格式错误')
  ]),
  userController.getUserByPhone
);

/**
 * @route   GET /api/users/:phone/records
 * @desc    获取用户抽奖记录
 * @access  Public
 */
router.get(
  '/:phone/records',
  validate([
    require('express-validator').param('phone').isMobilePhone('zh-CN').withMessage('手机号格式错误')
  ]),
  validatePagination,
  userController.getUserRecords
);

/**
 * @route   GET /api/users/ranking
 * @desc    获取用户排行榜
 * @access  Public
 */
router.get('/ranking', validatePagination, userController.getUserRanking);

/**
 * @route   GET /api/users
 * @desc    获取用户列表（管理员）
 * @access  Private (Admin)
 */
router.get(
  '/',
  adminAuth,
  validatePagination,
  userController.getAllUsers
);

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户信息（管理员）
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('用户ID格式错误')
  ]),
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户（管理员）
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('用户ID格式错误')
  ]),
  userController.deleteUser
);

/**
 * @route   PUT /api/users/:id/status
 * @desc    更新用户状态（管理员）
 * @access  Private (Admin)
 */
router.put(
  '/:id/status',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('用户ID格式错误'),
    require('express-validator').body('status')
      .isIn(['active', 'inactive', 'blocked'])
      .withMessage('状态值无效')
  ]),
  userController.updateUserStatus
);

/**
 * @route   POST /api/users/:id/reset-daily-draws
 * @desc    重置用户每日抽奖次数（管理员）
 * @access  Private (Admin)
 */
router.post(
  '/:id/reset-daily-draws',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('用户ID格式错误')
  ]),
  userController.resetUserDailyDraws
);

/**
 * @route   GET /api/users/:id/stats
 * @desc    获取用户详细统计信息（管理员）
 * @access  Private (Admin)
 */
router.get(
  '/:id/stats',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('用户ID格式错误')
  ]),
  userController.getUserDetailedStats
);

/**
 * @route   GET /api/users/search
 * @desc    搜索用户（管理员）
 * @access  Private (Admin)
 */
router.get(
  '/search',
  adminAuth,
  validate([
    require('express-validator').query('keyword').notEmpty().withMessage('搜索关键词不能为空')
  ]),
  userController.searchUsers
);

module.exports = router;