let accessToken: string | null = null
const REFRESH_FLAG_KEY = 'auth.refresh.available'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const tokenStore = {
  getAccess() {
    return accessToken
  },
  setAccess(token: string | null) {
    accessToken = token
  },
  hasRefresh() {
    if (!canUseStorage()) {
      return false
    }
    return window.localStorage.getItem(REFRESH_FLAG_KEY) === '1'
  },
  setRefreshAvailable(available: boolean) {
    if (!canUseStorage()) {
      return
    }
    if (available) {
      window.localStorage.setItem(REFRESH_FLAG_KEY, '1')
    } else {
      window.localStorage.removeItem(REFRESH_FLAG_KEY)
    }
  },
  clear() {
    accessToken = null
    if (canUseStorage()) {
      window.localStorage.removeItem(REFRESH_FLAG_KEY)
    }
  },
}
