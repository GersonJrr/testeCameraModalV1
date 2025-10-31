import { 
  Box, 
  Button,
  VStack,
  Text,
  Flex
} from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [mediaBlobUrl, setMediaBlobUrl] = useState(null);

  // Inicia câmera (traseira ou frontal) com restrições 9:16
  const startCamera = async () => {
    // Restrições de vídeo que tentam forçar a proporção 9:16
    const videoConstraints = (facingMode) => ({
        video: {
            facingMode: facingMode,
            width: { ideal: 1080, min: 720 },
            height: { ideal: 1920, min: 1280 },
            aspectRatio: { exact: 9/16 } // Tentando forçar 9:16 (vertical)
        },
        audio: true,
    });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(videoConstraints("environment"));

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(console.error);
            // DEBUG: Loga a resolução real obtida da câmera
            console.log(`Câmera Traseira (Real): ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
        };
      }
    } catch (err) {
      console.warn("Falha câmera traseira, tentando frontal:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(videoConstraints("user"));
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
                videoRef.current.play().catch(console.error);
                // DEBUG: Loga a resolução real obtida da câmera
                console.log(`Câmera Frontal (Real): ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            };
        }
      } catch (fallbackErr) {
        console.error("Não foi possível acessar a câmera:", fallbackErr);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }
  };

  // Iniciar gravação usando canvas
  const startRecording = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraStreamRef.current) {
      alert("Câmera não está pronta. Aguarde alguns segundos.");
      return;
    }

    // Define canvas no tamanho final 1080x1920 (9:16)
    canvas.width = 1080;
    canvas.height = 1920;

    const canvasStream = canvas.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9" });
    mediaRecorderRef.current = mediaRecorder;

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      setRecordedChunks(chunks);
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setMediaBlobUrl(url);
    };

    mediaRecorder.start(100);
    setRecording(true);

    // Função para desenhar vídeo no canvas frame a frame
    const draw = () => {
      const ctx = canvas.getContext("2d");
      const cw = canvas.width;
      const ch = canvas.height;

      // Preenche o canvas com preto
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, cw, ch);

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // === RESTAURADO Math.max PARA GARANTIR TELA CHEIA (object-fit: cover) ===
      // Se a câmera não fornecer 9:16, isso causará o "zoom/corte"
      // Se a câmera fornecer 9:16, o preenchimento será perfeito.
      const scale = Math.max(cw / vw, ch / vh); 
      // =======================================================================
      
      const w = vw * scale;
      const h = vh * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;

      ctx.drawImage(video, x, y, w, h);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Salvar vídeo
  const saveVideo = () => {
    if (!recordedChunks || recordedChunks.length === 0) {
      alert("Nenhum vídeo gravado!");
      return;
    }
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `shorts_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    alert("Vídeo salvo! Verifique a pasta de Downloads.");
    setRecordedChunks([]);
    setMediaBlobUrl(null);
  };

  // Fechar modal e liberar câmera
  const handleClose = () => {
    if (recording) stopRecording();
    setIsOpen(false);
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setRecordedChunks([]);
    setMediaBlobUrl(null);
  };

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <Box p={8} textAlign="center">
      <Button
        colorScheme="blue"
        size="lg"
        onClick={() => {
          setIsOpen(true);
          startCamera();
        }}
      >
        📹 Gravar Shorts
      </Button>

      {isOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="black"
          display="flex"
          flexDirection="column"
          zIndex="9999"
          overflow="hidden"
        >
          <Flex
            w="100vw"
            h="100vh"
            justify="center"
            align="center"
            position="relative"
          >
            <Box
              as="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              w="100%"
              h="100%"
              objectFit="cover" // Mantém o preenchimento total da tela
              bg="black"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </Flex>

          {/* Header */}
          <Flex 
            position="absolute"
            top="0"
            left="0"
            right="0"
            justify="space-between" 
            align="center" 
            p={4}
            zIndex="10"
            bg="linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)"
          >
            <Text fontSize="lg" fontWeight="bold" color="white">
              {recording ? "🔴 Gravando..." : "Gravar Shorts"}
            </Text>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleClose}
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
            >
              ✕
            </Button>
          </Flex>

          {/* Controles */}
          <Box
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            p={6}
            bg="linear-gradient(to top, rgba(0,0,0,0.8), transparent)"
            zIndex="10"
          >
            <VStack gap={3}>
              {!recording ? (
                <Button 
                  colorScheme="red" 
                  onClick={startRecording} 
                  w="full" 
                  size="lg"
                  fontSize="xl"
                  h="60px"
                  borderRadius="full"
                >
                  ⚫ Gravar
                </Button>
              ) : (
                <Button 
                  colorScheme="red" 
                  onClick={stopRecording} 
                  w="full" 
                  size="lg"
                  fontSize="xl"
                  h="60px"
                  borderRadius="full"
                  variant="outline"
                  borderWidth="3px"
                >
                  ⏹️ Parar
                </Button>
              )}

              {mediaBlobUrl && (
                <>
                  {/* Pré-visualização do vídeo gravado (9:16) */}
                  <video 
                      src={mediaBlobUrl} 
                      controls 
                      style={{ 
                          width: "200px", 
                          maxHeight: "355px", 
                          margin: "10px 0"
                      }} 
                  />
                  <Button 
                    colorScheme="green" 
                    onClick={saveVideo} 
                    w="full" 
                    size="lg"
                    fontSize="xl"
                    h="60px"
                    borderRadius="full"
                  >
                    💾 Salvar Vídeo
                  </Button>
                </>
              )}

              <Text fontSize="sm" color="whiteAlpha.700">
                Formato 9:16 • Resolução HD
              </Text>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}