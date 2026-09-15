export const captureCurrentLocation = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        });
      },
      (error) => {
        if (error?.code === 1) {
          reject(new Error("Please allow location access to continue."));
          return;
        }
        reject(new Error("Could not read current location. Turn on GPS and try again."));
      },
      {
        enableHighAccuracy: true,
        timeout: options.timeout ?? 20000,
        maximumAge: 0,
      }
    );
  });

export const captureLocationOptional = async () => {
  try {
    return await captureCurrentLocation();
  } catch {
    return { latitude: null, longitude: null };
  }
};

const toRadians = (value) => (value * Math.PI) / 180;

export const AMC_GPS_TOLERANCE_METERS = 50;

export const distanceBetweenCoordinatesMeters = (a, b) => {
  const lat1 = Number(a?.latitude);
  const lon1 = Number(a?.longitude);
  const lat2 = Number(b?.latitude);
  const lon2 = Number(b?.longitude);

  if ([lat1, lon1, lat2, lon2].some((value) => Number.isNaN(value))) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
};

export const areCoordinatesNear = (
  a,
  b,
  maxMeters = AMC_GPS_TOLERANCE_METERS
) => distanceBetweenCoordinatesMeters(a, b) <= maxMeters;

export const getBiharAmcCoordinateError = (formCoords, photoCoordsList = []) => {
  if (!formCoords?.latitude || !formCoords?.longitude) {
    return "Lat long issue: form GPS is missing. Please allow location access and try again.";
  }

  if (!photoCoordsList.length) {
    return "Lat long issue: please capture both AMC photos with GPS.";
  }

  for (let index = 0; index < photoCoordsList.length; index += 1) {
    const photoCoords = photoCoordsList[index];

    if (!photoCoords?.latitude || !photoCoords?.longitude) {
      return `Lat long issue: photo ${index + 1} GPS is missing. Please recapture the photo.`;
    }

    if (!areCoordinatesNear(formCoords, photoCoords)) {
      return "Lat long issue: form latitude/longitude and photo latitude/longitude do not match. Please recapture photos at the same location.";
    }
  }

  return "";
};
