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

  const WIDTH = 386; // Largura final desejada
  const HEIGHT = 583; // Altura final desejada (para formato Shorts)

  // Inicia câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Tenta pedir a proporção vertical, mas o browser pode dar a horizontal
        video: { 
          width: { ideal: WIDTH }, 
          height: { ideal: HEIGHT },
          facingMode: "user" // Preferir câmera frontal para selfies/shorts
        },
        audio: true,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      // O Canvas terá as dimensões finais que queremos no vídeo (Vertical)
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      
      // Função para desenhar o frame e aplicar a rotação
      const drawFrame = () => {
        if (!recording || !videoRef.current || videoRef.current.readyState < 3) {
            requestAnimationFrame(drawFrame);
            return;
        }

        // Detecta se o stream da câmera (videoWidth) está em paisagem (maior que a altura)
        const videoIsLandscape = videoRef.current.videoWidth > videoRef.current.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        if (videoIsLandscape) {
            // Se o vídeo de origem está horizontal, rotacionamos para preencher o canvas vertical
            const rot = Math.PI / 2; // 90 graus
            
            // Move o ponto de origem para o canto superior direito do canvas
            // O valor de 'translate' precisa ser ajustado para a rotação correta.
            ctx.translate(canvas.width, 0); 
            ctx.rotate(rot); 

            // Desenha o vídeo. As dimensões usadas são as do canvas, mas 'invertidas' pelo translate/rotate.
            // Aqui, usamos as dimensões do CANVAS para o preenchimento:
            ctx.drawImage(videoRef.current, 0, 0, canvas.height, canvas.width);
        } else {
            // Se o vídeo de origem já está vertical (ou webcam), apenas desenha
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
        requestAnimationFrame(drawFrame);
      };
      
      // Espera o vídeo carregar antes de começar a desenhar
      videoRef.current.onloadedmetadata = () => {
        drawFrame();
      };
      
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  // ... (startRecording, stopRecording, saveVideo, handleClose e useEffect de cleanup permanecem iguais)
  // ... (o JSX também permanece igual)

  // O restante do seu código (as funções de gravação e o JSX)
  // são reutilizados, pois a alteração chave está apenas no startCamera.
  // ... (Inclua o restante das funções aqui)
  
  const startRecording = () => {
    if (!canvasRef.current) return;

    // Captura o stream do canvas que já está rotacionado
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

  const handleClose = () => {
    setIsOpen(false);
    cameraStream?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  // Libera câmera ao fechar
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      canvasStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, canvasStream]);
  
  // Retorno JSX:
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
                {/* Vídeo da câmera (preview) */}
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
                  Resolução de gravação: {WIDTH}×{HEIGHT}px (Vertical Forçado)
                </Text>
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}