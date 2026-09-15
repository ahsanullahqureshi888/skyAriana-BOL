"use client"

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Purge any stale service worker caches from previous versions
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => {
            if (k !== 'sky-ariana-v3.2.2') {
              caches.delete(k).catch(() => {})
            }
          })
        }).catch(() => {})
      }

      if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(() => {})
        })
      }
    }
  }, [])

  return null
}
