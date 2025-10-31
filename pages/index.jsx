import { Box, Button, Flex } from "@chakra-ui/react";
import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
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
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const stream = videoRef.current.srcObject;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      setRecordedChunks(chunks);
      const blob = new Blob(chunks, { type: "video/webm" });
      setMediaBlobUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const saveVideo = () => {
    if (!recordedChunks.length) return;

    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video_${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    setRecordedChunks([]);
    setMediaBlobUrl(null);
  };

  return (
    <Box>
      <Button onClick={startCamera} mb={4}>📹 Abrir Câmera</Button>

      <Flex justify="center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100vh", objectFit: "cover" }}
        />
      </Flex>

      <Button
        colorScheme={recording ? "red" : "green"}
        onClick={recording ? stopRecording : startRecording}
        mt={4}
      >
        {recording ? "⏹️ Parar" : "⚫ Gravar"}
      </Button>

      {mediaBlobUrl && (
        <Button colorScheme="blue" onClick={saveVideo} mt={4}>
          💾 Salvar Vídeo
        </Button>
      )}
    </Box>
  );
}
