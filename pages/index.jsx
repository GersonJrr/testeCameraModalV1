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

  // Inicia câmera em modo portrait
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          aspectRatio: 9/16, // Proporção vertical (shorts)
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Corrigindo possível orientação no display se o stream for horizontal
        // Em alguns navegadores, a orientação é corrigida automaticamente aqui
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.warn("Falha câmera traseira, tentando frontal:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            aspectRatio: 9/16,
            width: { ideal: 1080 },
            height: { ideal: 1920 }
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
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType, 
        videoBitsPerSecond: 2500000 
      });
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
    a.download = `shorts_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    alert("Vídeo salvo! Verifique a pasta de Downloads. Nota: Se o vídeo estiver na horizontal, gire-o com um editor de vídeo.");
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
          overflow="hidden" // Esconde qualquer excesso
        >
          {/* Contêiner para centralizar a visualização 9:16 */}
          <Flex
            w="100vw"
            h="100vh"
            justify="center"
            align="center"
            position="relative"
          >
            {/* Vídeo em proporção 9:16 */}
            <Box
              as="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              
              // --- CORREÇÃO DO ZOOM APLICADA AQUI ---
              // Define a largura máxima de acordo com a proporção 9:16 da tela
              w="100%" 
              h="100%"
              maxW="min(100vh * 9 / 16, 100vw)" // Garante largura correta
              maxH="min(100vw * 16 / 9, 100vh)" // Garante altura correta
              objectFit="cover" // Preenche o contêiner 9:16 (sem barras pretas)
              // ---------------------------------------
              
              bg="black"
            />
          </Flex>

          {/* Header fixo no topo (SOBREPOSTO) */}
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

          {/* Controles fixos na parte inferior (SOBREPOSTO) */}
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

              {recordedChunks.length > 0 && (
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