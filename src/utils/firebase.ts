import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppStateData } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export { onAuthStateChanged, type User };

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Critical: export db with specific firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is unreachable.');
    }
  }
}

// Google Sign-in helper
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Sync / create user profile
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      const userProfilePayload = {
        userId: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || 'Pengguna Apotek',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userRef, userProfilePayload, { merge: true });
    }
    return result.user;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid || 'auth'}`);
    throw err;
  }
}

// Sign-out helper
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

// Cloud State Save Helper
export async function saveAppStateToCloud(
  userId: string,
  appState: AppStateData,
  namaApotek?: string
): Promise<void> {
  const path = `users/${userId}/cloudState/current`;
  try {
    const docRef = doc(db, 'users', userId, 'cloudState', 'current');
    const payload = {
      userId,
      namaApotek: namaApotek || appState.settings.namaApotek || 'Apotek',
      payloadJson: JSON.stringify(appState),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud State Load Helper
export async function loadAppStateFromCloud(userId: string): Promise<AppStateData | null> {
  const path = `users/${userId}/cloudState/current`;
  try {
    const docRef = doc(db, 'users', userId, 'cloudState', 'current');
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data?.payloadJson) {
      return JSON.parse(data.payloadJson) as AppStateData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Real-time Cloud State Listener
export function subscribeToCloudState(
  userId: string,
  onData: (state: AppStateData, updatedAt: string) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/cloudState/current`;
  const docRef = doc(db, 'users', userId, 'cloudState', 'current');
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.payloadJson) {
          try {
            const parsed = JSON.parse(data.payloadJson) as AppStateData;
            onData(parsed, data.updatedAt || new Date().toISOString());
          } catch (e) {
            console.error('Failed to parse cloud payload json:', e);
          }
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
  return unsubscribe;
}
