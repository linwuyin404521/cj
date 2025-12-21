//验证中间件
const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  };
};

// 用户验证
const validateUser = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('姓名不能为空')
    .isLength({ min: 2, max: 50 }).withMessage('姓名长度应为2-50个字符'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('手机号不能为空')
    .matches(/^1[3-9]\d{9}$/).withMessage('请输入有效的手机号'),
  
  body('email')
    .optional()
    .isEmail().withMessage('请输入有效的邮箱地址'),
  
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('密码至少6个字符')
]);

// 手机号验证
const validatePhone = validate([
  body('phone')
    .trim()
    .notEmpty().withMessage('手机号不能为空')
    .matches(/^1[3-9]\d{9}$/).withMessage('请输入有效的手机号')
]);

// 抽奖参数验证
const validateDraw = validate([
  body('phone').trim().notEmpty().withMessage('手机号不能为空'),
  body('activityId').optional().isMongoId().withMessage('活动ID格式错误')
]);

// 分页参数验证
const validatePagination = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
]);

// MongoDB ID验证
const validateMongoId = (paramName) => validate([
  param(paramName).isMongoId().withMessage('ID格式错误')
]);

module.exports = {
  validateUser,
  validatePhone,
  validateDraw,
  validatePagination,
  validateMongoId,
  validate
};