import { useEffect } from 'react'
import { Tooltip, Popover } from 'bootstrap'

const useBootstrapUtils = (pathName) => {
    useEffect(() => {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new Tooltip(tooltipTriggerEl))

        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
        const popoverList = [...popoverTriggerList].map((popoverTriggerEl) => new Popover(popoverTriggerEl))

        const dropdownHandlers = []

        const bindDropdownHover = () => {
            dropdownHandlers.forEach(({ element, onEnter, onLeave }) => {
                element.removeEventListener('mouseover', onEnter)
                element.removeEventListener('mouseleave', onLeave)
            })
            dropdownHandlers.length = 0

            if (window.innerWidth < 1400) return

            document.querySelectorAll('.dropdown').forEach((element) => {
                const menu = element.querySelector('.dropdown-menu')
                if (!menu) return

                const onEnter = () => menu.classList.add('show')
                const onLeave = () => menu.classList.remove('show')

                element.addEventListener('mouseover', onEnter)
                element.addEventListener('mouseleave', onLeave)
                dropdownHandlers.push({ element, onEnter, onLeave })
            })
        }

        window.addEventListener('resize', bindDropdownHover)
        bindDropdownHover()

        return () => {
            window.removeEventListener('resize', bindDropdownHover)
            dropdownHandlers.forEach(({ element, onEnter, onLeave }) => {
                element.removeEventListener('mouseover', onEnter)
                element.removeEventListener('mouseleave', onLeave)
            })
            tooltipList.forEach((instance) => instance.dispose())
            popoverList.forEach((instance) => instance.dispose())
        }
    }, [pathName])
}

export default useBootstrapUtils
