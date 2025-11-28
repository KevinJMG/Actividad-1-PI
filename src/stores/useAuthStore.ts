import { create } from 'zustand';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.config';
import UserDAO from "../daos/UserDAO";

export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
}

type AuthStore = {
    user: User | null;
    setUser: (user: User | null) => void;
    initAuthObserver: () => () => void;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
};

const useAuthStore = create<AuthStore>((set) => ({

    user: null,

    setUser: (user) => set({ user }),

    initAuthObserver: () => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {

            // 1️⃣ Crear/actualizar usuario en Firestore
            await UserDAO.createUser({
                uid: fbUser.uid,
                displayName: fbUser.displayName,
                email: fbUser.email,
                photoURL: fbUser.photoURL,
            });

            // 2️⃣ Obtener datos COMPLETOS desde Firestore
            const userFromDb = await UserDAO.getUserById(fbUser.uid);

            // 3️⃣ Guardar en Zustand
            set({ user: userFromDb as any });

        } else {
            set({ user: null });
        }
    });

    return unsubscribe;
},


    loginWithGoogle: async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (e) {
            console.error(e);
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error(e);
        }
    },

}));

export default useAuthStore;
