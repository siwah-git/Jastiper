// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

<<<<<<< HEAD
// Konfigurasi Firebase Anda dari Firebase Console
// Menggunakan nilai hardcoded untuk penggunaan lokal
=======
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
>>>>>>> d7f2f82e32093a3ff9fa634514ba2263a8590fc0
const firebaseConfig = {
    apiKey: "AlzaSyCaEVRX88dod-9BWHPCq_RTIIHwus-29rQ", // Web API Key Anda
    authDomain: "titipgo-28f84.firebaseapp.com",
    projectId: "titipgo-28f84", // Project ID Anda
    storageBucket: "titipgo-28f84.appspot.com",
    messagingSenderId: "816687535591", // Project number Anda
    appId: "1:816687535591:web:YOUR_ACTUAL_APP_ID_HERE" // Ganti dengan App ID Anda yang sebenarnya dari Firebase Console
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
<<<<<<< HEAD
const db = getFirestore(app);
const auth = getAuth(app);

// Autentikasi pengguna saat aplikasi dimuat
// Untuk penggunaan lokal, kita akan langsung mencoba signInAnonymously atau Anda bisa menambahkan logika login/register
if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
    signInWithCustomToken(auth, __initial_auth_token)
        .then(() => {
            console.log("Signed in with custom token.");
        })
        .catch((error) => {
            console.error("Error signing in with custom token:", error);
            // Fallback to anonymous sign-in if custom token fails
            signInAnonymously(auth)
                .then(() => console.log("Signed in anonymously."))
                .catch(e => console.error("Error signing in anonymously:", e));
        });
} else {
    signInAnonymously(auth)
        .then(() => console.log("Signed in anonymously."))
        .catch(e => console.error("Error signing in anonymously:", e));
}

export { db, auth, app }; // Menghapus appId dari export karena tidak digunakan di tempat lain
=======
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
>>>>>>> d7f2f82e32093a3ff9fa634514ba2263a8590fc0
