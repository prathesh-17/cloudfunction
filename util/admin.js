var admin = require("firebase-admin");
var serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://social-app-937b4.firebaseio.com",
  storageBucket: "social-app-937b4.appspot.com"
});

const db=admin.firestore();

module.exports={admin,db}
