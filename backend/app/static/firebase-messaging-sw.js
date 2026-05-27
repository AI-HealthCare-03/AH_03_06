importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCp1JkFkP2JhW7WfFPYGRlrnpv4fRR1_nI",
  authDomain: "viva-1ca82.firebaseapp.com",
  projectId: "viva-1ca82",
  storageBucket: "viva-1ca82.firebasestorage.app",
  messagingSenderId: "447915295628",
  appId: "1:447915295628:web:9c4e49e322443f5d3b0ca9"
});

const messaging = firebase.messaging();