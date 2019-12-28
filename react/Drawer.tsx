import React, { useRef, useState, useEffect, ReactElement } from 'react'
import { defineMessages } from 'react-intl'

import { IconClose, IconMenu } from 'vtex.store-icons'
import { useCssHandles } from 'vtex.css-handles'

import Overlay from './Overlay'
import Portal from './Portal'
import Swipable from './Swipable'

// https://stackoverflow.com/a/3464890/5313009
const getScrollPosition = () => {
  const documentElement =
    window && window.document && window.document.documentElement
  if (!documentElement) {
    return 0
  }
  return (
    (window.pageYOffset || documentElement.scrollTop) -
    (documentElement.clientTop || 0)
  )
}

const useLockScroll = () => {
  const initialized = useRef(false)
  const [isLocked, setLocked] = useState(false)
  type ScrollPosition = number | null
  const [lockedScrollPosition, setLockedScrollPosition] = useState<
    ScrollPosition
  >(null)

  useEffect(() => {
    if (!initialized.current && !isLocked) {
      // Prevent this from running at first, if it's not locked.
      // Important because this triggers re-layout, thus slowing
      // down the rendering unnecessarily.
      initialized.current = true
      return
    }
    /** Locks scroll of the root HTML element if the
     * drawer menu is open
     */
    const shouldLockScroll = isLocked

    const documentElement =
      window && window.document && window.document.documentElement

    if (documentElement) {
      const bodyBounds = document.body.getBoundingClientRect()

      document.body.style.width = shouldLockScroll
        ? `${bodyBounds.width}px`
        : 'auto'

      documentElement.style.overflow = shouldLockScroll ? 'hidden' : 'auto'

      /** iOS doesn't lock the scroll of the body by just setting overflow to hidden.
       * It requires setting the position of the HTML element to fixed, which also
       * resets the scroll position.
       * This code is intended to record the scroll position and set it as
       * the element's position, and revert it once the menu is closed.
       */
      const scrollPosition =
        lockedScrollPosition == null
          ? getScrollPosition()
          : lockedScrollPosition

      if (lockedScrollPosition == null && shouldLockScroll) {
        setLockedScrollPosition(scrollPosition)
      }

      if (lockedScrollPosition != null && !shouldLockScroll) {
        window && window.scrollTo(0, scrollPosition)
        setLockedScrollPosition(null)
      }

      documentElement.style.position = shouldLockScroll ? 'fixed' : 'static'

      documentElement.style.top = shouldLockScroll
        ? `-${scrollPosition}px`
        : 'auto'

      documentElement.style.bottom = shouldLockScroll ? '0' : 'auto'
      documentElement.style.left = shouldLockScroll ? '0' : 'auto'
    }

    return () => {
      documentElement.style.overflow = 'auto'
      documentElement.style.position = 'static'

      documentElement.style.top = 'auto'
      documentElement.style.bottom = 'auto'
      documentElement.style.left = 'auto'
      document.body.style.width = 'auto'
    }
  }, [isLocked]) // eslint-disable-line react-hooks/exhaustive-deps
  // ☝️ no need to trigger this on lockedScrollPosition changes

  return setLocked
}

const useMenuState = () => {
  const [isMenuOpen, setIsOpen] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)
  const [isMenuTransitioning, setIsTransitioning] = useState(false)
  const setLockScroll = useLockScroll()

  let transitioningTimeout: number | null

  const setMenuOpen = (value: boolean) => {
    if (!hasBeenOpened && value) {
      setHasBeenOpened(true)
    }
    setIsOpen(value)
    setIsTransitioning(true)
    setLockScroll(value)

    if (transitioningTimeout != null) {
      clearTimeout(transitioningTimeout)
      transitioningTimeout = null
    }
    transitioningTimeout =
      window &&
      window.setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
  }

  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)

  return {
    isMenuOpen,
    isMenuTransitioning,
    setMenuOpen,
    openMenu,
    closeMenu,
    hasBeenOpened,
  }
}

const CSS_HANDLES = [
  'openIconContainer',
  'drawer',
  'closeIconContainer',
  'childrenContainer',
  'closeIconButton',
]

const Drawer: StorefrontComponent<
  DrawerSchema & { customIcon: ReactElement }
> = ({
  width,
  customIcon,
  maxWidth = 450,
  isFullWidth,
  slideDirection = 'horizontal',
  children,
}) => {
  const {
    isMenuOpen,
    isMenuTransitioning,
    openMenu,
    closeMenu,
    hasBeenOpened,
  } = useMenuState()
  const handles = useCssHandles(CSS_HANDLES)
  const menuRef = useRef(null)

  const slideFromTopToBottom = `translate3d(0, ${
    isMenuOpen ? '0' : '-100%'
  }, 0)`
  const slideFromLeftToRight = `translate3d(${
    isMenuOpen ? '0' : '-100%'
  }, 0, 0)`
  const slideFromRightToLeft = `translate3d(${isMenuOpen ? '0' : '100%'}, 0, 0)`

  const resolveSlideDirection = () => {
    switch (slideDirection) {
      case 'horizontal':
        return slideFromLeftToRight
      case 'vertical':
        return slideFromTopToBottom
      case 'leftToRight':
        return slideFromLeftToRight
      case 'rightToLeft':
        return slideFromRightToLeft
      default:
        return slideFromLeftToRight
    }
  }

  return (
    <>
      <div
        className={`pa4 pointer ${handles.openIconContainer}`}
        onClick={openMenu}
        aria-hidden
      >
        {customIcon || <IconMenu size={20} />}
      </div>
      <Portal>
        <Overlay visible={isMenuOpen} onClick={closeMenu} />

        <Swipable
          enabled={isMenuOpen}
          element={menuRef && menuRef.current}
          onSwipeLeft={
            slideDirection === 'horizontal' || slideDirection === 'leftToRight'
              ? closeMenu
              : null
          }
          onSwipeRight={slideDirection === 'rightToLeft' ? closeMenu : null}
          rubberBanding
        >
          <div
            ref={menuRef}
            className={`${handles.drawer} fixed top-0 ${
              slideDirection === 'rightToLeft' ? 'right-0' : 'left-0'
            } bottom-0 bg-base z-999 flex flex-column`}
            style={{
              WebkitOverflowScrolling: 'touch',
              overflowY: 'scroll',
              width: width || (isFullWidth ? '100%' : '85%'),
              maxWidth,
              pointerEvents: isMenuOpen ? 'auto' : 'none',
              transform: resolveSlideDirection(),
              transition: isMenuTransitioning ? 'transform 300ms' : 'none',
              minWidth: 280,
            }}
          >
            <div className={`flex ${handles.closeIconContainer}`}>
              <button
                className={`pa4 pointer bg-transparent transparent bn pointer ${
                  handles.closeIconButton
                }`}
                onClick={closeMenu}
              >
                <IconClose size={30} type="line" />
              </button>
            </div>
            <div className={`${handles.childrenContainer} flex flex-grow-1`}>
              {hasBeenOpened && children}
            </div>
          </div>
        </Swipable>
      </Portal>
    </>
  )
}

const messages = defineMessages({
  title: {
    defaultMessage: '',
    id: 'admin/editor.drawer.title',
  },
})

Drawer.getSchema = () => {
  return {
    title: messages.title.id,
  }
}

export default Drawer
