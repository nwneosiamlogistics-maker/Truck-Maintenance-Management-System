import firebase from "firebase/compat/app";
import "firebase/compat/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxqc0hsn2F9deBxD4y4HOI_Zn0q1Grtug",
  authDomain: "maintenanceneosiam.firebaseapp.com",
  databaseURL: "https://maintenanceneosiam-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maintenanceneosiam",
  storageBucket: "maintenanceneosiam.appspot.com",
  messagingSenderId: "655666667957",
  appId: "1:655666667957:web:e577f257d966e4c0f3b9fc"
};

// FIX: Switched to the Firebase compatibility library to resolve a module resolution error with 'initializeApp'.
// The compat library provides the v8 API surface on top of the v9 SDK.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export const database = firebase.database();