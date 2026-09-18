import { useEffect, useRef, useState } from 'react'
import { getCompanyId } from '../utils/auth'
import { getDleAmcUserId } from '../utils/externalApiUser'
import {
  loadBiharAmcLocationPrefs,
  pickLocationOption,
  saveBiharAmcLocationSnapshot,
} from '../utils/biharAmcLocationPrefs'

/**
 * District / block / panchayat — restores last saved selection per user + company.
 */
export function useBiharAmcLocationSelection({
  enabled = true,
  districtOptions,
  blockOptions,
  panchayatOptions,
}) {
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedPanchayat, setSelectedPanchayat] = useState(null)

  const userId = getDleAmcUserId()
  const companyId = getCompanyId()

  const restoreDoneRef = useRef({
    district: false,
    block: false,
    panchayat: false,
  })

  const readSaved = () => {
    if (!enabled) return null
    return loadBiharAmcLocationPrefs(userId, companyId)
  }

  const resetRestoreState = () => {
    restoreDoneRef.current = {
      district: false,
      block: false,
      panchayat: false,
    }
  }

  useEffect(() => {
    if (!enabled) return

    resetRestoreState()
    setSelectedDistrict(null)
    setSelectedBlock(null)
    setSelectedPanchayat(null)
  }, [enabled, userId, companyId])

  useEffect(() => {
    if (!enabled || selectedDistrict || restoreDoneRef.current.district) return
    if (!districtOptions?.length) return

    const saved = readSaved()
    if (!saved?.district) {
      restoreDoneRef.current.district = true
      return
    }

    const option = pickLocationOption(districtOptions, saved.district)
    if (option) {
      setSelectedDistrict(option)
    }
    restoreDoneRef.current.district = true
  }, [enabled, districtOptions, selectedDistrict, userId, companyId])

  useEffect(() => {
    if (!enabled || selectedBlock || restoreDoneRef.current.block) return
    if (!selectedDistrict || !blockOptions?.length) return

    const saved = readSaved()
    const districtValue = String(selectedDistrict.value || '').trim()

    if (!saved?.block || normalizeSaved(saved.district) !== normalizeSaved(districtValue)) {
      restoreDoneRef.current.block = true
      return
    }

    const option = pickLocationOption(blockOptions, saved.block)
    if (option) {
      setSelectedBlock(option)
    }
    restoreDoneRef.current.block = true
  }, [
    enabled,
    blockOptions,
    selectedDistrict,
    selectedBlock,
    userId,
    companyId,
  ])

  useEffect(() => {
    if (!enabled || selectedPanchayat || restoreDoneRef.current.panchayat) return
    if (!selectedDistrict || !selectedBlock || !panchayatOptions?.length) return

    const saved = readSaved()
    const districtValue = String(selectedDistrict.value || '').trim()
    const blockValue = String(selectedBlock.value || '').trim()

    if (
      !saved?.panchayat ||
      normalizeSaved(saved.district) !== normalizeSaved(districtValue) ||
      normalizeSaved(saved.block) !== normalizeSaved(blockValue)
    ) {
      restoreDoneRef.current.panchayat = true
      return
    }

    const option = pickLocationOption(panchayatOptions, saved.panchayat)
    if (option) {
      setSelectedPanchayat(option)
    }
    restoreDoneRef.current.panchayat = true
  }, [
    enabled,
    panchayatOptions,
    selectedDistrict,
    selectedBlock,
    selectedPanchayat,
    userId,
    companyId,
  ])

  const persistSnapshot = (district, block, panchayat, { clearWard = false } = {}) => {
    if (!enabled) return
    const snapshot = { district, block, panchayat }
    if (clearWard) snapshot.ward = ''
    saveBiharAmcLocationSnapshot(snapshot)
  }

  const handleDistrictSelect = (option) => {
    setSelectedDistrict(option)
    setSelectedBlock(null)
    setSelectedPanchayat(null)
    restoreDoneRef.current.block = false
    restoreDoneRef.current.panchayat = false
    persistSnapshot(option, null, null, { clearWard: true })
  }

  const handleBlockSelect = (option) => {
    setSelectedBlock(option)
    setSelectedPanchayat(null)
    restoreDoneRef.current.panchayat = false
    persistSnapshot(selectedDistrict, option, null, { clearWard: true })
  }

  const handlePanchayatSelect = (option) => {
    setSelectedPanchayat(option)
    persistSnapshot(selectedDistrict, selectedBlock, option, { clearWard: true })
  }

  const resetLocationSelection = () => {
    setSelectedDistrict(null)
    setSelectedBlock(null)
    setSelectedPanchayat(null)
    resetRestoreState()
  }

  const rememberCurrentLocation = () => {
    persistSnapshot(selectedDistrict, selectedBlock, selectedPanchayat)
  }

  return {
    selectedDistrict,
    selectedBlock,
    selectedPanchayat,
    setSelectedDistrict,
    setSelectedBlock,
    setSelectedPanchayat,
    handleDistrictSelect,
    handleBlockSelect,
    handlePanchayatSelect,
    resetLocationSelection,
    rememberCurrentLocation,
  }
}

function normalizeSaved(value) {
  return String(value || '').trim().toLowerCase()
}
