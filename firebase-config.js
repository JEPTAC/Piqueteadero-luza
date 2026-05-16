// Reemplaza estos datos con la configuración de tu proyecto Firebase.
// Firebase Console > Project settings > General > Your apps > SDK setup and configuration
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// En true funciona como demo local sin Firebase.
// Cuando pegues la configuración real, cambia a false.
export const DEMO_MODE = true;


// Región de Cloud Functions para crear usuarios internos desde el panel de super admin.
export const FUNCTIONS_REGION = "us-central1";
