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
  const [cameraFacingMode, setCameraFacingMode] = useState("environment"); // Estado para saber qual câmera está ativa

  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // Função auxiliar para aplicar stream ao vídeo
  const applyStreamToVideo = (stream, facingMode) => {
    cameraStreamRef.current = stream;
    setCameraFacingMode(facingMode); // Atualiza a câmera usada

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error);
    }
  };

  // Inicia câmera
  const startCamera = async () => {
    const aspectRatio9x16 = 9 / 16; 

    // Restrições: Pedimos a proporção vertical, mas o navegador pode retornar na horizontal.
    const videoConstraints = {
      aspectRatio: { ideal: aspectRatio9x16 },
    };

    try {
      // 1. Tenta a câmera traseira ('environment')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "environment", ...videoConstraints },
      });
      applyStreamToVideo(stream, "environment");

    } catch (err) {
      console.warn("Falha câmera traseira, tentando frontal:", err);
      try {
        // 2. Tenta a câmera frontal ('user') como fallback
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", ...videoConstraints },
        });
        applyStreamToVideo(stream, "user");
        
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

  // Salvar vídeo (mantido inalterado)
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
          <Box
            w="100vw"
            h="100vh"
            overflow="hidden"
            onClick={(e) => e.stopPropagation()}
            bg="black"
          >
            <Box 
              position="relative" 
              h="100vh" 
              w="100vw" // Define o viewport para a rotação
              bg="black"
            >
              {/* Contêiner para o Vídeo com a Rotação e Escala aplicadas */}
              {/* O vídeo da câmera é rotacionado em 90 graus e ampliado/dimensionado para cobrir a tela vertical */}
              <Box
                as="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                position="absolute"
                top="0"
                left="0"
                w="100%"
                h="100%"
                // A CHAVE ESTÁ NESTE BLOCO SX/CSS PARA ROTACIONAR E PREENCHER
                sx={{ 
                  objectFit: 'cover',
                  // Rotação de 90 graus para corrigir a orientação horizontal do stream
                  // O scale(1.777) é o 16/9, necessário para o fill (cover) correto após a rotação
                  // O scaleX(-1) é para espelhar a câmera frontal (user), caso contrário, o vídeo fica ao contrário.
                  transform: `
                    rotate(90deg) 
                    scale(${window.innerHeight / window.innerWidth}) 
                    ${cameraFacingMode === 'user' ? 'scaleX(-1)' : ''}
                  `,
                  transformOrigin: '50% 50%',
                }}
              />

              {/* Frame guia 9:16 (Responsivo) - Mantido para orientação */}
              <Box
                position="absolute"
                top="50%"
                left="50%"
                height="80vh" 
                width={`calc(80vh * 9 / 16)`} 
                transform="translate(-50%, -50%)"
                border="2px dashed white"
                pointerEvents="none"
                zIndex="10"
              />

              {/* Overlay superior */}
              <Flex 
                position="absolute" 
                top="0" 
                left="0" 
                right="0" 
                justify="space-between" 
                align="center" 
                p={4} 
                bg="blackAlpha.600"
                zIndex="20"
              >
                <Text fontSize="lg" fontWeight="bold" color="white">
                  {recording ? "🔴 Gravando..." : "Gravar Vídeo"}
                </Text>
                <Button size="sm" variant="ghost" onClick={handleClose} color="white">✕</Button>
              </Flex>

              {/* Botões inferiores */}
              <VStack 
                position="absolute" 
                bottom="0" 
                left="0" 
                right="0" 
                gap={3} 
                p={4} 
                bg="blackAlpha.600"
                zIndex="20"
              >
                {!recording ? (
                  <Button 
                    colorScheme="green" 
                    onClick={startRecording} 
                    w="full" 
                    size="lg"
                    isDisabled={!cameraStreamRef.current}
                  >
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
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}