const fs = require("fs");
const path = require("path");

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

  return deviceConfig;
}

module.exports = {
  loadDeviceConfig,
};