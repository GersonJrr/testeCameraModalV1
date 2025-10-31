import { 
  Box, 
  Button,
  VStack,
  Text,
  Flex
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
  const animationFrameRef = useRef(null);

  const WIDTH = 386;
  const HEIGHT = 583;

  // Inicia câmera traseira
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: WIDTH }, 
          height: { ideal: HEIGHT },
          facingMode: { exact: "environment" } // Força câmera traseira
        },
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

      // Renderiza os frames da câmera no canvas SEMPRE (não só quando recording)
      const drawFrame = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          ctx.drawImage(videoRef.current, 0, 0, WIDTH, HEIGHT);
        }
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      // Tenta câmera frontal como fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: WIDTH }, 
            height: { ideal: HEIGHT },
            facingMode: "user"
          },
          audio: true,
        });
        
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        const drawFrame = () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            ctx.drawImage(videoRef.current, 0, 0, WIDTH, HEIGHT);
          }
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();
      } catch (fallbackErr) {
        console.error("Erro ao acessar câmera frontal:", fallbackErr);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }
  };

  const startRecording = () => {
    if (!canvasRef.current) return;

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    
    // Adiciona o áudio da câmera ao stream do canvas
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      audioTracks.forEach(track => stream.addTrack(track));
    }
    
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

  const handleClose = () => {
    setIsOpen(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    cameraStream?.getTracks().forEach((t) => t.stop());
    canvasStream?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setRecordedChunks([]);
  };

  // Libera recursos ao fechar
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cameraStream?.getTracks().forEach((t) => t.stop());
      canvasStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, canvasStream]);

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

      {isOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="9999"
          onClick={handleClose}
        >
          <Box
            w={`${WIDTH}px`}
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justify="space-between" align="center" p={4} borderBottom="1px" borderColor="gray.200">
              <Text fontSize="lg" fontWeight="bold">Gravar Vídeo</Text>
              <Button size="sm" variant="ghost" onClick={handleClose}>✕</Button>
            </Flex>
            
            <Box p={4}>
              <VStack gap={4}>
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
                  style={{ objectFit: 'cover' }}
                />

                {/* Canvas invisível usado para gravação */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {!recording ? (
                  <Button colorScheme="green" onClick={startRecording} w="full">
                    ▶️ Iniciar Gravação
                  </Button>
                ) : (
                  <Button colorScheme="red" onClick={stopRecording} w="full">
                    ⏹️ Parar Gravação
                  </Button>
                )}

                {recordedChunks.length > 0 && (
                  <Button colorScheme="blue" onClick={saveVideo} w="full">
                    💾 Salvar Vídeo
                  </Button>
                )}

                <Text fontSize="xs" color="gray.500">
                  Resolução: {WIDTH}×{HEIGHT}px | Câmera traseira
                </Text>
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}