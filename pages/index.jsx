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
  const mediaRecorderRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // Restrições de alta resolução (Full HD)
  const HIGH_RES_CONSTRAINTS = {
    video: {
      width: { ideal: 1920 }, // Preferência por Full HD
      height: { ideal: 1080 } // Preferência por Full HD
    },
    audio: true,
  };

  // Restrições de fallback (HD)
  const FALLBACK_RES_CONSTRAINTS = {
    video: {
      width: { ideal: 1280 }, // Preferência por HD
      height: { ideal: 720 }, // Preferência por HD
      facingMode: "user" // Câmera frontal no fallback
    },
    audio: true,
  };

  // Inicia câmera
  const startCamera = async () => {
    try {
      // Tenta câmera traseira em alta resolução (environment)
      const constraints = {
        ...HIGH_RES_CONSTRAINTS,
        video: {
          ...HIGH_RES_CONSTRAINTS.video,
          facingMode: "environment"
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.warn("Falha câmera traseira de alta resolução, tentando frontal HD:", err);
      // fallback para câmera frontal (user) em resolução HD
      try {
        const stream = await navigator.mediaDevices.getUserMedia(FALLBACK_RES_CONSTRAINTS);

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

  // Iniciar gravação
  const startRecording = () => {
    const stream = cameraStreamRef.current;
    if (!stream) {
      alert("Câmera não está pronta. Aguarde alguns segundos.");
      return;
    }

    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }
    }
    
    // *** AUMENTO DE QUALIDADE ***
    // Aumenta o bitrate para 6.0 Mbps (melhor qualidade para HD/Full HD)
    const videoBitsPerSecond = 6000000; 

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
      };

      mediaRecorder.start(100);
      setRecording(true);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      alert("Erro ao iniciar gravação: " + err.message);
    }
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
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setRecordedChunks([]);
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <Box textAlign="center">
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
          onClick={handleClose}
        >
          <Box
            // *** MODAL MAIOR (AUMENTADO) ***
            w={{ base: "95vw", md: "80vw" }} 
            h={{ base: "95vh", md: "90vh" }} 
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            
            <Box p={4} flexGrow={1} overflowY="auto">
              <VStack gap={4}>
                <Box
                  as="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  // *** VÍDEO MAIOR (AUMENTADO) ***
                  w="100%" 
                  maxH="75vh" // Permite que o vídeo ocupe mais espaço vertical
                  bg="black"
                  borderRadius="md"
                />

                {!recording ? (
                  <Button colorScheme="green" onClick={startRecording} w="full" size="lg">
                    ▶️ Iniciar Gravação
                  </Button>
                ) : (
                  <Button colorScheme="red" onClick={stopRecording} w="full" size="lg">
                    ⏹️ Parar Gravação
                  </Button>
                )}

                {recordedChunks.length > 0 && (
                  <Button colorScheme="blue" onClick={saveVideo} w="full" size="lg">
                    💾 Salvar Vídeo
                  </Button>
                )}

                <Text fontSize="xs" color="gray.500">
                  Resolução ideal solicitada: 1920x1080 (Full HD). Qualidade de gravação: 6.0 Mbps.
                </Text>
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}