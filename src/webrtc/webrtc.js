import Peer from "simple-peer/simplepeer.min.js";
import io from "socket.io-client";

const serverWebRTCUrl = import.meta.env.VITE_WEBRTC_URL;
const iceServerUrl = import.meta.env.VITE_ICE_SERVER_URL;
const iceServerUsername = import.meta.env.VITE_ICE_SERVER_USERNAME;
const iceServerCredential = import.meta.env.VITE_ICE_SERVER_CREDENTIAL;

let socket = null;
let peers = {};
export let localMediaStream = null;

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
export function setLocalMediaStream(stream) {
  localMediaStream = stream;
}

async function getMedia() {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    console.warn("No hay cámara. Usando pantalla como fallback.");

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

function initSocketConnection() {
  socket = io(serverWebRTCUrl);

  socket.on("introduction", handleIntroduction);
  socket.on("newUserConnected", handleNewUserConnected);
  socket.on("userDisconnected", handleUserDisconnected);
  socket.on("signal", handleSignal);
}

function handleIntroduction(ids) {
  ids.forEach(theirId => {
    if (theirId !== socket.id) {
      peers[theirId] = { peerConnection: createPeerConnection(theirId, true) };
      createClientMediaElements(theirId);
    }
  });
}

function handleNewUserConnected(id) {
  if (id !== socket.id && !(id in peers)) {
    peers[id] = {};
    createClientMediaElements(id);
  }
}

function handleUserDisconnected(id) {
  if (id !== socket.id) {
    removeClientAudioElement(id);
    delete peers[id];
  }
}

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

function createPeerConnection(id, isInitiator = false) {
  const iceServers = [];

  if (iceServerUrl) {
    const urls = iceServerUrl
      .split(",")
      .map(url => url.trim())
      .filter(Boolean)
      .map(url => url.startsWith("stun:") || url.startsWith("turn:")
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

  if (!iceServers.length) {
    iceServers.push({ urls: "stun:stun.l.google.com:19302" });
  }

  const peer = new Peer({
    initiator: isInitiator,
    config: { iceServers }
  });

  peer.on("signal", data => socket.emit("signal", id, socket.id, data));
  peer.on("connect", () => peer.addStream(localMediaStream));
  peer.on("stream", stream => updateClientMediaElements(id, stream));

  return peer;
}

export function disableOutgoingStream() {
  localMediaStream.getTracks().forEach(track => (track.enabled = false));
}

export function enableOutgoingStream() {
  localMediaStream.getTracks().forEach(track => (track.enabled = true));
}

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

  wrapper.appendChild(videoEl);
  wrapper.appendChild(audioEl);
  container.appendChild(wrapper);
}

function updateClientMediaElements(id, stream) {
  const v = document.getElementById(`${id}_video`);
  const a = document.getElementById(`${id}_audio`);
  if (v) v.srcObject = stream;
  if (a) a.srcObject = stream;
}

function removeClientAudioElement(id) {
  const w = document.getElementById(`${id}_wrapper`);
  if (w) w.remove();
}
