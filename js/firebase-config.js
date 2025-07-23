// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// Konfigurasi Firebase Anda dari Firebase Console
// Menggunakan nilai hardcoded untuk penggunaan lokal
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
