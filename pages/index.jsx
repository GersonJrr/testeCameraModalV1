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

  // Inicia câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment" // câmera traseira
        },
        audio: true,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.warn("Falha câmera traseira, tentando frontal:", err);
      // fallback para câmera frontal
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user"
          },
          audio: true,
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

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
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
          onClick={handleClose}
        >
          <Box
            maxW="90vw"
            maxH="90vh"
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justify="space-between" align="center" p={4} borderBottom="1px" borderColor="gray.200">
              <Text fontSize="lg" fontWeight="bold">
                {recording ? "🔴 Gravando..." : "Gravar Vídeo"}
              </Text>
              <Button size="sm" variant="ghost" onClick={handleClose}>✕</Button>
            </Flex>
            
            <Box p={4}>
              <VStack gap={4}>
                <Box
                  as="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  maxW="100%"
                  maxH="80vh"
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
                  Resolução nativa da câmera
                </Text>
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}