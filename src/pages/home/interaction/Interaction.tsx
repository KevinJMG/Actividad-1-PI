import { useState, useCallback, useRef } from "react";
import { initWebRTC, localMediaStream } from "../../../webrtc/webrtc";

export default function Interaction() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callPeers, setCallPeers] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const speak = useCallback(() => {
    setIsSpeaking(true);

    if (callPeers) {
      setCallPeers(false);

      // Inicializar WebRTC (esto obtiene la cámara y micrófono)
      initWebRTC();

      // Esperar un instante a que WebRTC asigne la cámara
      setTimeout(() => {
        if (localVideoRef.current && localMediaStream) {
            localVideoRef.current.srcObject = localMediaStream;
            localVideoRef.current.play().catch(() => {});
          }
      }, 400);
    }
  }, [callPeers]);

  const stop = useCallback(() => {
    setIsSpeaking(false);
    // Aquí podrías mutear el stream si quieres
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      
      <div className="flex justify-center">
        <button
          onClick={isSpeaking ? stop : speak}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg shadow hover:bg-purple-700"
        >
          {isSpeaking ? "Mutear" : "Hablar"}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Tu video</h2>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-w-md h-auto bg-black rounded"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Videos remotos</h2>
        <div id="remote-videos" className="flex flex-wrap gap-3"></div>
      </div>

    </div>
  );
}
