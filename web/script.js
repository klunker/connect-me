// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBeg25IORosT50xB-d4eWLE5V1TmvwPJoE",
  authDomain: "connectme-app-38337.firebaseapp.com",
  projectId: "connectme-app-38337",
  storageBucket: "connectme-app-38337.firebasestorage.app",
  messagingSenderId: "1074216632481",
  appId: "1:1074216632481:web:5cce1ea079afa9f80770e0",
  measurementId: "G-QQYV7RRJP4"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Sign in anonymously
firebase.auth().signInAnonymously()
  .then(() => {
    console.log('Anonymous sign‑in successful');
    loadEvents();
  })
  .catch((error) => {
    console.error('Auth error:', error);
  });

// Load events from Firestore and render them
function loadEvents() {
  const db = firebase.firestore();
  const listEl = document.getElementById('event-list');
  db.collection('events')
    .orderBy('createdAt', 'desc')
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
          <h3 class="event-title">${data.title}</h3>
          <p class="event-organizer">Organizer: ${data.organizerName || '—'}</p>
          <p class="event-date">${data.startAt?.toDate?.().toLocaleString() || ''}</p>
        `;
        listEl.appendChild(card);
      });
    })
    .catch((err) => {
      console.error('Error loading events:', err);
    });
}
