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
    // Definindo a proporção ideal de 9:16 (0.5625)
    const aspectRatio9x16 = 9 / 16; 

    try {
      // 1. Tenta a câmera traseira ('environment')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { 
          facingMode: "environment",
          // Removendo width e height para maior compatibilidade. 
          // O navegador tentará honrar o aspectRatio ideal.
          aspectRatio: { ideal: aspectRatio9x16 }, 
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
            aspectRatio: { ideal: aspectRatio9x16 },
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

    // Tenta codecs mais eficientes primeiro
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";

    // Aumentei o bitrate para melhor qualidade (2.5 Mbps)
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
      // Remove o setTimeout desnecessário
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
          // Mudar o click para fechar apenas com o botão "✕" para evitar fechamentos acidentais
          // onClick={handleClose} 
        >
          <Box
            w="100vw"
            h="100vh"
            bg="white"
            overflow="hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Box 
              position="relative" 
              h="100vh" 
              display="flex" 
              flexDirection="column"
              bg="black"
            >
              {/* Vídeo da câmera */}
              <Box
  as="video"
  ref={videoRef}
  autoPlay
  playsInline
  muted
  position="absolute"
  top="0"
  left="0"
  w="100vw"
  h="100vh"
  bg="black"
  sx={{ 
    objectFit: 'cover',
    objectPosition: 'center',
    transform: 'rotate(90deg)',
    transformOrigin: 'center center',
  }}
/>


              {/* Frame guia 9:16 (Responsivo) */}
              <Box
                position="absolute"
                top="50%"
                left="50%"
                // Garante que o guia ocupe uma porção visível do viewport (ex: 80% da altura)
                height="80vh" 
                // Calcula a largura para manter a proporção 9:16 (altura * 9/16)
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
                    // Desabilita se a câmera ainda não tiver sido carregada
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