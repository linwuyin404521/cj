const state = {
  userInfo: JSON.parse(localStorage.getItem('userInfo')) || null,
  token: localStorage.getItem('token') || null,
  prizeResult: ''
}

const mutations = {
  setUserInfo(state, userInfo) {
    state.userInfo = userInfo
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
  },
  setToken(state, token) {
    state.token = token
    localStorage.setItem('token', token)
  },
  setPrizeResult(state, prizeName) {
    state.prizeResult = prizeName
  },
  logout(state) {
    state.userInfo = null
    state.token = null
    state.prizeResult = ''
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
  }
}

const actions = {
  login({ commit }, userInfo) {
    commit('setUserInfo', userInfo)
    commit('setToken', userInfo.token)
  },
  register({ commit }, userInfo) {
    commit('setUserInfo', userInfo)
  },
  logout({ commit }) {
    commit('logout')
  }
}

const getters = {
  isLogin: state => !!state.token
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}