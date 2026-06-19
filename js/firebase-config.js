// Configuración de Firebase para SÖLEA Wellness Spa
// Reemplaza los siguientes valores con las credenciales de tu proyecto de Firebase

const firebaseConfig = {
    apiKey: "AIzaSyBz75llqhQ4dfN40GuGGpkqQXZLCmNCpw8",
    authDomain: "nua-wellness-spa.firebaseapp.com",
    projectId: "nua-wellness-spa",
    storageBucket: "nua-wellness-spa.firebasestorage.app",
    messagingSenderId: "318752031802",
    appId: "1:318752031802:web:27c0c08229735fb3fba103"
};

// Inicializar Firebase
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    console.error("Firebase SDK no está cargado. Asegúrate de incluir las librerías CDN en tu HTML.");
}

// Exportar referencias globales para facilitar el acceso
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Configuración de proveedores de OAuth
const googleProvider = typeof firebase !== 'undefined' ? new firebase.auth.GoogleAuthProvider() : null;
