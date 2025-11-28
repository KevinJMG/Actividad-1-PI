import React, { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase.config";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
  where,
} from "firebase/firestore";

type ChatMessage = {
  uid: string;
  message: string;
  timestamp: string;
  name?: string;
  photo?: string;
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    name: string;
    photo?: string;
  } | null>(null);

  // Timestamp de entrada para filtrar mensajes antiguos
  const [enterTimestamp] = useState(() => new Date());

  // Inicializar usuario actual y guardarlo en Firestore si no existe
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userData = {
      uid: user.uid,
      name: user.displayName || "Anónimo",
      photo: user.photoURL || "",
      email: user.email,
      createdAt: new Date().toISOString(),
      role: "participant",
      status: "active",
    };

    setCurrentUser({
      uid: user.uid,
      name: user.displayName || "Anónimo",
      photo: user.photoURL || "",
    });

    const userRef = doc(db, "users", user.uid);
    getDoc(userRef).then((docSnap) => {
      if (!docSnap.exists()) {
        setDoc(userRef, userData);
      }
    });
  }, []);

  // Escuchar mensajes en tiempo real desde el momento que entra el usuario
  useEffect(() => {
    if (!currentUser) return;

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("timestamp", ">", enterTimestamp.toISOString()), // <-- solo mensajes nuevos
      orderBy("timestamp")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as ChatMessage;
          const userRef = doc(db, "users", data.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          return {
            ...data,
            name: userData.displayName || "Anónimo",
            photo: userData.photoURL || "",
          };
        })
      );
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [currentUser, enterTimestamp]);

  // Enviar mensaje a Firestore
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = messageDraft.trim();
    if (!trimmedMessage || !currentUser) return;

    await addDoc(collection(db, "messages"), {
      uid: currentUser.uid,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    });

    setMessageDraft("");
  };

  return (
    <div className="container-page">
      <div className="flex flex-col gap-4 w-full">
        <h1>EISC Meet</h1>
        <div className="w-full h-64 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm overflow-y-auto flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400">
              Aquí verás los mensajes del chat a partir de que te unes...
            </p>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.uid === currentUser?.uid;
              const time = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={`${msg.timestamp}-${index}`}
                  className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  {!isOwn && msg.photo && (
                    <img
                      src={msg.photo}
                      alt="avatar"
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isOwn
                        ? "bg-purple-600 text-white text-right"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {msg.name} · {time}
                    </div>
                    <div className="whitespace-pre-wrap wrap-break-word">
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSendMessage}
          className="flex flex-col sm:flex-row gap-2 w-full"
        >
          <input
            className="flex-1 rounded border border-gray-200 dark:border-gray-700 
                      bg-white dark:bg-gray-900 p-2 text-sm 
                      text-black dark:text-white 
                      focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Escribe tu mensaje aquí"
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
          />

          <button
            type="submit"
            className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
