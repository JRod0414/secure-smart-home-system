const fs = require("node:fs");
const path = require("node:path");

function loadDeviceConfig() {
  const devicesPath = path.join(__dirname, "devices.json");
  let deviceConfig;

  try {
    const deviceConfigText = fs.readFileSync(devicesPath, "utf8");
    deviceConfig = JSON.parse(deviceConfigText);
  } catch (error) {
    console.error("Could not load device config:", error.message);
    process.exit(1);
  }

  if (
    !deviceConfig.devices ||
    typeof deviceConfig.devices !== "object" ||
    Object.keys(deviceConfig.devices).length === 0
  ) {
    console.error("Device config must contain at least one configured device.");
    process.exit(1);
  }

  for (const [deviceId, configuredDevice] of Object.entries(
    deviceConfig.devices
  )) {
    if (
      !configuredDevice ||
      typeof configuredDevice.apiKey !== "string" ||
      configuredDevice.apiKey.trim() === ""
    ) {
      console.error(
        `Device "${deviceId}" must contain a non-empty string apiKey.`
      );
      process.exit(1);
    }
  }

  return deviceConfig;
}

module.exports = {
  loadDeviceConfig,
};