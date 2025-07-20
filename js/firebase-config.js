// js/firebase-config.js
// Import fungsi-fungsi Firebase dari CDN (Modular SDK v9)
// PENTING: Gunakan versi yang konsisten. Saya rekomendasikan 9.6.0 yang lebih stabil
// jika 12.0.0 masih bermasalah dengan error-error tak terduga.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js"; // Untuk Authentication
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-analytics.js"; // Untuk Analytics (opsional)

// Your web app's Firebase configuration (INI BAGIAN YANG UNIK UNTUK PROYEK ANDA)
const firebaseConfig = {
  apiKey: "AIzaSyCaEVRX88dod-9BWHPCq_RTIIHwus-29rQ",
  authDomain: "titipgo-28f84.firebaseapp.com",
  projectId: "titipgo-28f84",
  storageBucket: "titipgo-28f84.firebasestorage.app",
  messagingSenderId: "816687535591",
  appId: "1:816687535591:web:eaecf2fcc994636a319942",
  measurementId: "G-CS3V405F3B",
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Inisialisasi Auth
const analytics = getAnalytics(app); // Inisialisasi Analytics (opsional)

// Export objek dan layanan agar bisa diimpor di file lain
export { app, auth, analytics };
