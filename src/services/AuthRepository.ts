import {
  FirebaseAuthTypes,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from '@react-native-firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { getDeviceSnapshot } from './DeviceService';
import { getLocationInfo } from './LocationService';

const auth = getAuth();
const db = getFirestore();

/**
 * Repository to handle all Authentication and User related data operations.
 * Abstracts Firebase implementation details from the rest of the app.
 */
export const AuthRepository = {
  authInstance: auth,

  /**
   * Checks if a user document exists and if the account is disabled.
   */
  async checkUserStatus(uid: string) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const data = userDoc.data();
    return {
      exists: userDoc.exists(),
      disabled: !!data?.disabled,
    };
  },

  /**
   * Primary method to sync Firebase Auth data into the Users collection.
   */
  async ensureUserDoc(currentUser: FirebaseAuthTypes.User) {
    const userRef = doc(db, 'users', currentUser.uid);
    const existing = await getDoc(userRef);
    const existingData = existing.exists() ? existing.data() : null;
    const device = await getDeviceSnapshot();

    const payload = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || '',
      photoURL: currentUser.photoURL || '',
      phoneNumber: currentUser.phoneNumber || '',
      emailVerified: currentUser.emailVerified || false,
      isAnonymous: currentUser.isAnonymous || false,
      providerIds: (currentUser.providerData || []).map((p) => p.providerId),
      providers: (currentUser.providerData || []).map((p) => ({
        providerId: p.providerId,
        uid: p.uid || '',
        displayName: p.displayName || '',
        email: p.email || '',
        phoneNumber: p.phoneNumber || '',
        photoURL: p.photoURL || '',
      })),
      metadata: {
        creationTime: currentUser.metadata?.creationTime || '',
        lastSignInTime: currentUser.metadata?.lastSignInTime || '',
      },
      device,
      createdAt: existingData?.createdAt || serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, payload, { merge: true });

    // Non-blocking location enrichment
    getLocationInfo()
      .then((location) => {
        if (!location) return;
        return setDoc(
          userRef,
          {
            location: location.coords,
            city: location.city || '',
            region: location.region || '',
            country: location.country || '',
            locationUpdatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      })
      .catch((error) => {
        if (__DEV__) {
          console.log('[AuthRepository] Location enrichment error:', error);
        }
      });
  },

  /**
   * Log in with email and password.
   */
  async signIn(email: string, pass: string) {
    return await signInWithEmailAndPassword(auth, email, pass);
  },

  /**
   * Register a new user with email and password.
   */
  async signUp(email: string, pass: string) {
    return await createUserWithEmailAndPassword(auth, email, pass);
  },

  /**
   * Signs in with Google credentials.
   */
  async signInWithGoogle(idToken: string) {
    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
  },

  /**
   * Sends a password reset email.
   */
  async sendResetEmail(email: string) {
    return await sendPasswordResetEmail(auth, email);
  },

  /**
   * Fetches available sign-in methods for a given email.
   */
  async getMethodsForEmail(email: string) {
    return await fetchSignInMethodsForEmail(auth, email);
  },

  /**
   * Logs out the current user.
   */
  async signOut() {
    return await signOut(auth);
  },

  /**
   * Records an account request (e.g., disable or delete).
   */
  async submitAccountRequest(uid: string, email: string, type: 'disable' | 'delete', reason: string) {
    const now = serverTimestamp();
    
    // Update user doc status
    await setDoc(
      doc(db, 'users', uid),
      {
        disabled: true,
        disabledAt: now,
        deleteRequested: true,
        deleteRequestedAt: now,
        deleteAfterDays: 30,
        deleteStatus: type === 'delete' ? 'requested' : 'scheduled',
        deleteReason: reason || '',
      },
      { merge: true }
    );

    // Create central request record
    return await addDoc(collection(db, 'accountRequests'), {
      uid,
      email,
      type,
      reason: reason || '',
      createdAt: now,
    });
  },
};
