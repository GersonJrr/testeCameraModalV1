import { 
  Box, 
  Button,
  VStack,
  Text,
  Flex
} from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";

// Dimensões fixas desejadas
const CAMERA_WIDTH = 386;
const CAMERA_HEIGHT = 583;
const CAMERA_ASPECT_RATIO = CAMERA_WIDTH / CAMERA_HEIGHT; // ~0.662 (386/583)

export default function Home() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // Inicia câmera
  const startCamera = async () => {
    // Restrições de captura com as dimensões fixas
    const videoConstraints = {
      aspectRatio: { ideal: CAMERA_ASPECT_RATIO },
      width: { ideal: CAMERA_WIDTH },
      height: { ideal: CAMERA_HEIGHT }
    };

    try {
      // 1. Tenta a câmera traseira ('environment')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { 
          facingMode: "environment",
          ...videoConstraints
        },
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.warn("Falha câmera traseira, tentando frontal:", err);
      try {
        // 2. Tenta a câmera frontal ('user') como fallback
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { 
            facingMode: "user",
            ...videoConstraints
          },
        });

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error);
        }
      } catch (fallbackErr) {
        console.error("Não foi possível acessar a câmera:", fallbackErr);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }
  };

  // Iniciar gravação diretamente do stream da câmera
  const startRecording = () => {
    const stream = cameraStreamRef.current;
    if (!stream) {
      alert("Câmera não está pronta. Aguarde alguns segundos.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";

    const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    mediaRecorderRef.current = mediaRecorder;

    const chunks = [];
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => setRecordedChunks(chunks);

    mediaRecorder.start(100);
    setRecording(true);
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Salvar vídeo
  const saveVideo = () => {
    if (recordedChunks.length === 0) {
      alert("Nenhum vídeo gravado!");
      return;
    }

    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `video_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    alert("Vídeo salvo! Verifique a pasta de Downloads.");
    setRecordedChunks([]);
  };

  // Fechar modal e liberar câmera
  const handleClose = () => {
    if (recording) stopRecording();
    setIsOpen(false);
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    setRecordedChunks([]);
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(track => track.stop());
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
        📹 Abrir Câmera
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
        >
          {/* Contêiner principal da câmera/modal */}
          <Box
            w="100vw"
            h="100vh"
            overflow="hidden"
            onClick={(e) => e.stopPropagation()}
            bg="black" // Fundo do modal preto para centralizar o vídeo
          >
            {/* Contêiner do Vídeo e Overlays (Centralizado) */}
            <Box 
              position="absolute" 
              top="50%" 
              left="50%" 
              transform="translate(-50%, -50%)"
              w={`${CAMERA_WIDTH}px`} // Largura Fixa
              h={`${CAMERA_HEIGHT}px`} // Altura Fixa
              bg="black"
              overflow="hidden" // Garante que o vídeo não saia do frame
              borderRadius="lg" // Opcional: bordas arredondadas
            >
              {/* Vídeo da câmera */}
              <Box
                as="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                // Ocupa 100% do novo contêiner de 386x583
                w="100%"
                h="100%"
                sx={{ 
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />

              {/* Overlay superior */}
              <Flex 
                position="absolute" 
                top="0" 
                left="0" 
                right="0" 
                justify="space-between" 
                align="center" 
                p={2} // Padding ajustado para o frame menor
                bg="blackAlpha.600"
                zIndex="10"
              >
                <Text fontSize="md" fontWeight="bold" color="white">
                  {recording ? "🔴 Gravando..." : "Gravar Vídeo"}
                </Text>
                <Button size="xs" variant="ghost" onClick={handleClose} color="white">✕</Button>
              </Flex>

              {/* Botões inferiores */}
              <VStack 
                position="absolute" 
                bottom="0" 
                left="0" 
                right="0" 
                gap={2} // Gap ajustado
                p={2} 
                bg="blackAlpha.600"
                zIndex="10"
              >
                {!recording ? (
                  <Button 
                    colorScheme="green" 
                    onClick={startRecording} 
                    w="full" 
                    size="md" // Tamanho ajustado
                    isDisabled={!cameraStreamRef.current}
                  >
                    ▶️ Iniciar Gravação
                  </Button>
                ) : (
                  <Button colorScheme="red" onClick={stopRecording} w="full" size="md">
                    ⏹️ Parar Gravação
                  </Button>
                )}

                {recordedChunks.length > 0 && (
                  <Button colorScheme="blue" onClick={saveVideo} w="full" size="md">
                    💾 Salvar Vídeo
                  </Button>
                )}
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}