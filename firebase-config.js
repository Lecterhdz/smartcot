// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - FIREBASE CONFIG (Para Licencias)
// ─────────────────────────────────────────────────────────────────────

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ⚠️ REEMPLAZA CON TU CONFIG DE FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "smartcot.firebaseapp.com",
    projectId: "smartcot",
    storageBucket: "smartcot.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Exportar para uso global
window.firebaseApp = firebaseApp;
window.auth = auth;
window.firebaseDB = db;

console.log('✅ Firebase configurado - SmartCot');