// Public Firebase web config (safe to expose; access is enforced by firestore.rules + server functions).
window.ARX_FIREBASE={
  config:{
    apiKey:"AIzaSyDPzPJMKT7hWd871_pVuir7eU1o1GiEJ5g",
    authDomain:"ar-x-mine.firebaseapp.com",
    projectId:"ar-x-mine",
    storageBucket:"ar-x-mine.firebasestorage.app",
    messagingSenderId:"1037758394704",
    appId:"1:1037758394704:web:e99fd0605dcdd96d427c55",
    measurementId:"G-QNCXHXSN71"
    // Cloud Firestore needs no databaseURL: it uses projectId. (Create it once in Firebase Console > Build > Firestore Database.)
  },
  // Accounts with these emails get admin access automatically once the email is VERIFIED (also enforced in firestore.rules + server functions).
  adminEmails:["atarafatyt1@gmail.com"],
  sdkVersion:"13.4.0",
  enableAnalytics:false   // set true only after Analytics is enabled for this project
};
