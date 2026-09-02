import { useEffect } from 'react'
import { checkBackendHealth } from '../api/client'
import { useAppStore } from '../store/appStore'

export function useBackendStatus() {
  const { setBackendStatus, touchLastUpdated } = useAppStore()

  useEffect(() => {
    let isMounted = true

    async function check() {
      const health = await checkBackendHealth()
      if (!isMounted) return

      if (health.status === 'online') {
        setBackendStatus('ONLINE')
        touchLastUpdated()
      } else {
        setBackendStatus('OFFLINE')
      }
    }

    check()
    const interval = setInterval(check, 10000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [setBackendStatus, touchLastUpdated])
}
