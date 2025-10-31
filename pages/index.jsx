import { 
  Box, 
  Button,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  VStack,
  Text
} from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [canvasStream, setCanvasStream] = useState(null);

  const WIDTH = 386;
  const HEIGHT = 583;

  // Inicia câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: WIDTH }, height: { ideal: HEIGHT } },
        audio: true,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Configura o canvas para capturar o vídeo
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      // Renderiza os frames da câmera no canvas
      const drawFrame = () => {
        if (recording && videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0, WIDTH, HEIGHT);
        }
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const startRecording = () => {
    if (!canvasRef.current) return;

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    setCanvasStream(stream);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });
    mediaRecorderRef.current = mediaRecorder;

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      setRecordedChunks(chunks);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const saveVideo = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `video_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    alert("Vídeo salvo com sucesso!");
    setRecordedChunks([]);
  };

  // Libera câmera ao fechar
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      canvasStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, canvasStream]);

  const handleClose = () => {
    setIsOpen(false);
    cameraStream?.getTracks().forEach((t) => t.stop());
  };

  return (
    <Box p={8} textAlign="center">
      <Button
        colorScheme="blue"
        onClick={() => {
          setIsOpen(true);
          startCamera();
        }}
      >
        Abrir Câmera
      </Button>

      <DialogRoot open={isOpen} onOpenChange={(e) => e.open ? null : handleClose()} size="sm" placement="center">
        <DialogContent
          w={`${WIDTH}px`}
          h={`${HEIGHT}px`}
          borderRadius="xl"
          overflow="hidden"
        >
          <DialogHeader textAlign="center">Gravar Vídeo</DialogHeader>
          <DialogCloseTrigger />
          <DialogBody p={2}>
            <VStack spacing={4}>
              {/* Vídeo da câmera */}
              <Box
                as="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                w="100%"
                h="444px"
                bg="black"
                borderRadius="md"
              />

              {/* Canvas invisível usado para gravação */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {!recording ? (
                <Button colorScheme="green" onClick={startRecording}>
                  ▶️ Iniciar Gravação
                </Button>
              ) : (
                <Button colorScheme="red" onClick={stopRecording}>
                  ⏹️ Parar Gravação
                </Button>
              )}

              {recordedChunks.length > 0 && (
                <Button colorScheme="blue" onClick={saveVideo}>
                  💾 Salvar Vídeo
                </Button>
              )}

              <Text fontSize="xs" color="gray.500">
                Resolução forçada: {WIDTH}×{HEIGHT}px
              </Text>
            </VStack>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}