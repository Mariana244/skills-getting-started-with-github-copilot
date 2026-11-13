document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;
        const participants = details.participants;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> <span>${spotsLeft}</span> spots left</p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeader = document.createElement("div");
        participantsHeader.className = "participants-header";

        const participantsTitle = document.createElement("h5");
        participantsTitle.textContent = "Participants";

        const participantsCount = document.createElement("span");
        participantsCount.className = "participants-count";
        participantsCount.textContent = participants.length;

        participantsHeader.append(participantsTitle, participantsCount);
        participantsSection.appendChild(participantsHeader);

        if (participants.length > 0) {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          participants.forEach((email) => {
            const participant = document.createElement("li");
            participant.className = "participant-item";
            participant.dataset.email = email;

            const participantEmail = document.createElement("span");
            participantEmail.textContent = email;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "participant-remove";
            removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            removeButton.title = "Unregister participant";

            const removeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            removeIcon.setAttribute("viewBox", "0 0 24 24");
            removeIcon.setAttribute("aria-hidden", "true");
            removeIcon.classList.add("participant-remove-icon");

            const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            iconPath.setAttribute(
              "d",
              "M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3M3 7h18"
            );
            removeIcon.appendChild(iconPath);
            removeButton.appendChild(removeIcon);
            removeButton.addEventListener("click", () => {
              unregisterParticipant(name, email, removeButton);
            });

            participant.append(participantEmail, removeButton);
            participantsList.appendChild(participant);
          });

          participantsSection.appendChild(participantsList);
        } else {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "No participants yet.";
          participantsSection.appendChild(emptyMessage);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activity, email, button) {
    const activityCard = button.closest(".activity-card");
    button.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not unregister participant.");
      }

      const participantsList = activityCard.querySelector(".participants-list");
      const removedParticipants = Array.from(participantsList.querySelectorAll("li"))
        .filter((item) => item.dataset.email === email);
      removedParticipants.forEach((item) => item.remove());

      const participantCount = activityCard.querySelector(".participants-count");
      participantCount.textContent = participantsList.children.length;
      const availableSpots = activityCard.querySelector(".activity-availability span");
      availableSpots.textContent =
        Number(activityCard.dataset.maxParticipants) - participantsList.children.length;

      if (participantsList.children.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "participants-empty";
        emptyMessage.textContent = "No participants yet.";
        participantsList.replaceWith(emptyMessage);
      }

      showMessage(result.message, "success");
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Could not unregister participant.";
      showMessage(errorMessage, "error");
      console.error("Error unregistering participant:", error);
    } finally {
      button.disabled = false;
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
