/**
 * 抽奖算法
 */
class LotteryAlgorithm {
  /**
   * 根据权重随机选择奖品
   * @param {Array} prizes - 奖品数组，每个奖品需要有probability属性
   * @returns {Object} 选中的奖品
   */
  static randomSelectByWeight(prizes) {
    if (!prizes || prizes.length === 0) {
      throw new Error('奖品列表不能为空');
    }
    
    // 计算总权重
    const totalWeight = prizes.reduce((sum, prize) => {
      const weight = prize.probability || prize.weight || 1;
      return sum + weight;
    }, 0);
    
    // 生成随机数
    const random = Math.random() * totalWeight;
    
    // 根据权重选择奖品
    let cumulativeWeight = 0;
    for (const prize of prizes) {
      const weight = prize.probability || prize.weight || 1;
      cumulativeWeight += weight;
      
      if (random <= cumulativeWeight) {
        return prize;
      }
    }
    
    // 如果所有奖品权重都为0，返回第一个奖品
    return prizes[0];
  }
  
  /**
   * 保底抽奖算法
   * @param {Array} prizes - 奖品列表
   * @param {Object} user - 用户信息
   * @param {Object} config - 配置
   * @returns {Object} 抽奖结果
   */
  static guaranteedLottery(prizes, user, config = {}) {
    const {
      guaranteeCount = 10, // 保底次数
      guaranteePrizeLevel = '三等奖' // 保底奖品等级
    } = config;
    
    // 计算用户未中奖次数
    const loseStreak = user.loseStreak || 0;
    
    // 如果达到保底次数，强制返回保底奖品
    if (loseStreak >= guaranteeCount - 1) {
      const guaranteedPrize = prizes.find(p => p.level === guaranteePrizeLevel);
      if (guaranteedPrize && guaranteedPrize.remainingQuantity > 0) {
        return {
          prize: guaranteedPrize,
          isGuaranteed: true,
          loseStreak: 0
        };
      }
    }
    
    // 普通抽奖
    const selectedPrize = this.randomSelectByWeight(prizes);
    
    // 更新连败记录
    const newLoseStreak = selectedPrize.level === '未中奖' ? loseStreak + 1 : 0;
    
    return {
      prize: selectedPrize,
      isGuaranteed: false,
      loseStreak: newLoseStreak
    };
  }
  
  /**
   * 概率衰减算法（防止同一用户频繁中奖）
   * @param {Array} prizes - 原始奖品列表
   * @param {Object} user - 用户信息
   * @returns {Array} 调整后的奖品列表
   */
  static probabilityDecay(prizes, user) {
    const decayFactor = 0.5; // 衰减系数
    const recentWins = user.recentWins || 0;
    
    // 如果用户最近中奖次数过多，降低中奖概率
    if (recentWins > 0) {
      return prizes.map(prize => {
        if (prize.level !== '未中奖') {
          const newProbability = prize.probability * Math.pow(decayFactor, recentWins);
          return {
            ...prize,
            probability: Math.max(newProbability, 0.1) // 保持最小概率
          };
        }
        return prize;
      });
    }
    
    return prizes;
  }
  
  /**
   * 时间分段概率调整
   * @param {Array} prizes - 原始奖品列表
   * @param {Date} currentTime - 当前时间
   * @returns {Array} 调整后的奖品列表
   */
  static timeBasedProbability(prizes, currentTime = new Date()) {
    const hour = currentTime.getHours();
    
    // 不同时间段调整概率
    let timeFactor = 1.0;
    
    if (hour >= 0 && hour < 6) {
      // 凌晨时段，提高中奖概率吸引用户
      timeFactor = 1.2;
    } else if (hour >= 18 && hour < 24) {
      // 晚间高峰，适当降低概率
      timeFactor = 0.8;
    }
    
    return prizes.map(prize => {
      if (prize.level !== '未中奖') {
        return {
          ...prize,
          probability: prize.probability * timeFactor
        };
      }
      return prize;
    });
  }
}

module.exports = LotteryAlgorithm;