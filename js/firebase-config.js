// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaEVRX88dod-9BWHPCq_RTIIHwus-29rQ",
  authDomain: "titipgo-28f84.firebaseapp.com",
  projectId: "titipgo-28f84",
  storageBucket: "titipgo-28f84.firebasestorage.app",
  messagingSenderId: "816687535591",
  appId: "1:816687535591:web:eaecf2fcc994636a319942",
  measurementId: "G-CS3V405F3B",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
