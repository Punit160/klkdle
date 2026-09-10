import { useContext, useEffect, useRef, useState } from 'react'
import {
  FiAlignLeft,
  FiArrowRight,
  FiMaximize,
  FiMinimize,
  FiMoon,
  FiSun,
} from 'react-icons/fi'
import ProfileModal from './ProfileModal'
import Search from './Search'
import { NavigationContext } from '../../../contentApi/navigationProvider'

const Header = () => {
  const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
  const [navigationExpend, setNavigationExpend] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const miniUpButtonRef = useRef(null)
  const expandUpButtonRef = useRef(null)
  const miniDownButtonRef = useRef(null)
  const expandDownButtonRef = useRef(null)

  const handleThemeMode = (type) => {
    const isDark = type === 'dark'
    setIsDarkTheme(isDark)

    if (isDark) {
      document.documentElement.classList.add('app-skin-dark')
      localStorage.setItem('skinTheme', 'dark')
    } else {
      document.documentElement.classList.remove('app-skin-dark')
      localStorage.setItem('skinTheme', 'light')
    }
  }

  useEffect(() => {
    const setNavDisplay = (selector, display) => {
      const el = document.querySelector(selector)
      if (el) el.style.display = display
    }

    const handleResize = () => {
      const newWindowWidth = window.innerWidth

      if (newWindowWidth <= 1024) {
        document.documentElement.classList.remove('minimenu')
        setNavDisplay('.navigation-down-1600', 'none')
      } else if (newWindowWidth >= 1025 && newWindowWidth <= 1400) {
        document.documentElement.classList.add('minimenu')
        setNavDisplay('.navigation-up-1600', 'none')
        setNavDisplay('.navigation-down-1600', 'block')
      } else {
        document.documentElement.classList.remove('minimenu')
        setNavDisplay('.navigation-up-1600', 'block')
        setNavDisplay('.navigation-down-1600', 'none')
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    const savedSkinTheme = localStorage.getItem('skinTheme')
    handleThemeMode(savedSkinTheme === 'dark' ? 'dark' : 'light')

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleNavigationExpendUp = (e, action) => {
    e.preventDefault()
    if (action === 'show') {
      setNavigationExpend(true)
      document.documentElement.classList.add('minimenu')
    } else {
      setNavigationExpend(false)
      document.documentElement.classList.remove('minimenu')
    }
  }

  const handleNavigationExpendDown = (e, action) => {
    e.preventDefault()
    if (action === 'show') {
      setNavigationExpend(true)
      document.documentElement.classList.remove('minimenu')
    } else {
      setNavigationExpend(false)
      document.documentElement.classList.add('minimenu')
    }
  }

  const fullScreenMaximize = () => {
    const elem = document.documentElement

    if (elem.requestFullscreen) {
      elem.requestFullscreen()
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen()
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen()
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen()
    }

    document.documentElement.classList.add('fsh-infullscreen')
    document.body?.classList.add('full-screen-helper')
  }

  const fullScreenMinimize = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }

    document.documentElement.classList.remove('fsh-infullscreen')
    document.body?.classList.remove('full-screen-helper')
  }

  return (
    <header className="nxl-header">
      <div className="header-wrapper">
        <div className="header-left d-flex align-items-center gap-3">
          <a
            href="#"
            className="nxl-head-mobile-toggler"
            onClick={(e) => {
              e.preventDefault()
              setNavigationOpen(true)
            }}
            id="mobile-collapse"
            aria-label="Open navigation"
          >
            <div className={`hamburger hamburger--arrowturn ${navigationOpen ? 'is-active' : ''}`}>
              <div className="hamburger-box">
                <div className="hamburger-inner" />
              </div>
            </div>
          </a>

          <div className="nxl-navigation-toggle navigation-up-1600">
            <a
              href="#"
              onClick={(e) => handleNavigationExpendUp(e, 'show')}
              id="menu-mini-button-up"
              ref={miniUpButtonRef}
              style={{ display: navigationExpend ? 'none' : 'block' }}
              aria-label="Collapse sidebar"
            >
              <FiAlignLeft size={24} />
            </a>
            <a
              href="#"
              onClick={(e) => handleNavigationExpendUp(e, 'hide')}
              id="menu-expend-button-up"
              ref={expandUpButtonRef}
              style={{ display: navigationExpend ? 'block' : 'none' }}
              aria-label="Expand sidebar"
            >
              <FiArrowRight size={24} />
            </a>
          </div>

          <div className="nxl-navigation-toggle navigation-down-1600">
            <a
              href="#"
              onClick={(e) => handleNavigationExpendDown(e, 'hide')}
              id="menu-mini-button-down"
              ref={miniDownButtonRef}
              style={{ display: navigationExpend ? 'block' : 'none' }}
              aria-label="Collapse sidebar"
            >
              <FiAlignLeft size={24} />
            </a>
            <a
              href="#"
              onClick={(e) => handleNavigationExpendDown(e, 'show')}
              id="menu-expend-button-down"
              ref={expandDownButtonRef}
              style={{ display: navigationExpend ? 'none' : 'block' }}
              aria-label="Expand sidebar"
            >
              <FiArrowRight size={24} />
            </a>
          </div>
        </div>

        <div className="header-right">
          <Search />

          <div className="nxl-h-item d-none d-sm-flex">
            <div className="full-screen-switcher">
              <span className="nxl-head-link">
                <FiMaximize size={20} className="maximize" onClick={fullScreenMaximize} role="button" tabIndex={0} />
                <FiMinimize size={20} className="minimize" onClick={fullScreenMinimize} role="button" tabIndex={0} />
              </span>
            </div>
          </div>

          <div className="nxl-h-item dark-light-theme">
            {!isDarkTheme ? (
              <button
                type="button"
                className="nxl-head-link dark-button"
                onClick={() => handleThemeMode('dark')}
                aria-label="Switch to dark theme"
              >
                <FiMoon size={20} />
              </button>
            ) : (
              <button
                type="button"
                className="nxl-head-link light-button"
                onClick={() => handleThemeMode('light')}
                aria-label="Switch to light theme"
              >
                <FiSun size={20} />
              </button>
            )}
          </div>

          <ProfileModal />
        </div>
      </div>
    </header>
  )
}

export default Header
