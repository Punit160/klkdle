export const getSslLocationConfig = (region = 'bihar') => {
  const isUp = region === 'up'

  return {
    isUp,
    label: isUp ? 'Village' : 'Panchayat',
    localityLabel: isUp ? 'Village' : 'Panchayat',
    loadingText: isUp ? 'Loading villages...' : 'Loading panchayats...',
    selectText: isUp ? 'Select Village' : 'Select Panchayat',
    selectBlockFirstText: isUp ? 'Select Block First' : 'Select Block First',
    selectLocalityFirstText: isUp ? 'Select Village first' : 'Select Panchayat first',
    locationSubtitle: isUp
      ? 'Select the district, block and village'
      : 'Select the district, block and panchayat',
    extractListValue: (item) =>
      isUp
        ? item?.village || item?.panchayat || item?.panchyat
        : item?.panchyat || item?.panchayat || item?.village,
    // UP API expects param name `panchayat` with the village value inside it, also send `village` for safety.
    withLocalityParam: (params, localityValue) => ({
      ...params,
      panchayat: localityValue,
      ...(isUp ? { village: localityValue } : {}),
    }),
  }
}