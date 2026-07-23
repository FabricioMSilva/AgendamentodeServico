'use client'

import type { MutableRefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const SHOW_DELAY_MS = 110
const MIN_VISIBLE_MS = 280
const FADE_OUT_MS = 260
const FORM_FALLBACK_HIDE_MS = 4500

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

function shouldLoadForAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  const nextUrl = new URL(anchor.href, window.location.href)
  const currentUrl = new URL(window.location.href)

  if (nextUrl.origin !== currentUrl.origin) return false
  return nextUrl.pathname !== currentUrl.pathname || nextUrl.search !== currentUrl.search
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function waitForPageSettled() {
  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      window.addEventListener('load', () => resolve(), { once: true })
    })
  }

  await nextFrame()
  await nextFrame()
  await new Promise<void>((resolve) => window.setTimeout(resolve, 60))
}

function preloadLoadingImages() {
  const sources = [
    '/imagens/Fundo_loading_celular.png',
    '/imagens/Fundo_loading_notebook.png',
    '/imagens/icon.transparent.png',
  ]

  for (const source of sources) {
    const image = new Image()
    image.decoding = 'async'
    image.src = source
  }
}

export default function GlobalLoadingOverlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const visibleSinceRef = useRef(0)
  const showTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<number | null>(null)
  const settleIdRef = useRef(0)

  const clearTimer = (timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current == null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const show = ({ withFallback = false }: { withFallback?: boolean } = {}) => {
    settleIdRef.current += 1
    clearTimer(hideTimerRef)
    clearTimer(showTimerRef)
    clearTimer(fallbackTimerRef)

    showTimerRef.current = window.setTimeout(() => {
      visibleSinceRef.current = Date.now()
      setMounted(true)
      window.requestAnimationFrame(() => setVisible(true))
      if (withFallback) {
        fallbackTimerRef.current = window.setTimeout(() => hide(), FORM_FALLBACK_HIDE_MS)
      }
    }, SHOW_DELAY_MS)
  }

  const hide = () => {
    clearTimer(showTimerRef)
    clearTimer(fallbackTimerRef)

    const elapsed = Date.now() - visibleSinceRef.current
    const delay = visibleSinceRef.current > 0 ? Math.max(MIN_VISIBLE_MS - elapsed, 0) : 0

    clearTimer(hideTimerRef)
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
      visibleSinceRef.current = 0
      hideTimerRef.current = window.setTimeout(() => {
        setMounted(false)
        hideTimerRef.current = null
      }, FADE_OUT_MS)
    }, delay)
  }

  const hideWhenSettled = async () => {
    const settleId = settleIdRef.current + 1
    settleIdRef.current = settleId

    await waitForPageSettled()

    if (settleIdRef.current === settleId) {
      hide()
    }
  }

  useEffect(() => {
    const preload = () => preloadLoadingImages()
    const idleWindow = window as IdleWindow
    const idleId = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(preload, { timeout: 2500 })
      : window.setTimeout(preload, 1500)

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (shouldLoadForAnchor(anchor)) show()
    }

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return

      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      if (form.dataset.globalLoading === 'off') return

      show({ withFallback: true })
    }

    const handleStart = () => show()
    const handleStop = () => hide()

    document.addEventListener('click', handleClick, true)
    document.addEventListener('submit', handleSubmit, true)
    window.addEventListener('ibeleza-loading:start', handleStart)
    window.addEventListener('ibeleza-loading:stop', handleStop)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('submit', handleSubmit, true)
      window.removeEventListener('ibeleza-loading:start', handleStart)
      window.removeEventListener('ibeleza-loading:stop', handleStop)
      if (idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId)
      } else if (typeof idleId === 'number') {
        window.clearTimeout(idleId)
      }
      clearTimer(showTimerRef)
      clearTimer(hideTimerRef)
      clearTimer(fallbackTimerRef)
    }
  }, [])

  useEffect(() => {
    hideWhenSettled()
  }, [pathname, search])

  if (!mounted) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      className={[
        'fixed inset-0 z-[100] flex items-center justify-center px-6 text-white backdrop-blur-md transition-all duration-500 ease-out',
        visible ? 'bg-[#11172A]/94 opacity-100' : 'pointer-events-none bg-[#11172A]/0 opacity-0',
      ].join(' ')}
    >
      <picture
        className={[
          'absolute inset-0 transition-transform duration-700 ease-out',
          visible ? 'scale-100' : 'scale-105',
        ].join(' ')}
        aria-hidden="true"
      >
        <source
          media="(min-width: 768px)"
          srcSet="/imagens/Fundo_loading_notebook.png"
        />
        <img
          src="/imagens/Fundo_loading_celular.png"
          alt=""
          decoding="async"
          className="h-full w-full object-cover"
        />
      </picture>
      <div
        className={[
          'absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,127,0.22),transparent_34%),linear-gradient(135deg,rgba(106,0,255,0.22),rgba(17,23,42,0.78)_44%,rgba(0,196,204,0.18)),rgba(17,23,42,0.48)] transition-opacity duration-500',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div
        className={[
          'relative flex flex-col items-center gap-5 transition-all duration-500 ease-out',
          visible ? 'translate-y-0 scale-100 opacity-100 blur-0' : 'translate-y-3 scale-95 opacity-0 blur-sm',
        ].join(' ')}
      >
        <div className="absolute h-32 w-32 animate-ping rounded-full bg-[#FF007F]/18" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[24px] bg-[#171F38] shadow-[0_24px_70px_rgba(0,0,0,0.36)] ring-1 ring-white/12">
          <span className="absolute inset-[-10px] rounded-[30px] border border-[#8FF0F4]/20 animate-pulse" />
          <img
            src="/imagens/icon.transparent.png"
            alt=""
            decoding="async"
            className="h-16 w-16 animate-[ibeleza-float_1.35s_ease-in-out_infinite] object-contain"
          />
        </div>
        <div className="text-center">
          <p className="font-brand text-2xl leading-none text-white">IBeleza</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/52">
            Carregando
          </p>
        </div>
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8FF0F4]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF007F] [animation-delay:140ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF66B2] [animation-delay:280ms]" />
        </div>
      </div>
    </div>
  )
}
