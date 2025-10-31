import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, VStack, Text, Progress, IconButton, Flex } from '@chakra-ui/react';
import { Camera, Square, Download, RotateCw, X } from 'lucide-react';

export default function InstagramVideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // 'user' para frontal, 'environment' para traseira
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Inicializa a câmera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // Limpa stream anterior
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9/16 } // Formato vertical do Instagram
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    
    // Configura o MediaRecorder
    const options = { mimeType: 'video/webm;codecs=vp9' };
    
    // Fallback para outros formatos se VP9 não estiver disponível
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
    }

    mediaRecorderRef.current = new MediaRecorder(stream, options);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setRecordedVideo(videoUrl);
      stopCamera();
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    setCountdown(0);

    // Timer de 12 segundos
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev >= 12) {
          stopRecording();
          return 12;
        }
        return prev + 0.1;
      });
    }, 100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const downloadVideo = () => {
    if (recordedVideo) {
      const a = document.createElement('a');
      a.href = recordedVideo;
      a.download = `video-${Date.now()}.webm`;
      a.click();
    }
  };

  const resetRecording = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setCountdown(0);
    startCamera();
  };

  const progress = (countdown / 12) * 100;

  return (
    <Box
      position="relative"
      width="100vw"
      height="100vh"
      bg="black"
      overflow="hidden"
    >
      {/* Vídeo Preview ou Gravado */}
      <Box
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {!recordedVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <video
            src={recordedVideo}
            controls
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </Box>

      {/* Overlay de Controles */}
      <VStack
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        justifyContent="space-between"
        padding="20px"
        pointerEvents="none"
      >
        {/* Header */}
        <Flex width="100%" justifyContent="space-between" alignItems="center">
          {!recordedVideo && (
            <IconButton
              icon={<RotateCw size={24} />}
              aria-label="Trocar câmera"
              onClick={toggleCamera}
              colorScheme="whiteAlpha"
              variant="ghost"
              color="white"
              pointerEvents="auto"
              isDisabled={isRecording}
            />
          )}
          <Box flex="1" />
          {recordedVideo && (
            <IconButton
              icon={<X size={24} />}
              aria-label="Fechar"
              onClick={resetRecording}
              colorScheme="whiteAlpha"
              variant="ghost"
              color="white"
              pointerEvents="auto"
            />
          )}
        </Flex>

        {/* Progress Bar */}
        {isRecording && (
          <Box width="100%" px="20px" pointerEvents="none">
            <Progress
              value={progress}
              size="sm"
              colorScheme="red"
              bg="whiteAlpha.300"
              borderRadius="full"
            />
            <Text color="white" fontSize="sm" textAlign="center" mt="2">
              {countdown.toFixed(1)}s / 12s
            </Text>
          </Box>
        )}

        {/* Footer - Botões de Controle */}
        <Flex
          width="100%"
          justifyContent="center"
          alignItems="center"
          gap="40px"
          pb="40px"
        >
          {!recordedVideo ? (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              width="70px"
              height="70px"
              borderRadius="full"
              bg={isRecording ? "red.500" : "white"}
              color={isRecording ? "white" : "black"}
              border="4px solid white"
              _hover={{ transform: "scale(1.1)" }}
              _active={{ transform: "scale(0.95)" }}
              transition="all 0.2s"
              pointerEvents="auto"
              leftIcon={isRecording ? <Square size={24} /> : <Camera size={24} />}
            >
              {isRecording ? '' : ''}
            </Button>
          ) : (
            <Button
              onClick={downloadVideo}
              size="lg"
              colorScheme="green"
              leftIcon={<Download size={20} />}
              pointerEvents="auto"
            >
              Baixar Vídeo
            </Button>
          )}
        </Flex>
      </VStack>
    </Box>
  );
}