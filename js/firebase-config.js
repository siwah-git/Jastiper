// js/firebase-config.js

// Impor fungsi-fungsi Firebase dari CDN (Modular SDK v9)
// Pastikan versi yang digunakan konsisten di seluruh proyek Anda.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js"; // Untuk Authentication
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-analytics.js"; // Untuk Analytics (opsional)
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc // Menambahkan setDoc jika Anda menggunakannya untuk menyimpan data
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js"; // Untuk Cloud Firestore

// Konfigurasi Firebase aplikasi web Anda (INI BAGIAN YANG UNIK UNTUK PROYEK ANDA)
const firebaseConfig = {
  apiKey: "AIzaSyCaEVRX88dod-9BWHPCq_RTIIHwus-29rQ",
  authDomain: "titipgo-28f84.firebaseapp.com",
  projectId: "titipgo-28f84",
  storageBucket: "titipgo-28f84.firebasestorage.app",
  messagingSenderId: "816687535591",
  appId: "1:816687535591:web:eaecf2fcc994636a319942",
  measurementId: "G-CS3V405F3B",
};

// Inisialisasi layanan Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Inisialisasi Auth
const analytics = getAnalytics(app); // Inisialisasi Analytics (opsional)
const db = getFirestore(app); // Inisialisasi Firestore

// Ekspor objek dan layanan agar bisa diimpor di file lain
export {
  app,
  auth,
  analytics,
  db,
  // Ekspor fungsi-fungsi Firestore agar bisa digunakan langsung
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc // Mengekspor setDoc
};
