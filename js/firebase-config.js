// js/firebase-config.js

// Impor fungsi-fungsi Firebase dari CDN (Modular SDK v9.6.10)
// Pastikan versi yang digunakan konsisten di seluruh proyek Anda.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp // <--- Pastikan Timestamp diimpor di sini
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";

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
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Ekspor objek dan layanan agar bisa diimpor di file lain
export {
  app,
  auth,
  analytics,
  db,
  storage,

  // Fungsi Auth
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,

  // Fungsi Firestore
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp, // <--- Pastikan Timestamp diekspor di sini

  // Fungsi Storage
  ref,
  getDownloadURL,
  uploadBytes,
  deleteObject
};
