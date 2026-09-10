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
