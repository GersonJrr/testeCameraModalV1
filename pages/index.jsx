import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, VStack, Text, Progress, IconButton, Flex, Spinner } from '@chakra-ui/react';
import { Camera, Square, RotateCw } from 'lucide-react';


export default function InstagramVideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [stream, setStream] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: true,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      alert('Erro ao acessar câmera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm';

    mediaRecorderRef.current = new MediaRecorder(stream, options);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      stopCamera();
      await uploadVideo(blob); // envia o vídeo automaticamente
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    setCountdown(0);

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
      clearInterval(timerRef.current);
    }
  };

  

  const toggleCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');

  const progress = (countdown / 12) * 100;

  return (
    <Box position="relative" width="100vw" height="100vh" bg="black" overflow="hidden">
      {/* Vídeo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!uploading}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Overlay */}
      <VStack position="absolute" top="0" left="0" w="100%" h="100%" justify="space-between" p="20px">
        {/* Header */}
        <Flex w="100%" justify="space-between">
          <IconButton
            icon={<RotateCw size={24} />}
            onClick={toggleCamera}
            aria-label="Trocar câmera"
            isDisabled={isRecording}
            colorScheme="whiteAlpha"
          />
        </Flex>

        {/* Progress */}
        {isRecording && (
          <Box w="100%">
            <Progress value={progress} size="sm" colorScheme="red" borderRadius="full" />
            <Text color="white" fontSize="sm" textAlign="center">
              {countdown.toFixed(1)}s / 12s
            </Text>
          </Box>
        )}

        {/* Footer */}
        <Flex justify="center" align="center" pb="40px">
          {uploading ? (
            <Spinner size="xl" color="white" />
          ) : (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              w="70px"
              h="70px"
              borderRadius="full"
              bg={isRecording ? 'red.500' : 'white'}
              color={isRecording ? 'white' : 'black'}
              border="4px solid white"
            >
              {isRecording ? <Square size={24} /> : <Camera size={24} />}
            </Button>
          )}
        </Flex>
      </VStack>
    </Box>
  );
}
