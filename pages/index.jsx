import { Box, Button } from "@chakra-ui/react";
import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const animationRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera.");
    }
  };

  const startRecording = () => {
    if (!videoRef.current) return;

    // Ajusta o canvas no tamanho da tela
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      cancelAnimationFrame(animationRef.current);
      const blob = new Blob(chunks, { type: "video/webm" });
      setMediaBlobUrl(URL.createObjectURL(blob));
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const saveVideo = () => {
    if (!mediaBlobUrl) return;
    const a = document.createElement("a");
    a.href = mediaBlobUrl;
    a.download = `video_${Date.now()}.webm`;
    a.click();
    setMediaBlobUrl(null);
  };

  return (
    <Box textAlign="center">
      <Button onClick={startCamera} mb={4}>📹 Abrir Câmera</Button>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "100vh", objectFit: "cover" }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {!recording ? (
        <Button colorScheme="red" mt={4} onClick={startRecording}>
          ⚫ Gravar
        </Button>
      ) : (
        <Button colorScheme="red" mt={4} onClick={stopRecording}>
          ⏹️ Parar
        </Button>
      )}

      {mediaBlobUrl && (
        <Button colorScheme="green" mt={4} onClick={saveVideo}>
          💾 Salvar Vídeo
        </Button>
      )}
    </Box>
  );
}
