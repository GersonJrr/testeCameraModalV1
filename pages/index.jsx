import { 
  Box, 
  Button,
  VStack,
  Flex,
  Text
} from "@chakra-ui/react"; // Adicionei Flex, VStack e Text
import { useRef, useState, useEffect } from "react"; // Adicionei useEffect

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null); // Ref para o stream da câmera

  const [recording, setRecording] = useState(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream; // Salva o stream para poder parar
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(console.error);
            setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setCameraReady(false);
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setRecording(false);
  };

  const startRecording = () => {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // *** CORREÇÃO: Usa a resolução nativa do vídeo para evitar distorção ***
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // *********************************************************************

    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    // Captura o stream do canvas que agora está na proporção correta
    const stream = canvas.captureStream(30);
    // Adiciona o áudio do stream original ao stream do canvas
    streamRef.current.getAudioTracks().forEach(track => stream.addTrack(track));
    
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      cancelAnimationFrame(animationRef.current);
      const blob = new Blob(chunks, { type: "video/webm" });
      setMediaBlobUrl(URL.createObjectURL(blob));
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const saveVideo = () => {
    if (!mediaBlobUrl) return;
    const a = document.createElement("a");
    a.href = mediaBlobUrl;
    a.download = `video_${Date.now()}.webm`;
    a.click();
    setMediaBlobUrl(null);
    stopCamera(); // Fecha a câmera após salvar o vídeo
  };

    // Limpeza ao desmontar o componente
    useEffect(() => {
        return () => {
            stopCamera();
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

  return (
    <Box 
        position="relative" 
        w="100vw" 
        h="100vh" 
        bg="black"
        overflow="hidden"
    >
        {/* Visualizador de Vídeo - Ocupa a tela inteira */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        // Mantém objectFit: 'cover' para visualização em tela cheia,
        // mas a gravação agora respeita a proporção nativa
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Container de Botões (Posicionado ABSOLUTO sobre o vídeo) */}
      <VStack
        position="absolute"
        bottom={8}
        left="50%"
        transform="translateX(-50%)"
        zIndex={10}
        spacing={4}
        p={4}
        w="90%"
        maxW="400px"
      >
        {/* Botão Principal: Gravar/Parar */}
        {cameraReady && !mediaBlobUrl && (
            !recording ? (
            <Button 
                colorScheme="red" 
                onClick={startRecording} 
                w="full"
                h="60px"
                borderRadius="full"
                fontSize="xl"
            >
              ⚫ Gravar
            </Button>
          ) : (
            <Button 
                colorScheme="red" 
                onClick={stopRecording} 
                w="full"
                h="60px"
                borderRadius="full"
                fontSize="xl"
                variant="outline"
                borderWidth="3px"
            >
              ⏹️ Parar
            </Button>
          )
        )}

        {/* Botão de Salvar Vídeo */}
        {mediaBlobUrl && (
          <Button colorScheme="green" onClick={saveVideo} w="full" h="60px" borderRadius="full" fontSize="xl">
            💾 Salvar Vídeo
          </Button>
        )}
      </VStack>

      {/* Botão de Abertura/Fechamento (Posicionado no topo para melhor UX) */}
      <Flex 
        position="absolute"
        top={4}
        left={4}
        right={4}
        justifyContent="space-between"
        zIndex={10}
      >
        {!cameraReady ? (
            <Button onClick={startCamera} colorScheme="blue">
                📹 Abrir Câmera
            </Button>
        ) : (
             <Button onClick={stopCamera} colorScheme="gray" variant="solid">
                Fechar
            </Button>
        )}
        
        {/* Exibe o URL para pré-visualização (opcional) */}
        {mediaBlobUrl && (
            <video src={mediaBlobUrl} controls style={{ width: "100px", height: "180px" }} />
        )}
      </Flex>
    </Box>
  );
}