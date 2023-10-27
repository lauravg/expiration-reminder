// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const config = {
//   apiKey: "AIzaSyAYMPT3L1RBjUvtGAwzWUUIf5SV7H2Cqgs",
//   authDomain: "pantryguardian-f8381.firebaseapp.com",
//   databaseURL: "https://pantryguardian-f8381-default-rtdb.firebaseio.com",
//   projectId: "pantryguardian-f8381",
//   storageBucket: "pantryguardian-f8381.appspot.com",
//   messagingSenderId: "105128604631",
//   appId: "1:105128604631:web:bd4a7f4f08222ee8db1192",
//   measurementId: "G-J51GW8005K"
// };

// firebase.initializeApp(config);
// // Check if the user is already authenticated
// firebase.auth().onAuthStateChanged(function (user) {
//   if (user) {
//     // User is signed in. You can perform actions for authenticated users here.
//     const displayName = user.displayName;
//     const email = user.email;
//     const uid = user.uid;

//     // Update your UI to show the user is authenticated and display their information.
//     // For example, show a "Sign Out" button and display the user's name.
//     showAuthenticatedUI(displayName);
//   } else {
//     // User is signed out. Update your UI to show that the user is not authenticated.
//     // For example, show a "Sign In" button.
//     showUnauthenticatedUI();
//   }
// });


// // Function to handle user sign-up
// function signUp(email, password) {
//   firebase
//     .auth()
//     .createUserWithEmailAndPassword(email, password)
//     .then((user) => {
//       // User has successfully signed up
//       // You can handle additional actions like sending a verification email.
//     })
//     .catch(function (error) {
//       // Handle errors during sign-up, e.g., invalid email, password too short, etc.
//       console.error(error.message);
//     });
// }

// // Function to handle user sign-in
// function signIn(email, password) {
//   firebase
//     .auth()
//     .signInWithEmailAndPassword(email, password)
//     .then((user) => {
//       // User has successfully signed in
//     })
//     .catch(function (error) {
//       // Handle errors during sign-in, e.g., incorrect password, user not found, etc.
//       console.error(error.message);
//     });
// }

// // Assuming you have a "Sign Out" button with id="signOutButton"
// document.getElementById('signOutButton').addEventListener('click', function () {
//   firebase.auth().signOut().then(function () {
//     // Sign-out successful.
//     // You can update your UI accordingly, e.g., hide the "Sign Out" button.
//   }).catch(function (error) {
//     // An error happened. Handle the error, if necessary.
//   });
// });

// // Other functions related to user management can be added here, such as password reset, email verification, etc.
