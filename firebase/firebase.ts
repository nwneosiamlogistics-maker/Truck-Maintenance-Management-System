import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
export const database = getDatabase(app);
