export const PUNCH_IN_MODAL_EVENT = 'klk-punch-in-modal'

/** Show “Please punch in first” popup (listened by PunchInFirstModalHost in layout). */
export const openPunchInFirstModal = (stateLabel = 'Bihar / UP') => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PUNCH_IN_MODAL_EVENT, {
      detail: { stateLabel },
    })
  )
}
