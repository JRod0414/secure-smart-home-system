const allowedEventsBySensor = {
  door: ["open", "closed"],
  motion: ["detected"],
};

function validateSensorEvent(sensorType, event) {
  // Only allow sensor types your project currently supports.
  if (!["door", "motion"].includes(sensorType)) {
    return {
      valid: false,
      error: "sensor_type must be either door or motion",
    };
  }

  // Make sure the event makes sense for that sensor.
  if (!allowedEventsBySensor[sensorType].includes(event)) {
    return {
      valid: false,
      error: `event "${event}" is not valid for sensor_type "${sensorType}"`,
    };
  }
  return { valid: true, };
}

module.exports = {
  validateSensorEvent,
};