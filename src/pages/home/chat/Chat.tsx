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

/**
 * Tipo de mensaje almacenado 
 */
type ChatMessage = {
  uid: string;
  message: string;
  timestamp: string;
  name?: string;
  photo?: string;
};

const Chat: React.FC = () => {
  // Lista de mensajes cargados 
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Valor actual del input del chat (mensaje en escritura)
  const [messageDraft, setMessageDraft] = useState("");

  // Información del usuario actualmente logueado
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    name: string;
    photo?: string;
  } | null>(null);

  /**
   * Timestamp de entrada.
   * Se usa para filtrar mensajes y mostrar SOLO los que llegan desde que el usuario entra.
   */
  const [enterTimestamp] = useState(() => new Date());


  // 1. Inicializar usuario actual y registrarlo en Firestore si no existe
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Objeto con datos base del usuario
    const userData = {
      uid: user.uid,
      name: user.displayName || "Anónimo",
      photo: user.photoURL || "",
      email: user.email,
      createdAt: new Date().toISOString(),
      role: "participant",
      status: "active",
    };

    // Guardamos usuario en el estado local
    setCurrentUser({
      uid: user.uid,
      name: user.displayName || "Anónimo",
      photo: user.photoURL || "",
    });

    // Verificar si el usuario ya existe en Firestore
    const userRef = doc(db, "users", user.uid);
    getDoc(userRef).then((docSnap) => {
      if (!docSnap.exists()) {
        // Si no existe, lo registramos
        setDoc(userRef, userData);
      }
    });
  }, []);

  
  // 2. Escuchar mensajes en tiempo real 

  useEffect(() => {
    if (!currentUser) return;

    const messagesRef = collection(db, "messages");

    /**
     * Query:
     * - Filtrar mensajes que llegaron después de que el usuario entró
     * - Ordenarlos por timestamp
     */
    const q = query(
      messagesRef,
      where("timestamp", ">", enterTimestamp.toISOString()),
      orderBy("timestamp")
    );

    /**
     * Suscribirnos a cambios en tiempo real (onSnapshot)
     */
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Para cada mensaje consultamos la info del usuario que lo envió
      const msgs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as ChatMessage;

          // Obtener datos del usuario que envió el mensaje
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

    return () => unsubscribe(); // Limpieza del listener
  }, [currentUser, enterTimestamp]);

  
  // 3. Enviar mensaje 
  
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedMessage = messageDraft.trim();
    if (!trimmedMessage || !currentUser) return;

    // Guardar el mensaje 
    await addDoc(collection(db, "messages"), {
      uid: currentUser.uid,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    });

    // Limpiar input
    setMessageDraft("");
  };

  return (
    <div className="container-page">
      <div className="flex flex-col gap-4 w-full">
        <h1>EISC Meet</h1>

        {/* Contenedor del chat */}
        <div className="w-full h-64 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm overflow-y-auto flex flex-col gap-3">

          {/* Mensaje inicial */}
          {messages.length === 0 ? (
            <p className="text-center text-gray-400">
              Aquí verás los mensajes del chat a partir de que te unes...
            </p>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.uid === currentUser?.uid;

              return (
                <div
                  key={`${msg.timestamp}-${index}`}
                  className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar del otro usuario */}
                  {!isOwn && msg.photo && (
                    <img
                      src={msg.photo}
                      alt="avatar"
                      className="w-6 h-6 rounded-full"
                    />
                  )}

                  {/* Burbuja del mensaje */}
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isOwn
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 dark:text-white"
                    }`}
                  >
                    <p>{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input para enviar mensajes */}
        <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2 w-full">
          <input
            className="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-black dark:text-white"
            placeholder="Escribe tu mensaje aquí"
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
          />
          <button className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
