import { useState, useCallback, useRef } from "react";
import { initWebRTC, setLocalMediaStream, localMediaStream } from "../../../webrtc/webrtc";

// ───── Declaración global ─────
declare global {
  interface Window {
    localStream?: MediaStream;
    peerConnection?: RTCPeerConnection;
    camTrack?: MediaStreamTrack;
  }
}
//Metodo para limpiar los usuarios duplicados, o desconectados
function cleanupWebRTC() {
  try {
    // Detener y limpiar stream local
    if (window.localStream) {
      window.localStream.getTracks().forEach(t => t.stop());
      window.localStream = undefined;
    }

    // Cerrar peerConnection
    if (window.peerConnection) {
      window.peerConnection.ontrack = null;
      window.peerConnection.onicecandidate = null;
      window.peerConnection.onconnectionstatechange = null;
      window.peerConnection.close();
      window.peerConnection = undefined;
    }

    // Eliminar videos remotos
    const vids = document.querySelectorAll(".remote-video");
    vids.forEach(v => v.remove());

  } catch (e) {
    console.warn("Error en cleanup:", e);
  }
}

export default function Interaction() {
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [started, setStarted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const startCall = useCallback(async () => {
  if (started) return;
  cleanupWebRTC()
  setStarted(true);

  // Preguntar al usuario qué quiere usar
  const choice = window.prompt(
    "¿Qué quieres usar?\n1 = Cámara + micrófono\n2 = Solo micrófono",
    "1"
  );

  try {
    let stream: MediaStream;

    if (choice === "1") {
      // Cámara + micrófono
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.camTrack = stream.getVideoTracks()[0];
    } else if (choice === "2") {
      // Solo micrófono
      stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } else {
      // Por defecto: cámara + micrófono
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.camTrack = stream.getVideoTracks()[0];
    }

    // Guardar stream en webrtc.js
    setLocalMediaStream(stream);
    window.localStream = stream;

    // Inicializar WebRTC
    await initWebRTC();

    // Mostrar video local
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }

  } catch (err) {
    console.error("Error al obtener media:", err);
    alert("No se pudo acceder a la cámara o al micrófono.");
    setStarted(false);
  }
}, [started]);
  // Habilitar y desactivar camara
    const toggleCamera = () => {
    const videoTrack = window.camTrack;
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamEnabled(videoTrack.enabled);
    }
  };
  //Habilitar y desactivar microfono
  const toggleMic = () => {
    if (!localMediaStream) return;
    const audioTrack = localMediaStream.getTracks().find((t: MediaStreamTrack) => t.kind === "audio");
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  };

  return (
    <div className="flex flex-col h-full relative">

      {/* VIDEO LOCAL FLOTANTE */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-40 h-28 rounded-lg shadow-lg bg-black absolute bottom-28 right-4 border border-gray-700 z-50"
      />

      {/* GRID DE VIDEOS REMOTOS */}
      <div className="flex-1 overflow-auto p-4">
        <div
          id="remote-videos"
          className="
            grid gap-4
            grid-cols-1 
            sm:grid-cols-2 
            md:grid-cols-3 
            lg:grid-cols-4 
            auto-rows-[200px]
          "
        ></div>
      </div>

      {/* CONTROLES DE ABAJO */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center gap-6 py-4 bg-black/40 backdrop-blur-md">

        {!started && (
          <button
            onClick={startCall}
            className="bg-green-600 text-white px-6 py-3 rounded-full shadow hover:bg-green-700"
          >
            Iniciar llamada
          </button>
        )}

        {started && (
          <>
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full shadow ${camEnabled ? "bg-gray-700" : "bg-red-600"} text-white`}
            >
              {camEnabled ? "🎥" : "🚫"}
            </button>

            <button
              onClick={toggleMic}
              className={`p-4 rounded-full shadow ${micEnabled ? "bg-gray-700" : "bg-red-600"} text-white`}
            >
              {micEnabled ? "🎤" : "🔇"}
            </button>

          </>
        )}

      </div>
    </div>
  );
}
