const statusText = document.querySelector("#status");
const eventList = document.querySelector("#eventList");
const refreshButton = document.querySelector("#refreshButton");

const totalEventsText = document.querySelector("#totalEvents");
const doorEventsText = document.querySelector("#doorEvents");
const motionEventsText = document.querySelector("#motionEvents");

const sensorFilter = document.querySelector("#sensorFilter");

const authPanel = document.querySelector("#authPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const loginMessage = document.querySelector("#loginMessage");
const currentUser = document.querySelector("#currentUser");
const logoutButton = document.querySelector("#logoutButton");

const adminPanel = document.querySelector("#adminPanel");
const adminMessage = document.querySelector("#adminMessage");
const userList = document.querySelector("#userList");
const refreshUsersButton = document.querySelector("#refreshUsersButton");

const createUserForm = document.querySelector("#createUserForm");
const newUsernameInput = document.querySelector("#newUsernameInput");
const newPasswordInput = document.querySelector("#newPasswordInput");
const newRoleInput = document.querySelector("#newRoleInput");
const createUserMessage = document.querySelector("#createUserMessage");

function showLogin() {
  authPanel.hidden = false;
  dashboardPanel.hidden = true;
  adminPanel.hidden = true;

  userList.innerHTML = "";
  adminMessage.textContent = "";

  usernameInput.value = "";
  passwordInput.value = "";

  createUserForm.reset();
  createUserMessage.textContent = "";
}

function showDashboard(user) {
  authPanel.hidden = true;
  dashboardPanel.hidden = false;
  currentUser.textContent = `Signed in as ${user.username} (${user.role})`;

  if (user.role === "admin") {
    adminPanel.hidden = false;
    loadUsers();
  } else {
    adminPanel.hidden = true;
  }
}

async function loadUsers() {
  adminMessage.textContent = "Loading users...";
  userList.innerHTML = "";

  try {
    const response = await fetch("/api/admin/users");
    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent =
        data.error || "Could not load users.";
      return;
    }

    adminMessage.textContent =
      `${data.count} user account(s)`;

    if (data.users.length === 0) {
      userList.innerHTML = "<li>No users found.</li>";
      return;
    }

    data.users.forEach((user) => {
      const listItem = document.createElement("li");

      const status = user.disabled_at
        ? "Disabled"
        : "Enabled";

      const userText = document.createElement("span");
      userText.textContent =
        `${user.username} — ${user.role} — ${status} `;

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";

      if (user.disabled_at) {
        toggleButton.textContent = "Enable";
      } else {
        toggleButton.textContent = "Disable";
      }

      toggleButton.addEventListener("click", () => {
        toggleUserStatus(user);
      });

      listItem.appendChild(userText);
      listItem.appendChild(toggleButton);
      userList.appendChild(listItem);
    });
  } catch (error) {
    adminMessage.textContent =
      "Could not connect to server.";

    console.error(error);
  }
}

async function toggleUserStatus(user) {
  const action = user.disabled_at
    ? "enable"
    : "disable";

  adminMessage.textContent =
    `${action === "enable" ? "Enabling" : "Disabling"} ${user.username}...`;

  try {
    const response = await fetch(
      `/api/admin/users/${user.id}/${action}`,
      {
        method: "PATCH",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent =
        data.error || `Could not ${action} user.`;
      return;
    }

    await loadUsers();
    adminMessage.textContent =
      `${data.user.username} is now ${
        data.user.disabled_at ? "disabled" : "enabled"
      }.`;

    adminMessage.textContent =
      `${data.user.username} is now ${
        data.user.disabled_at ? "disabled" : "enabled"
      }.`;

    await loadUsers();
  } catch (error) {
    adminMessage.textContent =
      "Could not connect to server.";

    console.error(error);
  }
}

async function createUser(event) {
  event.preventDefault();

  createUserMessage.textContent = "Creating user...";

  const username = newUsernameInput.value;
  const password = newPasswordInput.value;
  const role = newRoleInput.value;

  try {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        role,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      createUserMessage.textContent =
        data.error || "Could not create user.";
      return;
    }

    createUserMessage.textContent =
      `Created ${data.user.username} successfully.`;

    createUserForm.reset();

    await loadUsers();
  } catch (error) {
    createUserMessage.textContent =
      "Could not connect to server.";

    console.error(error);
  }
}

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

async function initializeApp() {
  try {
    const response = await fetch("/api/auth/me");

    if (response.status === 401) {
      showLogin();
      return;
    }

    if (!response.ok) {
      throw new Error("Could not check authentication.");
    }

    const data = await response.json();

    showDashboard(data.user);
    loadDashboard();
  } catch (error) {
    showLogin();
    loginMessage.textContent = "Could not connect to server.";
    console.error(error);
  }
}

refreshButton.addEventListener("click", loadDashboard);
refreshUsersButton.addEventListener("click", loadUsers);
createUserForm.addEventListener("submit", createUser);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "";
  const username = usernameInput.value;
  const password = passwordInput.value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) {
      loginMessage.textContent = data.error || "Could not log in.";
      console.error(data);
      return;
    }
    showDashboard(data.user);
    loadDashboard();
  } catch (error) {
    loginMessage.textContent = "Could not connect to server.";
    console.error(error);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (!response.ok) {
      statusText.textContent = "Could not log out.";
      return;
    }
    currentUser.textContent = "";
    showLogin();
  } catch (error) {
    statusText.textContent = "Could not connect to server.";
    console.error(error);
  }
});

initializeApp();