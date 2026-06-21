const statusText = document.querySelector("#status");
const eventList = document.querySelector("#eventList");
const refreshButton = document.querySelector("#refreshButton");

const totalEventsText = document.querySelector("#totalEvents");
const doorEventsText = document.querySelector("#doorEvents");
const motionEventsText = document.querySelector("#motionEvents");

async function loadDashboard() {
  statusText.textContent = "Checking system status...";
  eventList.innerHTML = "";

  try {
    const healthResponse = await fetch("/api/health");
    const healthData = await healthResponse.json();

    statusText.textContent = `System status: ${healthData.status}`;

    const eventsResponse = await fetch("/api/events");
    const eventsData = await eventsResponse.json();

    if (eventsData.events.length === 0) {
      eventList.innerHTML = "<li>No sensor events yet.</li>";
      return;
    }
    
    let totalEvents = 0;
    let doorEvents = 0;
    let motionEvents = 0; 

    eventsData.events.forEach((sensorEvent) => {
      totalEvents++;
      if (sensorEvent.sensor_type === "door") {
      doorEvents++;
      } else if (sensorEvent.sensor_type === "motion"){
      motionEvents++;
    }
      const listItem = document.createElement("li");

      const date = new Date(sensorEvent.timestamp).toLocaleString();

      listItem.textContent =
        `${sensorEvent.device_id}: ${sensorEvent.event} ` +
        `(${sensorEvent.sensor_type}) at ${date}`;

      eventList.appendChild(listItem);
    });
    totalEventsText.textContent = totalEvents;
    doorEventsText.textContent = doorEvents;
    motionEventsText.textContent = motionEvents;
  } catch (error) {
    statusText.textContent = "System status: Could not connect to server.";
    eventList.innerHTML = "<li>Could not load events.</li>";
    console.error(error);
  }
}

refreshButton.addEventListener("click", loadDashboard);

loadDashboard();