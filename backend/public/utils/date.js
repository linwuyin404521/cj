class DateUtils {
  /**
   * 获取当前时间戳
   * @returns {number}
   */
  static getTimestamp() {
    return Date.now();
  }

  /**
   * 格式化时间戳
   * @param {number} timestamp - 时间戳
   * @returns {string}
   */
  static formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN');
  }

  /**
   * 计算日期差
   * @param {Date} date1 - 日期1
   * @param {Date} date2 - 日期2
   * @returns {Object}
   */
  static dateDiff(date1, date2) {
    const diff = Math.abs(date1 - date2);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  }

  /**
   * 检查日期是否过期
   * @param {Date} expiryDate - 过期日期
   * @returns {boolean}
   */
  static isExpired(expiryDate) {
    return new Date() > new Date(expiryDate);
  }

  /**
   * 添加天数
   * @param {Date} date - 原始日期
   * @param {number} days - 添加的天数
   * @returns {Date}
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

module.exports = DateUtils;