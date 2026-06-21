const statusText = document.querySelector("#status");
const eventList = document.querySelector("#eventList");
const refreshButton = document.querySelector("#refreshButton");

const totalEventsText = document.querySelector("#totalEvents");
const doorEventsText = document.querySelector("#doorEvents");
const motionEventsText = document.querySelector("#motionEvents");

const sensorFilter = document.querySelector("#sensorFilter");

let allEvents = [];

function displayEvents() {
  eventList.innerHTML = "";

  const selectedFilter = sensorFilter.value;

  const filteredEvents = allEvents.filter((sensorEvent) => {
    return (
      selectedFilter === "all" ||
      sensorEvent.sensor_type === selectedFilter
    );
  });

  if (filteredEvents.length === 0) {
    eventList.innerHTML = "<li>No matching sensor events.</li>";
    return;
  }

  filteredEvents.forEach((sensorEvent) => {
    const listItem = document.createElement("li");
    const date = new Date(sensorEvent.timestamp).toLocaleString();

    listItem.textContent =
      `${sensorEvent.device_id}: ${sensorEvent.event} ` +
      `(${sensorEvent.sensor_type}) at ${date}`;

    eventList.appendChild(listItem);
  });
}

// Runs once when the user changes the dropdown
sensorFilter.addEventListener("change", displayEvents);

async function loadDashboard() {
  statusText.textContent = "Checking system status...";

  try {
    const healthResponse = await fetch("/api/health");
    const healthData = await healthResponse.json();

    statusText.textContent = `System status: ${healthData.status}`;

    const eventsResponse = await fetch("/api/events");
    const eventsData = await eventsResponse.json();

    // Save the full event list from the API
    allEvents = eventsData.events;

    const totalEvents = allEvents.length;

    const doorEvents = allEvents.filter((sensorEvent) => {
      return sensorEvent.sensor_type === "door";
    }).length;

    const motionEvents = allEvents.filter((sensorEvent) => {
      return sensorEvent.sensor_type === "motion";
    }).length;

    totalEventsText.textContent = totalEvents;
    doorEventsText.textContent = doorEvents;
    motionEventsText.textContent = motionEvents;

    // Show only the events selected in the dropdown
    displayEvents();
  } catch (error) {
    statusText.textContent = "System status: Could not connect to server.";
    eventList.innerHTML = "<li>Could not load events.</li>";
    console.error(error);
  }
}

refreshButton.addEventListener("click", loadDashboard);

loadDashboard();