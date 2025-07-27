// firebase-config.js
// Impor fungsi-fungsi Firebase dari CDN (Modular SDK v9.23.0).
// Pastikan versi yang digunakan konsisten di seluruh proyek Anda.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
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
    Timestamp,
    writeBatch,
    arrayUnion,
    onSnapshot,
    orderBy // <<< PASTIKAN orderBy diimpor dari firestore
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
    getAuth,
    signInWithCustomToken,
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
// Jika Anda menggunakan Cloud Functions, Anda juga perlu mengimpor ini:
// import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";


// Konfigurasi Firebase Anda dari Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCaEVRX88dod-9BWHPCq_RTIIHwus-29rQ",
    authDomain: "titipgo-28f84.firebaseapp.com",
    projectId: "titipgo-28f84",
    storageBucket: "titipgo-28f84.firebasestorage.app",
    messagingSenderId: "816687535591",
    appId: "1:816687535591:web:eaecf2fcc994636a319942",
    measurementId: "G-CS3V405F3B",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
// Jika Anda menggunakan Cloud Functions, inisialisasi juga:
// const functions = getFunctions(app);


// Autentikasi pengguna saat aplikasi dimuat (khusus untuk lingkungan Canvas)
if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
    signInWithCustomToken(auth, __initial_auth_token)
        .then(() => {
            console.log("Signed in with custom token.");
        })
        .catch((error) => {
            console.error("Error signing in with custom token:", error);
            // Jika custom token gagal, tidak ada fallback ke anonymous sign-in
            // Halaman yang memerlukan autentikasi akan mengarahkan ke login jika tidak ada user
        });
} else {
    // Jika __initial_auth_token tidak didefinisikan, tidak ada upaya sign-in otomatis
    console.log("No initial auth token. User must sign in explicitly.");
}

// Ekspor objek dan layanan agar bisa diimpor di file lain
export {
    app,
    auth,
    analytics,
    db,
    storage,
    // functions, // Ekspor functions jika Anda menginisialisasinya di atas

    // Fungsi Auth
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithCustomToken,
    signInAnonymously,

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
    Timestamp,
    writeBatch,
    arrayUnion,
    onSnapshot,
    orderBy // <<< PASTIKAN orderBy diekspor di sini

    // Fungsi Storage
    // ref,
    // getDownloadURL,
    // uploadBytes,
    // deleteObject
    // httpsCallable // Ekspor httpsCallable jika Anda mengimpornya di atas
};
