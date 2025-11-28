import Peer from "simple-peer/simplepeer.min.js";
import io from "socket.io-client";

// URLs and credentials for WebRTC and ICE servers
const serverWebRTCUrl = import.meta.env.VITE_WEBRTC_URL;
const iceServerUrl = import.meta.env.VITE_ICE_SERVER_URL;
const iceServerUsername = import.meta.env.VITE_ICE_SERVER_USERNAME;
const iceServerCredential = import.meta.env.VITE_ICE_SERVER_CREDENTIAL;

let socket = null;
let peers = {};
export let localMediaStream = null

/**
 * Initializes the WebRTC connection if supported.
 * @async
 * @function init
 */
export const initWebRTC = async () => {
  if (Peer.WEBRTC_SUPPORT) {
    try {
      localMediaStream = await getMedia();
      window.localStream = localMediaStream;
      initSocketConnection();
    } catch (error) {
      console.error("Failed to initialize WebRTC connection:", error);
    }
  } else {
    console.warn("WebRTC is not supported in this browser.");
  }
};

/**
 * Gets the user's media stream (audio only).
 * @async
 * @function getMedia
 * @returns {Promise<MediaStream>} The user's media stream.
 */
async function getMedia() {
  try {
    // Intentar cámara + micro (fallará en tu PC)
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    console.warn("No hay cámara. Usando pantalla compartida como fallback.");

    try {
      // Obtener pantalla (esto sí te funciona)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false, // 🔴 NO pedir audio aquí
      });

      // Intentar agregar micrófono (si no existe, NO fallar)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach(t => screenStream.addTrack(t));
      } catch (errMic) {
        console.warn("No hay micrófono disponible, solo pantalla será compartida.");
      }

      return screenStream; // 🔥 DEVOLVER SIEMPRE STREAM
    } catch (err2) {
      console.error("Ni cámara ni pantalla disponibles:", err2);
      throw err2;
    }
  }
}


/**
 * Initializes the socket connection and sets up event listeners.
 * @function initSocketConnection
 */
function initSocketConnection() {
  socket = io(serverWebRTCUrl);

  socket.on("introduction", handleIntroduction);
  socket.on("newUserConnected", handleNewUserConnected);
  socket.on("userDisconnected", handleUserDisconnected);
  socket.on("signal", handleSignal);
}

/**
 * Handles the introduction event.
 * @param {Array<string>} otherClientIds - Array of other client IDs.
 */
function handleIntroduction(otherClientIds) {
  otherClientIds.forEach((theirId) => {
    if (theirId !== socket.id) {
      peers[theirId] = { peerConnection: createPeerConnection(theirId, true) };
      createClientMediaElements(theirId);
    }
  });
}

/**
 * Handles the new user connected event.
 * @param {string} theirId - The ID of the newly connected user.
 */
function handleNewUserConnected(theirId) {
  if (theirId !== socket.id && !(theirId in peers)) {
    peers[theirId] = {};
    createClientMediaElements(theirId);
  }
}

/**
 * Handles the user disconnected event.
 * @param {string} _id - The ID of the disconnected user.
 */
function handleUserDisconnected(_id) {
  if (_id !== socket.id) {
    removeClientAudioElement(_id);
    delete peers[_id];
  }
}

/**
 * Handles the signal event.
 * @param {string} to - The ID of the receiving user.
 * @param {string} from - The ID of the sending user.
 * @param {any} data - The signal data.
 */
function handleSignal(to, from, data) {
  if (to !== socket.id) return;

  let peer = peers[from];
  if (peer && peer.peerConnection) {
    peer.peerConnection.signal(data);
  } else {
    let peerConnection = createPeerConnection(from, false);
    peers[from] = { peerConnection };
    peerConnection.signal(data);
  }
}

/**
 * Creates a new peer connection.
 * @function createPeerConnection
 * @param {string} theirSocketId - The socket ID of the peer.
 * @param {boolean} [isInitiator=false] - Whether the current client is the initiator.
 * @returns {Peer} The created peer connection.
 */
function createPeerConnection(theirSocketId, isInitiator = false) {
  const iceServers = [];

  if (iceServerUrl) {
    const urls = iceServerUrl
      .split(",")
      .map(url => url.trim())
      .filter(Boolean)
      .map(url => {
        if (!/^stun:|^turn:|^turns:/.test(url)) {
          return `turn:${url}`;
        }
        return url;
      });

    urls.forEach(url => {
      const serverConfig = { urls: url };
      if (iceServerUsername) {
        serverConfig.username = iceServerUsername;
      }
      if (iceServerCredential) {
        serverConfig.credential = iceServerCredential;
      }
      iceServers.push(serverConfig);
    });
  }

  if (!iceServers.length) {
    iceServers.push({ urls: "stun:stun.l.google.com:19302" });
  } else {
    const hasTurn = iceServers.some(server =>
      Array.isArray(server.urls)
        ? server.urls.some(url => url.startsWith("turn:") || url.startsWith("turns:"))
        : server.urls.startsWith("turn:") || server.urls.startsWith("turns:")
    );
    if (!hasTurn) {
      iceServers.push({ urls: "stun:stun.l.google.com:19302" });
    }
  }

  const peerConnection = new Peer({
    initiator: isInitiator,
    config: {
      iceServers,
    },
  });

  peerConnection.on("signal", (data) =>
    socket.emit("signal", theirSocketId, socket.id, data)
  );
  peerConnection.on("connect", () =>
    peerConnection.addStream(localMediaStream)
  );
  peerConnection.on("stream", (stream) =>
    updateClientMediaElements(theirSocketId, stream)
  );

  return peerConnection;
}

/**
 * Disables the outgoing media stream.
 * @function disableOutgoingStream
 */
export function disableOutgoingStream() {
  localMediaStream.getTracks().forEach((track) => {
    track.enabled = false;
  });
}

/**
 * Enables the outgoing media stream.
 * @function enableOutgoingStream
 */
export function enableOutgoingStream() {
  localMediaStream.getTracks().forEach((track) => {
    track.enabled = true;
  });
}

/**
 * Creates media elements for a client.
 * @function createClientMediaElements
 * @param {string} _id - The ID of the client.
 */
function createClientMediaElements(id) {
  const container = document.getElementById("remote-videos");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.id = `${id}_wrapper`;
  wrapper.className = "remote-video-wrapper";

  const videoEl = document.createElement("video");
  videoEl.id = `${id}_video`;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.className = "w-48 h-36 bg-black rounded";

  const audioEl = document.createElement("audio");
  audioEl.id = `${id}_audio`;
  audioEl.autoplay = true;
  audioEl.controls = false;

  wrapper.appendChild(videoEl);
  wrapper.appendChild(audioEl);
  container.appendChild(wrapper);
}


/**
 * Updates media elements for a client with a new stream.
 * @function updateClientMediaElements
 * @param {string} _id - The ID of the client.
 * @param {MediaStream} stream - The new media stream.
 */
function updateClientMediaElements(id, stream) {
  const videoEl = document.getElementById(`${id}_video`);
  if (videoEl) videoEl.srcObject = stream;

  const audioEl = document.getElementById(`${id}_audio`);
  if (audioEl) audioEl.srcObject = stream;
}


/**
 * Removes media elements for a client.
 * @function removeClientAudioElement
 * @param {string} _id - The ID of the client.
 */
function removeClientAudioElement(id) {
  const wrapper = document.getElementById(`${id}_wrapper`);
  if (wrapper) wrapper.remove();
}

