import { get, post } from '@/utils/request'
import apiConfig from '@/config/api.config'

class LotteryService {
  // 抽奖
  static async draw() {
    return post(apiConfig.endpoints.lottery.draw)
  }
  
  // 获取抽奖历史
  static async getHistory(params = {}) {
    return get(apiConfig.endpoints.lottery.history, params)
  }
  
  // 获取奖品列表
  static async getPrizes() {
    return get(apiConfig.endpoints.lottery.prizes)
  }
  
  // 获取抽奖统计
  static async getStatistics() {
    return get(apiConfig.endpoints.lottery.statistics)
  }
  
  // 领取奖品
  static async claimPrize(recordId, claimData = {}) {
    return post(`/lottery/claim/${recordId}`, claimData)
  }
  
  // 获取我的奖品
  static async getMyPrizes(status) {
    const params = status ? { status } : {}
    return get('/lottery/my-prizes', params)
  }
}

export default LotteryService