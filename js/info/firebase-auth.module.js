import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
export async function withAuth(f) {
  const auth = getAuth(f.app);
  await auth.authStateReady();
  return {...f,auth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged};
}
