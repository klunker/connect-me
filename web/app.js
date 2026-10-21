import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";
import { translations } from "./translations.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// State
let currentLang = detectLanguage();
let currentEventId = getEventIdFromHash();
let currentUser = null;
let currentEventData = null;
let participantsList = [];
let activeTab = "going"; // 'going' or 'not_going'
let unsubscribeEvent = null;
let unsubscribeParticipants = null;

// DOM Elements
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const eventContent = document.getElementById("event-content");
const eventStatusBadge = document.getElementById("event-status-badge");
const eventStatusText = document.getElementById("event-status-text");
const eventTitle = document.getElementById("event-title");
const eventDescription = document.getElementById("event-description");
const eventOrganizer = document.getElementById("event-organizer");
const eventDate = document.getElementById("event-date");
const eventLocation = document.getElementById("event-location");
const quorumNumbers = document.getElementById("quorum-numbers");
const quorumFill = document.getElementById("quorum-fill");
const quorumFooter = document.getElementById("quorum-footer");
const participantNameInput = document.getElementById("participant-name-input");
const btnGoing = document.getElementById("btn-going");
const btnNotGoing = document.getElementById("btn-not-going");
const currentRsvpBanner = document.getElementById("current-rsvp-banner");
const currentRsvpText = document.getElementById("current-rsvp-text");
const btnChangeRsvp = document.getElementById("btn-change-rsvp");
const rsvpForm = document.getElementById("rsvp-form");
const tabGoingBtn = document.getElementById("tab-going");
const tabNotGoingBtn = document.getElementById("tab-not-going");
const tabGoingCount = document.getElementById("tab-going-count");
const tabNotGoingCount = document.getElementById("tab-not-going-count");
const participantsUl = document.getElementById("participants-list");
const toast = document.getElementById("toast");
const btnInstallApp = document.getElementById("btn-install-app");

// Initialize Language
function detectLanguage() {
  const saved = localStorage.getItem("connectme_lang");
  if (saved && translations[saved]) return saved;

  const browserLang = (navigator.language || "pl").toLowerCase();
  if (browserLang.startsWith("en")) return "en";
  if (browserLang.startsWith("uk") || browserLang.startsWith("ua")) return "uk";
  if (browserLang.startsWith("ru")) return "ru";
  return "pl";
}

function t(key) {
  const dict = translations[currentLang] || translations.pl || translations.en;
  return dict[key] || translations.pl[key] || translations.en[key] || key;
}

function updateUiText() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });

  // Update language selector buttons
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
  });

  // Re-render event and participants with new locale
  if (currentEventData) {
    renderEvent(currentEventData);
    renderParticipants(participantsList);
  }
}

window.switchLanguage = function (lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("connectme_lang", lang);
  updateUiText();
};

