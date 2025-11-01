// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDhvmtdhl4SNpA8XhvHeK_1mFyVfaEa66k",
  authDomain: "sticky-board-b7062.firebaseapp.com",
  databaseURL: "https://sticky-board-b7062.firebaseio.com",
  projectId: "sticky-board-b7062",
  storageBucket: "sticky-board-b7062.firebasestorage.app",
  messagingSenderId: "1017840154919",
  appId: "1:1017840154919:web:05494ae3b80e71ecf5d102",
  measurementId: "G-CXTXNN5XSM"
};

// Helper to initialize Firebase app if not already initialized
export function initializeFirebaseApp() {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  // Also set it on window for backward compatibility
  window.firebaseConfig = firebaseConfig;
}