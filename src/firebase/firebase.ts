// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBsMrz-2JdNTQTynoMit4g4wVWHUbjfkPs",
  authDomain: "admindashboard-f3d44.firebaseapp.com",
  projectId: "admindashboard-f3d44",
  storageBucket: "admindashboard-f3d44.firebasestorage.app",
  messagingSenderId: "313657688635",
  appId: "1:313657688635:web:826ed6dd6a1bad2215921e",
  measurementId: "G-LWTZ5G85VC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);