//工具文件-验证工具
const validator = require('validator');

class CustomValidator {
  /**
   * 验证手机号
   */
  static isPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }
  
  /**
   * 验证身份证号
   */
  static isIdCard(idCard) {
    // 简单的身份证验证，实际应该更严格
    return /^\d{17}[\dXx]$/.test(idCard);
  }
  
  /**
   * 验证金额
   */
  static isMoney(amount) {
    return /^\d+(\.\d{1,2})?$/.test(amount) && parseFloat(amount) >= 0;
  }
  
  /**
   * 验证概率
   */
  static isProbability(prob) {
    const num = parseFloat(prob);
    return !isNaN(num) && num >= 0 && num <= 100;
  }
  
  /**
   * 验证颜色代码
   */
  static isColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || 
           ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray'].includes(color.toLowerCase());
  }
  
  /**
   * 验证日期范围
   */
  static isDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  }
  
  /**
   * 验证对象是否包含必需字段
   */
  static hasRequiredFields(obj, requiredFields) {
    if (!obj || typeof obj !== 'object') return false;
    
    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 验证数组是否包含有效元素
   */
  static isValidArray(arr, minLength = 0, maxLength = Infinity) {
    if (!Array.isArray(arr)) return false;
    if (arr.length < minLength || arr.length > maxLength) return false;
    return true;
  }
}

module.exports = CustomValidator;