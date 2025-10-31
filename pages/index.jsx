import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  useToast,
  Container,
  Heading,
  Flex
} from '@chakra-ui/react';

export default function Home() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const toast = useToast();

  // Inicializar a câmera traseira
  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: 9 / 16,
          facingMode: 'environment' // Câmera traseira
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setIsCameraReady(true);
        
        toast({
          title: "Câmera inicializada",
          description: "Câmera traseira pronta para gravar",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      setHasPermission(false);
      
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera traseira",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  // Iniciar gravação
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      setRecordedChunks([]);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Gravação iniciada",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast({
        title: "Erro na gravação",
        description: "Não foi possível iniciar a gravação",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  // Parar gravação
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      toast({
        title: "Gravação finalizada",
        description: "Vídeo pronto para salvar",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [isRecording, toast]);

  // Salvar vídeo na galeria
  const saveVideo = useCallback(() => {
    if (recordedChunks.length === 0) {
      toast({
        title: "Nenhum vídeo",
        description: "Grave um vídeo primeiro",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      // Criar link de download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `video-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Vídeo salvo",
        description: "Vídeo salvo na galeria com sucesso",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Limpar chunks após salvar
      setRecordedChunks([]);
    } catch (error) {
      console.error('Erro ao salvar vídeo:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o vídeo",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [recordedChunks, toast]);

  // Parar a câmera quando o componente desmontar
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading textAlign="center" color="blue.600">
          Gravador de Vídeo
        </Heading>

        {hasPermission === false && (
          <Alert status="error">
            <AlertIcon />
            Permissão da câmera negada. Por favor, permita o acesso à câmera.
          </Alert>
        )}

        {/* Área do vídeo */}
        <Box
          position="relative"
          width="100%"
          maxW="540px"
          height="960px"
          mx="auto"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="xl"
          bg="gray.900"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Espelhar para parecer natural
            }}
          />
          
          {!isCameraReady && (
            <Flex
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              bg="gray.800"
              alignItems="center"
              justifyContent="center"
              color="white"
            >
              <Text>Câmera não inicializada</Text>
            </Flex>
          )}
        </Box>

        {/* Controles */}
        <VStack spacing={4}>
          {!isCameraReady ? (
            <Button
              colorScheme="blue"
              size="lg"
              onClick={initializeCamera}
              width="200px"
            >
              Iniciar Câmera
            </Button>
          ) : (
            <HStack spacing={4}>
              {!isRecording ? (
                <Button
                  colorScheme="red"
                  size="lg"
                  onClick={startRecording}
                  leftIcon={<Box w={3} h={3} bg="white" borderRadius="full" />}
                >
                  Gravar
                </Button>
              ) : (
                <Button
                  colorScheme="orange"
                  size="lg"
                  onClick={stopRecording}
                >
                  Parar
                </Button>
              )}

              {recordedChunks.length > 0 && (
                <Button
                  colorScheme="green"
                  size="lg"
                  onClick={saveVideo}
                  leftIcon={<Box>💾</Box>}
                >
                  Salvar Vídeo
                </Button>
              )}
            </HStack>
          )}

          {/* Informações */}
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Resolução: 1080x1920 • Câmera Traseira
            {isRecording && (
              <Box as="span" color="red.500" ml={2}>
                ● GRAVANDO
              </Box>
            )}
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};
