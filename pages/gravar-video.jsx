import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  VStack,
  Center,
  Text,
  Spinner,
} from '@chakra-ui/react';

export default function GravarVideo() {
  const videoRef = useRef(null);
  const recordedVideoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [time, setTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  // Inicia a câmera traseira em 1080x1920 (portrait) automaticamente
  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'environment' }, // Câmera traseira
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: 9 / 16,
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
        setStream(s);
      } catch (err) {
        console.error('Erro ao acessar a câmera:', err);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Timer durante gravação
  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev >= 60) { // Máx 60s
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTime(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      if (recordedVideoRef.current) {
        recordedVideoRef.current.src = URL.createObjectURL(blob);
      }
      videoRef.current.pause(); // Pausa preview
      setRecording(false);
      console.log('Gravação finalizada!');
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  }, [stream]);

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  const saveVideo = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Vídeo salvo!');
  };

  const retake = () => {
    if (recordedVideoRef.current) {
      URL.revokeObjectURL(recordedVideoRef.current.src);
    }
    setRecordedBlob(null);
    if (videoRef.current) videoRef.current.play();
  };

  if (!stream) {
    return (
      <Center h="100vh" bg="black">
        <VStack spacing={4}>
          <Spinner size="xl" color="white" />
          <Text color="white">Iniciando câmera...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box w="100vw" h="100vh" bg="black" position="relative" overflow="hidden">
      {/* Preview ao vivo OU vídeo gravado */}
      {!recordedBlob ? (
        <video
          ref={videoRef}
          style={{ width: '100vw', height: '100vh', objectFit: 'cover' }}
          autoPlay
          muted
          playsInline
        />
      ) : (
        <video
          ref={recordedVideoRef}
          style={{ width: '100vw', height: '100vh', objectFit: 'cover' }}
          autoPlay
          controls
          playsInline
        />
      )}

      {/* Controles */}
      <Box position="absolute" bottom="10vh" left="0" right="0" px={8}>
        <Center>
          <VStack spacing={6}>
            {!recordedBlob ? (
              recording ? (
                <>
                  <Text color="white" fontSize="4xl" fontWeight="bold">
                    {time}s
                  </Text>
                  <Button
                    size="lg"
                    colorScheme="red"
                    onClick={stopRecording}
                    w="80%"
                    h="70px"
                    borderRadius="50px"
                    boxShadow="0 0 30px rgba(255,0,0,0.5)"
                  >
                    ⏹ Parar Gravação
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  colorScheme="red"
                  onClick={startRecording}
                  w="80%"
                  h="80px"
                  borderRadius="50%"
                  boxShadow="0 0 30px rgba(255,0,0,0.5)"
                  _hover={{ transform: 'scale(1.05)' }}
                >
                  🎥 Iniciar Gravação
                </Button>
              )
            ) : (
              <>
                <Button
                  size="lg"
                  colorScheme="green"
                  onClick={saveVideo}
                  w="80%"
                  h="70px"
                  borderRadius="50px"
                >
                  💾 Salvar na Galeria
                </Button>
                <Button
                  size="md"
                  colorScheme="gray"
                  onClick={retake}
                  w="60%"
                  variant="outline"
                >
                  🔄 Gravar Novamente
                </Button>
              </>
            )}
          </VStack>
        </Center>
      </Box>
    </Box>
  );
}
