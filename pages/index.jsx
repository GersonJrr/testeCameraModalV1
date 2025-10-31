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
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);

  const WIDTH = 1080;
  const HEIGHT = 1920;

  // Inicia câmera traseira
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: WIDTH }, 
          height: { ideal: HEIGHT },
          facingMode: { exact: "environment" }
        },
        audio: true,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera traseira:", err);
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
      } catch (fallbackErr) {
        console.error("Erro ao acessar câmera frontal:", fallbackErr);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }
  };

  const startRecording = () => {
    if (!cameraStream) {
      alert("Câmera não está pronta. Aguarde um momento.");
      return;
    }

    try {
      // Grava diretamente do stream da câmera
      const mediaRecorder = new MediaRecorder(cameraStream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000 // 8 Mbps para qualidade Full HD
      });
      
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
      };

      mediaRecorder.start(100); // Captura dados a cada 100ms
      setRecording(true);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      alert("Erro ao iniciar gravação: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

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

  const handleClose = () => {
    if (recording) {
      stopRecording();
    }
    setIsOpen(false);
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setRecordedChunks([]);
  };

  // Libera recursos ao desmontar
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

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
            maxW="600px"
            w="90%"
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
                {/* Vídeo da câmera */}
                <Box
                  as="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  w="100%"
                  maxW="600px"
                  h="auto"
                  aspectRatio="9/16"
                  bg="black"
                  borderRadius="md"
                  style={{ objectFit: 'cover' }}
                />

                {!recording ? (
                  <Button 
                    colorScheme="green" 
                    onClick={startRecording} 
                    w="full"
                    size="lg"
                  >
                    ▶️ Iniciar Gravação
                  </Button>
                ) : (
                  <Button 
                    colorScheme="red" 
                    onClick={stopRecording} 
                    w="full"
                    size="lg"
                  >
                    ⏹️ Parar Gravação
                  </Button>
                )}

                {recordedChunks.length > 0 && (
                  <Button 
                    colorScheme="blue" 
                    onClick={saveVideo} 
                    w="full"
                    size="lg"
                  >
                    💾 Salvar Vídeo
                  </Button>
                )}

                <Text fontSize="xs" color="gray.500">
                  Resolução: {WIDTH}×{HEIGHT}px (9:16) | Câmera traseira
                </Text>
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}