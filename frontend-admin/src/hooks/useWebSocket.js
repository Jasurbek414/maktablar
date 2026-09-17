import { useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { addNotification } from '../store/notificationsSlice'

export function useWebSocket(path, onMessage) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  const connect = useCallback(() => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
    const wsUrl = BASE_URL.replace(/^http/, 'ws') + path
    const token = localStorage.getItem('access_token')

    ws.current = new WebSocket(`${wsUrl}?token=${token}`)

    ws.current.onopen = () => {
      console.log('WebSocket connected:', path)
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current?.(data)
      } catch (e) {}
    }

    ws.current.onclose = () => {
      // Reconnect after 5 seconds
      reconnectTimer.current = setTimeout(connect, 5000)
    }

    ws.current.onerror = () => {
      ws.current?.close()
    }
  }, [path])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws.current) {
        // onclose'ni tozalab qo'yamiz — aks holda close() chaqiruvi asinxron ravishda
        // onclose'ni ishga tushiradi va u unmount bo'lgandan keyin ham qayta ulanish
        // uchun yangi (hech qachon tozalanmaydigan) setTimeout rejalashtirib qo'yadi.
        ws.current.onclose = null
        ws.current.close()
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
