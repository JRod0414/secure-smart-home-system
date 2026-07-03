function createDeviceAuth(deviceConfig) {
  function isAuthorizedDevice(deviceId, apiKey) {
    const configuredDevice = deviceConfig.devices[deviceId];
    if (
      !apiKey ||
      !configuredDevice ||
      apiKey !== configuredDevice.apiKey
    ) {
      return false;
    }
    return true;
  }
  return {
    isAuthorizedDevice,
  };
}

module.exports = {
  createDeviceAuth,
};