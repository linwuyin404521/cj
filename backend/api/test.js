import AuthService from '@/services/auth.service'
import LotteryService from '@/services/lottery.service'

// API测试工具
export class ApiTester {
  static async runAllTests() {
    console.group('🧪 API接口测试开始')
    
    try {
      await this.testConnection()
      await this.testAuth()
      await this.testLottery()
      
      console.log('✅ 所有测试通过')
    } catch (error) {
      console.error('❌ 测试失败:', error.message)
    } finally {
      console.groupEnd()
    }
  }
  
  static async testConnection() {
    console.group('测试API连接')
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/health')
      if (response.ok) {
        console.log('✅ API连接正常')
      } else {
        throw new Error('API连接失败')
      }
    } catch (error) {
      console.error('❌ API连接测试失败:', error.message)
      throw error
    } finally {
      console.groupEnd()
    }
  }
  
  static async testAuth() {
    console.group('测试认证接口')
    
    try {
      // 测试注册（如果支持）
      // const registerRes = await AuthService.register({
      //   username: 'testuser',
      //   password: 'testpass123',
      //   email: 'test@test.com'
      // })
      // console.log('✅ 注册接口正常')
      
      // 测试登录
      const loginRes = await AuthService.login({
        username: 'demo',
        password: 'demo123'
      })
      console.log('✅ 登录接口正常', loginRes)
      
      // 测试获取用户信息
      const profileRes = await AuthService.getProfile()
      console.log('✅ 获取用户信息正常', profileRes)
      
    } catch (error) {
      console.error('❌ 认证接口测试失败:', error.message)
      throw error
    } finally {
      console.groupEnd()
    }
  }
  
  static async testLottery() {
    console.group('测试抽奖接口')
    
    try {
      // 获取奖品列表
      const prizesRes = await LotteryService.getPrizes()
      console.log('✅ 获取奖品列表正常', prizesRes.length)
      
      // 获取抽奖历史
      const historyRes = await LotteryService.getHistory()
      console.log('✅ 获取抽奖历史正常', historyRes.length)
      
      // 测试抽奖（谨慎使用，可能会消耗积分）
      // const drawRes = await LotteryService.draw()
      // console.log('✅ 抽奖接口正常', drawRes)
      
    } catch (error) {
      console.error('❌ 抽奖接口测试失败:', error.message)
    } finally {
      console.groupEnd()
    }
  }
}

// 使用示例
// ApiTester.runAllTests()