// UserDAO.ts
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection } from "firebase/firestore";
import type { CollectionReference } from "firebase/firestore";
import { auth, db } from "../../lib/firebase.config";


export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    createdAt?: any;
    updatedAt?: any;
}

export type UserCreate = Omit<User, "createdAt" | "updatedAt">;
export type UserUpdate = Partial<Omit<User, "uid" | "createdAt">>;

export default class UserDAO {
    private static collectionRef: CollectionReference = collection(db, "users");

    // 👉 Crear o actualizar usuario
    static async createUser(user: UserCreate) {
    const ref = doc(this.collectionRef, user.uid);

    const data = {
        ...user,
        displayName: user.displayName || "Usuario sin nombre",
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "U")}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(ref, data, { merge: true });

    console.log("🔥 User creado/actualizado en Firestore:", data);
}

    static async getUserById(uid: string) {
        const snap = await getDoc(doc(this.collectionRef, uid));
        return snap.exists() ? snap.data() : null;
    }

    static async updateUser(uid: string, data: UserUpdate) {
        await updateDoc(doc(this.collectionRef, uid), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }

    static async deleteUser(uid: string) {
        await deleteDoc(doc(this.collectionRef, uid));
    }
}
