// Configuración de Firebase para SÖLEA Wellness Spa
// Reemplaza los siguientes valores con las credenciales de tu proyecto de Firebase

const firebaseConfig = {
    apiKey: "AIzaSyCM4X4OwJWo21tS-4pbQZfKu87zod8uwTA",
    authDomain: "solea-wellness-spa.firebaseapp.com",
    projectId: "solea-wellness-spa",
    storageBucket: "solea-wellness-spa.firebasestorage.app",
    messagingSenderId: "501062864931",
    appId: "1:501062864931:web:df3dee46448d3b87f16196"
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
