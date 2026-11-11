'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Native scrolling stays available for content taller than the viewport. */
export function useHomePager(ids: readonly string[]) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)

  const goTo = useCallback((index: number, instant = false) => {
    const viewport = viewportRef.current
    const panel = viewport?.children.item(index) as HTMLElement | null
    if (!viewport || !panel) {
      return
    }
    activeRef.current = index
    setActive(index)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    viewport.scrollTo({ top: panel.offsetTop, behavior: instant || reduceMotion ? 'instant' : 'smooth' })
    window.history.replaceState(window.history.state, '', `#${ids[index]}`)
  }, [ids])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    let lastWheel = 0
    let lockedUntil = 0
    let moved = false
    let accumulated = 0
    let scrollTimer: ReturnType<typeof setTimeout>

    const panels = () => Array.from(viewport.children) as HTMLElement[]
    const nearest = () => {
      const current = panels()[activeRef.current]
      if (current && viewport.scrollTop >= current.offsetTop - 2 && viewport.scrollTop < current.offsetTop + current.offsetHeight - 2) {
        return activeRef.current
      }
      return panels().reduce((best, panel, index, all) => (
        Math.abs(panel.offsetTop - viewport.scrollTop) < Math.abs(all[best].offsetTop - viewport.scrollTop) ? index : best
      ), 0)
    }
    const needsReading = (direction: number) => {
      const panel = panels()[activeRef.current]
      if (!panel || panel.offsetHeight <= viewport.clientHeight + 2) {
        return false
      }
      return direction > 0
        ? viewport.scrollTop + viewport.clientHeight < panel.offsetTop + panel.offsetHeight - 2
        : viewport.scrollTop > panel.offsetTop + 2
    }
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        return
      }
      const direction = Math.sign(event.deltaY)
      const now = performance.now()
      if (now - lastWheel > 180 && now >= lockedUntil) {
        moved = false
        accumulated = 0
      }
      lastWheel = now
      if (moved || now < lockedUntil) {
        event.preventDefault()
        return
      }
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1)
      if (needsReading(direction)) {
        event.preventDefault()
        const panel = panels()[activeRef.current]
        const bottom = panel.offsetTop + panel.offsetHeight - viewport.clientHeight
        const top = Math.max(panel.offsetTop, Math.min(bottom, viewport.scrollTop + delta))
        viewport.scrollTo({
          top,
          behavior: 'instant',
        })
        if (top === panel.offsetTop || top === bottom) {
          moved = true
          lockedUntil = now + 650
        }
        return
      }
      event.preventDefault()
      accumulated = Math.sign(accumulated) === direction ? accumulated + delta : delta
      if (Math.abs(accumulated) < 18) {
        return
      }
      moved = true
      lockedUntil = now + 650
      goTo(Math.max(0, Math.min(ids.length - 1, activeRef.current + direction)))
    }
    const onScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        const index = nearest()
        activeRef.current = index
        setActive(index)
        window.history.replaceState(window.history.state, '', `#${ids[index]}`)
      }, 160)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, [contenteditable="true"]'))) {
        return
      }
      const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0
      if (direction && needsReading(direction)) {
        event.preventDefault()
        const panel = panels()[activeRef.current]
        viewport.scrollTo({
          top: Math.max(panel.offsetTop, Math.min(panel.offsetTop + panel.offsetHeight - viewport.clientHeight, viewport.scrollTop + direction * viewport.clientHeight * 0.75)),
          behavior: 'instant',
        })
        return
      }
      if (!direction && event.key !== 'Home' && event.key !== 'End') {
        return
      }
      event.preventDefault()
      if (event.repeat) {
        return
      }
      goTo(event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : Math.max(0, Math.min(ids.length - 1, activeRef.current + direction)))
    }
    const fromHash = () => {
      const index = ids.indexOf(window.location.hash.slice(1))
      if (index >= 0) {
        goTo(index, true)
      }
    }
    const onResize = () => goTo(activeRef.current, true)
    fromHash()
    viewport.addEventListener('wheel', onWheel, { passive: false })
    viewport.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', fromHash)
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(scrollTimer)
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', fromHash)
      window.removeEventListener('resize', onResize)
    }
  }, [goTo, ids])

  return { viewportRef, active, goTo }
}