// URL Hash Parser
function getEventIdFromHash() {
  const hash = window.location.hash || "";
  const match = hash.match(/#\/event\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Default fallback for demo / testing if no hash given
  return "demo-basketball-001";
}

// Toast notification
function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

// Date Formatter
function formatDateTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const localeMap = { en: "en-US", pl: "pl-PL", uk: "uk-UA", ru: "ru-RU" };
  const locale = localeMap[currentLang] || "en-US";

  return date.toLocaleString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Render Event Details
function renderEvent(event) {
  currentEventData = event;
  eventTitle.textContent = event.title || "";

  if (event.description) {
    eventDescription.textContent = event.description;
    eventDescription.classList.remove("hidden");
  } else {
    eventDescription.classList.add("hidden");
  }

  eventOrganizer.textContent = t("organizer");
  if (event.creatorId) {
    getDoc(doc(db, "users", event.creatorId))
      .then((userSnap) => {
        if (userSnap.exists() && userSnap.data().displayName) {
          eventOrganizer.textContent = userSnap.data().displayName;
        } else if (event.creatorName) {
          eventOrganizer.textContent = event.creatorName;
        }
      })
      .catch(() => {
        if (event.creatorName) eventOrganizer.textContent = event.creatorName;
      });
  } else if (event.creatorName) {
    eventOrganizer.textContent = event.creatorName;
  }
  eventDate.textContent = formatDateTime(event.dateTime);
  eventLocation.textContent = event.location || "";

  // Status Badge
  const status = event.status || "open";
  eventStatusBadge.className = `status-badge ${status}`;
  const statusMap = {
    open: t("statusOpen"),
    confirmed: t("statusConfirmed"),
    cancelled: t("statusCancelled"),
    past: t("statusPast")
  };
  eventStatusText.textContent = statusMap[status] || status;

  // Deep Link CTA
  btnInstallApp.href = `connectme://event/${currentEventId}`;
}

// Render Quorum
function updateQuorum() {
  const required = currentEventData ? currentEventData.requiredCount || 10 : 10;
  const goingParticipants = participantsList.filter((p) => p.status === "going" || p.status === "confirmed");
  const goingCount = goingParticipants.length;

  quorumNumbers.innerHTML = `<span class="accent">${goingCount}</span> / ${required} ${t("people")}`;

  const percent = Math.min(100, Math.round((goingCount / required) * 100));
  quorumFill.style.width = `${percent}%`;

  if (goingCount >= required) {
    quorumFooter.textContent = `🎉 ${t("quorumReached")}`;
    quorumFill.style.background = "linear-gradient(90deg, #0284c7, #0369a1)";
  } else {
    const remaining = required - goingCount;
    quorumFooter.textContent = `${t("remaining")}: ${remaining}`;
    quorumFill.style.background = "linear-gradient(90deg, #0284c7, #38bdf8)";
  }
}

// Render Participants List
function renderParticipants(list) {
  participantsList = list;
  updateQuorum();

  const going = list.filter((p) => p.status === "going" || p.status === "confirmed");
  const notGoing = list.filter((p) => p.status === "not_going");

  tabGoingCount.textContent = going.length;
  tabNotGoingCount.textContent = notGoing.length;

  const currentList = activeTab === "going" ? going : notGoing;
  participantsUl.innerHTML = "";

  if (currentList.length === 0) {
    participantsUl.innerHTML = `<li class="empty-state">${t("noParticipantsYet")}</li>`;
  } else {
    currentList.forEach((item) => {
      const li = document.createElement("li");
      li.className = "participant-item";

      const initial = (item.displayName || "?").charAt(0).toUpperCase();
      const badgeText = item.isGuest ? t("guestBadge") : t("memberBadge");
      const badgeClass = item.isGuest ? "badge-guest" : "badge-registered";

      li.innerHTML = `
        <div class="participant-info">
          <div class="avatar-circle">${initial}</div>
          <span class="participant-name">${escapeHtml(item.displayName || "")}</span>
        </div>
        <div class="participant-badges">
          <span class="${badgeClass}">${badgeText}</span>
        </div>
      `;
      participantsUl.appendChild(li);
    });
  }

  // Update current user's RSVP status card
  checkMyRsvp();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Check current user's RSVP
function checkMyRsvp() {
  if (!currentUser) return;
  const myResponse = participantsList.find((p) => p.userId === currentUser.uid);

  if (myResponse) {
    rsvpForm.classList.add("hidden");
    currentRsvpBanner.classList.remove("hidden");
    currentRsvpBanner.className = `rsvp-current ${myResponse.status}`;

    if (myResponse.status === "going" || myResponse.status === "confirmed") {
      currentRsvpText.textContent = `✓ ${t("youAreGoing")}`;
    } else {
      currentRsvpText.textContent = `✗ ${t("youAreNotGoing")}`;
    }

    if (myResponse.displayName) {
      participantNameInput.value = myResponse.displayName;
    }
  } else {
    currentRsvpBanner.classList.add("hidden");
    rsvpForm.classList.remove("hidden");
  }
}

// Handle RSVP Submit
async function submitRsvp(status) {
  const name = participantNameInput.value.trim();
  if (!name) {
    showToast(t("nameRequiredError"), "error");
    participantNameInput.focus();
    return;
  }

  if (!currentUser) {
    showToast(t("saveError"), "error");
    return;
  }

  btnGoing.disabled = true;
  btnNotGoing.disabled = true;

  try {
    localStorage.setItem("connectme_guest_name", name);

    const participantRef = doc(db, "events", currentEventId, "participants", currentUser.uid);
    await setDoc(
      participantRef,
      {
        userId: currentUser.uid,
        displayName: name,
        status: status, // 'going' or 'not_going'
        isGuest: true,
        respondedAt: serverTimestamp()
      },
      { merge: true }
    );

    showToast(t("saveSuccess"), "success");
  } catch (error) {
    console.error("Error saving RSVP:", error);
    showToast(`${t("saveError")}: ${error.message}`, "error");
  } finally {
    btnGoing.disabled = false;
    btnNotGoing.disabled = false;
  }
}

// Event Listeners
btnGoing.addEventListener("click", () => submitRsvp("going"));
btnNotGoing.addEventListener("click", () => submitRsvp("not_going"));

btnChangeRsvp.addEventListener("click", () => {
  currentRsvpBanner.classList.add("hidden");
  rsvpForm.classList.remove("hidden");
});

tabGoingBtn.addEventListener("click", () => {
  activeTab = "going";
  tabGoingBtn.classList.add("active");
  tabNotGoingBtn.classList.remove("active");
  renderParticipants(participantsList);
});

tabNotGoingBtn.addEventListener("click", () => {
  activeTab = "not_going";
  tabNotGoingBtn.classList.add("active");
  tabGoingBtn.classList.remove("active");
  renderParticipants(participantsList);
});

// Hash change listener
window.addEventListener("hashchange", () => {
  const newId = getEventIdFromHash();
  if (newId !== currentEventId) {
    currentEventId = newId;
    startSubscriptions();
  }
});

// Subscriptions
function startSubscriptions() {
  if (unsubscribeEvent) unsubscribeEvent();
  if (unsubscribeParticipants) unsubscribeParticipants();

  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");
  eventContent.classList.add("hidden");

  // Subscribe to Event Document
  const eventDocRef = doc(db, "events", currentEventId);
  unsubscribeEvent = onSnapshot(
    eventDocRef,
    (snapshot) => {
      loadingState.classList.add("hidden");
      if (!snapshot.exists()) {
        errorState.classList.remove("hidden");
        eventContent.classList.add("hidden");
        return;
      }

      errorState.classList.add("hidden");
      eventContent.classList.remove("hidden");
      renderEvent(snapshot.data());
    },
    (error) => {
      console.error("Event snapshot error:", error);
      loadingState.classList.add("hidden");
      errorState.classList.remove("hidden");
      eventContent.classList.add("hidden");
    }
  );

  // Subscribe to Participants Subcollection
  const participantsRef = collection(db, "events", currentEventId, "participants");
  unsubscribeParticipants = onSnapshot(
    participantsRef,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderParticipants(list);
    },
    (error) => {
      console.error("Participants snapshot error:", error);
    }
  );
}

// Initial Auth & Setup
async function init() {
  // Pre-fill name from localStorage
  const savedName = localStorage.getItem("connectme_guest_name");
  if (savedName) participantNameInput.value = savedName;

  updateUiText();

  // Anonymous Sign In
  try {
    await signInAnonymously(auth);
  } catch (err) {
    console.error("Anonymous auth error:", err);
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      checkMyRsvp();
    }
  });

  startSubscriptions();
}

init();
