let accessToken: string | null = null

export const tokenStore = {
  getAccess() {
    return accessToken
  },
  setAccess(token: string | null) {
    accessToken = token
  },
  clear() {
    accessToken = null
  },
}
