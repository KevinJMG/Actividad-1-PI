import Peer from "simple-peer/simplepeer.min.js";
import io from "socket.io-client";

// URLs del servidor WebRTC y configuración de ICE
const serverWebRTCUrl = import.meta.env.VITE_WEBRTC_URL;
const iceServerUrl = import.meta.env.VITE_ICE_SERVER_URL;
const iceServerUsername = import.meta.env.VITE_ICE_SERVER_USERNAME;
const iceServerCredential = import.meta.env.VITE_ICE_SERVER_CREDENTIAL;

let socket = null;          // Conexión WebSocket con el servidor de señalización
let peers = {};             // Lista de peers conectados, con sus conexiones WebRTC
export let localMediaStream = null; // Stream local (cámara, micrófono o pantalla)

// Inicializa WebRTC y establece la conexión WebSocket
export const initWebRTC = async () => {
  if (Peer.WEBRTC_SUPPORT) {
    try {
      // Obtiene el stream local (cámara o pantalla con audio)
      localMediaStream = await getMedia();
      window.localStream = localMediaStream;

      // Inicia conexión con el servidor de señalización
      initSocketConnection();
    } catch (error) {
      console.error("Failed to initialize WebRTC connection:", error);
    }
  } else {
    console.warn("WebRTC is not supported in this browser.");
  }
};

// Permite actualizar manualmente el stream local
export function setLocalMediaStream(stream) {
  localMediaStream = stream;
}

// Intenta obtener cámara y micrófono. Si falla, usa pantalla y agrega micrófono si existe.
async function getMedia() {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    console.warn("No hay cámara. Usando pantalla como fallback.");

    try {
      // Captura pantalla sin audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Intento adicional de obtener solo audio
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Inserta las pistas de audio dentro del stream de pantalla
        audioStream.getAudioTracks().forEach(t => {
          screenStream.addTrack(t);
        });

      } catch {
        console.warn("No hay micrófono, solo pantalla será compartida.");
      }

      return screenStream;

    } catch (err2) {
      console.error("Ni cámara ni pantalla disponibles:", err2);
      throw err2;
    }
  }
}

// Conecta al servidor WebSocket y registra eventos
function initSocketConnection() {
  socket = io(serverWebRTCUrl);

  // Lista inicial de usuarios conectados
  socket.on("introduction", handleIntroduction);

  // Un nuevo usuario se conecta
  socket.on("newUserConnected", handleNewUserConnected);

  // Un usuario se desconecta
  socket.on("userDisconnected", handleUserDisconnected);

  // Señalización WebRTC (SDP/ICE)
  socket.on("signal", handleSignal);
}

// Cuando entramos al servidor, recibimos la lista de usuarios ya conectados
function handleIntroduction(ids) {
  ids.forEach(theirId => {
    if (theirId !== socket.id) {
      // Creamos conexión WebRTC como iniciador
      peers[theirId] = { peerConnection: createPeerConnection(theirId, true) };

      // Crea elementos de video/audio en la interfaz para este usuario
      createClientMediaElements(theirId);
    }
  });
}

// Cuando un nuevo usuario se conecta
function handleNewUserConnected(id) {
  // Evitamos crear conexión con nosotros mismos
  if (id !== socket.id && !(id in peers)) {
    peers[id] = {};

    // Prepara el contenedor visual para ese usuario
    createClientMediaElements(id);
  }
}

// Cuando un usuario abandona la sala
function handleUserDisconnected(id) {
  if (id !== socket.id) {
    // Elimina su video/audio de la interfaz
    removeClientAudioElement(id);

    // Elimina su peer de la lista
    delete peers[id];
  }
}

// Maneja señales WebRTC (SDP/ICE) entrantes
function handleSignal(to, from, data) {
  if (to !== socket.id) return;

  let peer = peers[from];

  // Si ya existe el peer, envía la señal
  if (peer && peer.peerConnection) {
    peer.peerConnection.signal(data);

  } else {
    // Si aún no existe, crea una conexión en modo no-initiator
    let peerConnection = createPeerConnection(from, false);
    peers[from] = { peerConnection };

    // Aplica la señal recibida
    peerConnection.signal(data);
  }
}

// Crea una conexión WebRTC usando SimplePeer
function createPeerConnection(id, isInitiator = false) {
  const iceServers = [];

  // Configuración personalizada de ICE si existe
  if (iceServerUrl) {
    const urls = iceServerUrl
      .split(",")
      .map(url => url.trim())
      .filter(Boolean)
      .map(url =>
        url.startsWith("stun:") || url.startsWith("turn:")
          ? url
          : `turn:${url}`
      );

    urls.forEach(url => {
      const cfg = { urls: url };
      if (iceServerUsername) cfg.username = iceServerUsername;
      if (iceServerCredential) cfg.credential = iceServerCredential;
      iceServers.push(cfg);
    });
  }

  // Si no hay servidores configurados, usa un STUN público
  if (!iceServers.length) {
    iceServers.push({ urls: "stun:stun.l.google.com:19302" });
  }

  // Crea el peer
  const peer = new Peer({
    initiator: isInitiator,
    config: { iceServers }
  });

  // Envía señales al otro usuario
  peer.on("signal", data => socket.emit("signal", id, socket.id, data));

  // Cuando se establece la conexión, envía el stream local
  peer.on("connect", () => peer.addStream(localMediaStream));

  // Cuando se recibe el stream remoto, actualiza la interfaz
  peer.on("stream", stream => updateClientMediaElements(id, stream));

  return peer;
}

// Deshabilita todas las pistas de audio y video salientes
export function disableOutgoingStream() {
  localMediaStream.getTracks().forEach(track => (track.enabled = false));
}

// Habilita nuevamente las pistas locales
export function enableOutgoingStream() {
  localMediaStream.getTracks().forEach(track => (track.enabled = true));
}
// Crea los elementos de video y audio en la interfaz para un usuario remoto
function createClientMediaElements(id) {
  // Contenedor donde se agregan todos los videos remotos
  const container = document.getElementById("remote-videos");
  if (!container) return;

  // Contenedor individual para cada usuario remoto
  const wrapper = document.createElement("div");
  wrapper.id = `${id}_wrapper`;
  wrapper.className = "remote-video-wrapper";

  // Elemento de video para mostrar la cámara o pantalla del usuario
  const videoEl = document.createElement("video");
  videoEl.id = `${id}_video`;
  videoEl.autoplay = true;       // Permite reproducir sin interacción
  videoEl.playsInline = true;    // Evita pantalla completa automática en móviles
  videoEl.className = "w-48 h-36 bg-black rounded"; // Estilos básicos

  // Elemento de audio para reproducir el sonido del usuario
  const audioEl = document.createElement("audio");
  audioEl.id = `${id}_audio`;
  audioEl.autoplay = true;

  // Inserta los elementos en el wrapper
  wrapper.appendChild(videoEl);
  wrapper.appendChild(audioEl);

  // Agrega el wrapper al contenedor principal
  container.appendChild(wrapper);
}

// Actualiza los elementos de un usuario remoto con un nuevo stream
function updateClientMediaElements(id, stream) {
  const v = document.getElementById(`${id}_video`);
  const a = document.getElementById(`${id}_audio`);

  // Asigna el stream de video si existe el elemento
  if (v) v.srcObject = stream;

  // Asigna el stream de audio si existe el elemento
  if (a) a.srcObject = stream;
}

// Elimina completamente los elementos visuales de un usuario desconectado
function removeClientAudioElement(id) {
  const w = document.getElementById(`${id}_wrapper`);

  // Si el wrapper existe, se elimina del DOM
  if (w) w.remove();
}
