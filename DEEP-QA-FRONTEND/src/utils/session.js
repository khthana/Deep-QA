export function isSessionExpired(res) {
  return (
    res?.status === 401 ||
    res?.status === 403 ||
    res?.message === 'Unauthenticated'
  )
}
