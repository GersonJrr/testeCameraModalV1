import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
  AspectRatio,
  Heading,
  Center
} from "@chakra-ui/react";
import React, { useRef, useState, useCallback } from "react";

// Componente para a gravação de vídeo
export default function Home() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const toast = useToast();
  const recordedChunks = useRef([]);

  // Tenta obter acesso à câmera traseira (environment) com resolução 1080x1920
  const getCameraAccess = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: {
          width: { exact: 1080 }, // Tenta largura exata (pode ser ignorada pelo browser)
          height: { exact: 1920 }, // Tenta altura exata (pode ser ignorada pelo browser)
          facingMode: { exact: "environment" } // Tenta a câmera traseira
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      setPermissionGranted(true);
      return stream;
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      toast({
        title: "Erro de Acesso à Câmera.",
        description: "Certifique-se de que a câmera está conectada e as permissões foram concedidas.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setPermissionGranted(false);
      return null;
    }
  }, [toast]);

  // Inicia a gravação
  const startRecording = async () => {
    const stream = await getCameraAccess();
    if (!stream) return;

    recordedChunks.current = [];
    
    // Tenta gravar em 'video/webm' que é amplamente suportado
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      // Cria o Blob do vídeo a partir dos chunks gravados
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      setVideoBlob(blob);
      // Para o stream da câmera para liberar recursos
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    setVideoBlob(null); // Limpa o vídeo anterior
    toast({
        title: "Gravação Iniciada!",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
  };

  // Para a gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Gravação Parada. Vídeo Pronto para Salvar.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Salva o vídeo (inicia um download no navegador)
  const saveVideo = () => {
    if (videoBlob) {
      // Cria um link temporário para iniciar o download
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = `video-gravado-${Date.now()}.webm`; // Nome do arquivo
      a.click();
      window.URL.revokeObjectURL(url); // Limpa o objeto URL
      a.remove();
      
      toast({
        title: "Download Iniciado!",
        description: "Verifique sua pasta de Downloads.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Nenhum Vídeo para Salvar.",
        description: "Grave um vídeo primeiro.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Center minH="100vh" bg="gray.50">
      <VStack spacing={4} p={8} bg="white" boxShadow="xl" borderRadius="lg" w="full" maxW="400px">
        <Heading size="md" color="teal.500">Gravador de Vídeo (Câmera Traseira)</Heading>

        {/* AspectRatio para tentar simular 1080x1920 (ou 9:16) */}
        <AspectRatio ratio={9 / 16} w="full" maxH="70vh" bg="black" borderRadius="md" overflow="hidden">
          {videoBlob ? (
            // Exibe o vídeo gravado
            <video
              src={URL.createObjectURL(videoBlob)}
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            // Pré-visualização da câmera
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </AspectRatio>
        
        <Box>
            <Text fontSize="sm" color="gray.500">
                {videoBlob ? "Vídeo Pronto" : isRecording ? "GRAVANDO..." : (permissionGranted ? "Câmera Ativa" : "Clique em 'Iniciar'")}
            </Text>
        </Box>

        <Box>
            {!isRecording && !videoBlob && (
                <Button
                    onClick={startRecording}
                    colorScheme="red"
              
                    size="lg"
                    w="150px"
                    isDisabled={!navigator.mediaDevices}
                >
                    Iniciar
                </Button>
            )}

            {isRecording && (
                <Button
                    onClick={stopRecording}
                    colorScheme="red"
                   
                    size="lg"
                    w="150px"
                >
                    Parar
                </Button>
            )}
        </Box>

        <Button
            onClick={saveVideo}
            colorScheme="green"
            
            w="200px"
            isDisabled={!videoBlob}
        >
            Salvar Vídeo (Download)
        </Button>
        <Text fontSize="xs" color="gray.400" textAlign="center">
            *A resolução e o uso da câmera traseira dependem do suporte do navegador e do dispositivo. O salvamento é um download.
        </Text>
      </VStack>
    </Center>
  );
}