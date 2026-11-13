import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

let cachedGoogleAccessToken: string | null = null;
let isSigningIn = false;

export function subscribeAuth(
  onAuthenticated: (user: User) => void,
  onUnauthenticated: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onAuthenticated(user);
    } else if (!isSigningIn) {
      cachedGoogleAccessToken = null;
      onUnauthenticated();
    }
  });
}

export async function googleSignIn(): Promise<{
  user: User;
  googleAccessToken: string | null;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedGoogleAccessToken = credential?.accessToken ?? null;
    return {
      user: result.user,
      googleAccessToken: cachedGoogleAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
}

export async function refreshGoogleSheetsToken(): Promise<string> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Gagal mendapatkan token akses Google Sheets. Silakan coba lagi.');
  }
  cachedGoogleAccessToken = credential.accessToken;
  return cachedGoogleAccessToken;
}

export function getGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pengguna belum login.');
  }
  return await user.getIdToken();
}

export async function logout(): Promise<void> {
  cachedGoogleAccessToken = null;
  await signOut(auth);
}
