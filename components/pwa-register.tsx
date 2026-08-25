"use client"

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('Sky Ariana PWA ServiceWorker registered:', registration.scope)
          },
          (err) => {
            console.warn('Sky Ariana PWA ServiceWorker registration failed:', err)
          }
        )
      })
    }
  }, [])

  return null
}
