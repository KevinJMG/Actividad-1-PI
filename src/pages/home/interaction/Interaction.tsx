import { useState, useCallback, useRef } from "react";
import { initWebRTC, setLocalMediaStream, localMediaStream } from "../../../webrtc/webrtc";

// ───── Declaración global ─────
declare global {
  interface Window {
    localStream?: MediaStream;
  }
}

export default function Interaction() {
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [started, setStarted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const startCall = useCallback(async () => {
    if (started) return;
    setStarted(true);

    // Preguntar al usuario qué quiere usar
    const choice = window.prompt(
      "¿Qué quieres usar?\n1 = Cámara + micrófono\n2 = Compartir pantalla\n3 = Solo micrófono",
      "1"
    );

    try {
      let stream: MediaStream;

      if (choice === "1") {
        // Cámara + micrófono
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else if (choice === "2") {
        // Compartir pantalla
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

        // Intentar añadir micrófono si existe
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach((t: MediaStreamTrack) => stream.addTrack(t));
        } catch {
          console.warn("No hay micrófono disponible, solo pantalla será compartida.");
        }
      } else if (choice === "3") {
        // Solo micrófono
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } else {
        // Por defecto: cámara + micrófono
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  const toggleCamera = () => {
    if (!localMediaStream) return;
    const videoTrack = localMediaStream.getTracks().find((t: MediaStreamTrack) => t.kind === "video");
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamEnabled(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (!localMediaStream) return;
    const audioTrack = localMediaStream.getTracks().find((t: MediaStreamTrack) => t.kind === "audio");
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!localMediaStream) return;

    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const camTrack = localMediaStream.getVideoTracks()[0];
        if (camTrack) camTrack.stop();

        localMediaStream.addTrack(screenTrack);
        setScreenSharing(true);
      } catch (err) {
        console.error("Error al compartir pantalla:", err);
      }
    } else {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newCamTrack = camStream.getVideoTracks()[0];

        const oldScreenTrack = localMediaStream.getVideoTracks()[0];
        if (oldScreenTrack) oldScreenTrack.stop();

        localMediaStream.addTrack(newCamTrack);
        setScreenSharing(false);
      } catch (err) {
        console.error("Error al volver a cámara:", err);
      }
    }
  };

  return (
    <div className="flex flex-col justify-between h-full p-4">
      {/* VIDEO LOCAL */}
      <div>
        <h2 className="text-lg font-semibold mb-2 text-white">Tu video</h2>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-w-xl bg-black rounded-lg"
        />
      </div>

      {/* BOTONERA INFERIOR */}
      <div className="w-full flex justify-center gap-6 py-6 bg-black/20 rounded-xl">
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
              className={`px-4 py-4 rounded-full shadow ${camEnabled ? "bg-gray-700" : "bg-red-600"} text-white`}
            >
              {camEnabled ? "🎥" : "🚫🎥"}
            </button>

            <button
              onClick={toggleMic}
              className={`px-4 py-4 rounded-full shadow ${micEnabled ? "bg-gray-700" : "bg-red-600"} text-white`}
            >
              {micEnabled ? "🎤" : "🔇"}
            </button>

            <button
              onClick={toggleScreenShare}
              className="bg-gray-700 text-white px-4 py-4 rounded-full shadow"
            >
              🖥️
            </button>
          </>
        )}
      </div>

      {/* VIDEOS REMOTOS */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2 text-white">Videos remotos</h2>
        <div id="remote-videos" className="flex flex-wrap gap-3"></div>
      </div>
    </div>
  );
}
