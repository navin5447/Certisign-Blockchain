import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDTKHl5xGxIuO0j_xe0dhy_sWE2DPghp58",
  authDomain: "studio-6480533250-a14db.firebaseapp.com",
  projectId: "studio-6480533250-a14db",
  storageBucket: "studio-6480533250-a14db.firebasestorage.app",
  messagingSenderId: "274911410829",
  appId: "1:274911410829:web:1f974b3a68523548ec80c4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
