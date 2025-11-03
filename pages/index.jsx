import {
  Box,
  Button,
  VStack,
  Text,
  Flex
} from "@chakra-ui/react";
import { useState, useRef, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const ovalRef = useRef(null);
  const processingRef = useRef(false);
  const countdownTimer = useRef(null);
  const lastPositions = useRef([]);
  const MAX_POSITIONS = 15;

  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  
  // Estados de detecção facial
  const [isReady, setIsReady] = useState(false);
  const [isFaceAligned, setIsFaceAligned] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(null);
  const [faceIsTooClose, setFaceIsTooClose] = useState(false);
  const [faceIsTooFar, setFaceIsTooFar] = useState(false);
  const [isFacingForward, setIsFacingForward] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carregar modelos de detecção facial
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("🔄 Iniciando carregamento dos modelos...");
        const MODEL_URL = "/models";

        const modelsLoaded =
          faceapi.nets.tinyFaceDetector.isLoaded &&
          faceapi.nets.faceLandmark68Net.isLoaded &&
          faceapi.nets.faceExpressionNet.isLoaded;

        if (modelsLoaded) {
          console.log("✅ Modelos já carregados");
          setIsReady(true);
          return;
        }

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log("✅ TinyFaceDetector carregado");

        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("✅ FaceLandmark68Net carregado");

        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log("✅ FaceExpressionNet carregado");

        setIsReady(true);
        console.log("✅ Todos os modelos carregados com sucesso");
      } catch (error) {
        console.error("❌ Erro ao carregar modelos:", error);
      }
    };
    loadModels();
  }, []);

  // Mensagens de feedback
  const getMessage = useCallback(() => {
    if (countdown) return `Capturando em ${countdown}...`;
    if (isFaceAligned && isFacingForward) return "MANTENHA ESSA POSIÇÃO... SORRIA 😊";
    if (!isFacingForward) return "OLHE DIRETAMENTE PARA A CÂMERA";
    if (faceIsTooClose) return "AFASTE UM POUCO O ROSTO";
    if (faceIsTooFar) return "APROXIME UM POUCO MAIS O ROSTO";
    return "Posicione seu rosto no centro da câmera";
  }, [countdown, isFaceAligned, isFacingForward, faceIsTooClose, faceIsTooFar]);

  const getMessageBackground = useCallback(() => {
    if (countdown) return "blue.500";
    if (isFaceAligned && isFacingForward) return "green.500";
    if (!isFacingForward) return "yellow.500";
    if (faceIsTooClose) return "red.500";
    if (faceIsTooFar) return "gray.800";
    return "red.500";
  }, [countdown, isFaceAligned, isFacingForward, faceIsTooClose, faceIsTooFar]);

  // Reset countdown
  const resetCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
  }, []);

  // Verificar alinhamento do rosto
  const checkFaceAlignment = useCallback((detection, video) => {
    try {
      const box = detection.box;
      const ovalElement = ovalRef.current;

      if (!ovalElement) return false;

      const ovalRect = ovalElement.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();

      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const ovalBox = {
        x: (ovalRect.left - videoRect.left) * scaleX,
        y: (ovalRect.top - videoRect.top) * scaleY,
        width: ovalRect.width * scaleX,
        height: ovalRect.height * scaleY,
      };

      const minFaceSize = ovalBox.height * 0.35;
      const maxFaceSize = ovalBox.height * 0.6;
      const faceSize = box.height;

      setFaceIsTooClose(false);
      setFaceIsTooFar(false);

      if (faceSize < minFaceSize) {
        setFaceIsTooFar(true);
        return false;
      }
      if (faceSize > maxFaceSize) {
        setFaceIsTooClose(true);
        return false;
      }

      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;
      const ovalCenterX = ovalBox.x + ovalBox.width / 2;
      const ovalCenterY = ovalBox.y + ovalBox.height / 2;

      const toleranceX = ovalBox.width * 0.3;
      const toleranceY = ovalBox.height * 0.3;

      const currentPosition = { x: faceCenterX, y: faceCenterY };
      lastPositions.current.push(currentPosition);

      if (lastPositions.current.length > MAX_POSITIONS) {
        lastPositions.current.shift();
      }

      const avgPosition = lastPositions.current.reduce(
        (acc, pos) => ({
          x: acc.x + pos.x / lastPositions.current.length,
          y: acc.y + pos.y / lastPositions.current.length,
        }),
        { x: 0, y: 0 }
      );

      const isAligned =
        Math.abs(avgPosition.x - ovalCenterX) < toleranceX &&
        Math.abs(avgPosition.y - ovalCenterY) < toleranceY;

      return isAligned;
    } catch (error) {
      console.error("Erro no checkFaceAlignment:", error);
      return false;
    }
  }, []);

  // Verificar orientação do rosto
  const checkFaceOrientation = useCallback((landmarks) => {
    try {
      if (!landmarks) return false;

      const nose = landmarks.positions[30];
      const leftEye = landmarks.positions[36];
      const rightEye = landmarks.positions[45];

      const midX = (leftEye.x + rightEye.x) / 2;
      const noseOffset = Math.abs(nose.x - midX);
      const eyeDistance = Math.abs(rightEye.x - leftEye.x);
      const threshold = eyeDistance * 0.1;

      return noseOffset <= threshold;
    } catch (error) {
      console.error("Erro ao verificar orientação do rosto:", error);
      return false;
    }
  }, []);

  // Capturar foto
  const handleCapture = useCallback(() => {
    if (isCapturing || photoTaken) return;

    if (!isFaceAligned || !isFacingForward || faceIsTooClose || faceIsTooFar) {
      console.log("Cancelando captura - rosto não está na posição ideal");
      resetCountdown();
      return;
    }

    try {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight || video.readyState !== 4) return;

      setIsCapturing(true);
      processingRef.current = true;
      setIsFaceAligned(false);
      resetCountdown();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const photoData = canvas.toDataURL("image/png", 1.0);
      setPhotoTaken(photoData);
      setDetectionActive(false);
    } catch (error) {
      console.error("Erro ao capturar foto:", error);
    }
  }, [isCapturing, photoTaken, resetCountdown, isFaceAligned, isFacingForward, faceIsTooClose, faceIsTooFar]);

  // Iniciar countdown
  const startCountdown = useCallback(() => {
    if (countdown || countdownTimer.current || isCapturing) return;

    if (!isFaceAligned || !isFacingForward || faceIsTooClose || faceIsTooFar) {
      return;
    }

    let count = 3;
    setCountdown(count);

    countdownTimer.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        setCountdown(null);
        handleCapture();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [countdown, handleCapture, isCapturing, isFaceAligned, isFacingForward, faceIsTooClose, faceIsTooFar]);

  // Detectar rosto
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isReady || processingRef.current || isCapturing || photoTaken || !detectionActive)
      return;

    processingRef.current = true;

    try {
      const video = videoRef.current;
      if (video.readyState !== 4) {
        processingRef.current = false;
        return;
      }

      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.25,
          })
        )
        .withFaceLandmarks();

      if (detection && detection.detection.score > 0.35) {
        const isAligned = checkFaceAlignment(detection.detection, video);
        const isFacing = checkFaceOrientation(detection.landmarks);
        setIsFacingForward(isFacing);

        if (isAligned !== isFaceAligned) {
          setIsFaceAligned(isAligned);
        }

        if (isAligned && isFacing && !countdown && !countdownTimer.current && !isCapturing) {
          startCountdown();
        } else if ((!isAligned || !isFacing) && countdown === 3) {
          resetCountdown();
        }
      } else {
        if (!detection || detection.detection.score < 0.15) {
          setIsFaceAligned(false);
          setIsFacingForward(false);
          if (countdown === 3) resetCountdown();
        }
      }
    } catch (error) {
      console.error("Erro na detecção:", error);
      setIsFaceAligned(false);
      setIsFacingForward(false);
    } finally {
      processingRef.current = false;
    }
  }, [isReady, countdown, checkFaceAlignment, checkFaceOrientation, startCountdown, resetCountdown, isFaceAligned, isCapturing, photoTaken, detectionActive]);

  // Loop de detecção
  useEffect(() => {
    if (!isReady || !detectionActive || isCapturing || !isOpen) return;

    let timeoutId;

    const processFrame = () => {
      detectFace().finally(() => {
        if (isReady && detectionActive && !isCapturing && isOpen) {
          timeoutId = setTimeout(() => {
            requestAnimationFrame(processFrame);
          }, 200);
        }
      });
    };

    processFrame();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isReady, detectFace, isCapturing, isOpen, detectionActive]);

  // Constraints da câmera
  const HIGH_RES_CONSTRAINTS = {
    video: {
      width: { ideal: isMobile ? 1920 : 4096 },
      height: { ideal: isMobile ? 1440 : 3072 },
      frameRate: { ideal: 10, max: 15 },
      facingMode: "user",
      aspectRatio: 4 / 3,
    },
    audio: false,
  };

  const FALLBACK_RES_CONSTRAINTS = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user"
    },
    audio: true,
  };

  // Iniciar câmera
  const startCamera = async () => {
    setIsLoadingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(HIGH_RES_CONSTRAINTS);
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error);
          setIsLoadingCamera(false);
          setDetectionActive(true);
        };
      }
    } catch (err) {
      console.warn("Falha câmera alta resolução, tentando fallback:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(FALLBACK_RES_CONSTRAINTS);
        cameraStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(console.error);
            setIsLoadingCamera(false);
            setDetectionActive(true);
          };
        }
      } catch (fallbackErr) {
        console.error("Não foi possível acessar a câmera:", fallbackErr);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
        setIsLoadingCamera(false);
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

    const videoBitsPerSecond = 8000000;

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
      };

      mediaRecorder.start(2000);
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

  // Nova foto
  const handleNewPhoto = () => {
    setPhotoTaken(null);
    setIsCapturing(false);
    processingRef.current = false;
    lastPositions.current = [];
    setDetectionActive(true);
  };

  // Fechar modal
  const handleClose = () => {
    if (recording) stopRecording();
    setIsOpen(false);
    setDetectionActive(false);
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setRecordedChunks([]);
    setPhotoTaken(null);
    resetCountdown();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);

  return (
    <Box textAlign="center">
      <Button
        colorScheme="blue"
        size="lg"
        onClick={() => {
          setIsOpen(true);
          startCamera();
        }}
      >
        📹 Abrir Câmera com Detecção Facial
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
            w={{ base: "95vw", md: "80vw" }}
            h={{ base: "95vh", md: "90vh" }}
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Box p={4} flexGrow={1} overflowY="auto">
              <VStack gap={4}>
                <Box
                  ref={ovalRef}
                  position="relative"
                  w="100%"
                  maxH="75vh"
                  bg="black"
                  borderRadius="md"
                  overflow="hidden"
                >
                  {isLoadingCamera && (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      bg="blackAlpha.900"
                      zIndex="10"
                    >
                      <Text color="white" fontSize="lg">Iniciando câmera...</Text>
                    </Box>
                  )}

                  {photoTaken ? (
                    <Box position="relative" w="100%" h="100%">
                      <img
                        src={photoTaken}
                        alt="Foto capturada"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: "scaleX(-1)"
                        }}
                      />
                      <Box
                        position="absolute"
                        top="0"
                        left="0"
                        right="0"
                        bottom="0"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg="blackAlpha.300"
                      >
                        <Button
                          colorScheme="blue"
                          size="lg"
                          onClick={handleNewPhoto}
                        >
                          📸 Nova Foto
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Box
                        as="video"
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        w="100%"
                        h="100%"
                        objectFit="cover"
                        transform="scaleX(-1)"
                      />
                      <canvas
                        ref={canvasRef}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none"
                        }}
                      />

                      {/* Feedback message */}
                      {detectionActive && (
                        <Box
                          position="absolute"
                          bottom="8"
                          left="50%"
                          transform="translateX(-50%)"
                          zIndex="50"
                          w="full"
                          maxW="md"
                          px="4"
                        >
                          <Box
                            px="6"
                            py="4"
                            borderRadius="xl"
                            bg={getMessageBackground()}
                            color="white"
                            textAlign="center"
                            fontSize="lg"
                            fontWeight="medium"
                          >
                            {countdown && <Text as="span" fontSize="2xl" mr="2">📸</Text>}
                            {isFaceAligned && <Text as="span" fontSize="2xl" mr="2">😊</Text>}
                            {!isFaceAligned && !faceIsTooClose && !faceIsTooFar && (
                              <Text as="span" fontSize="2xl" mr="2">👀</Text>
                            )}
                            {getMessage()}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </Box>

                {countdown && (
                  <Flex
                    w="84px"
                    h="84px"
                    bg={getMessageBackground()}
                    color="white"
                    fontWeight="bold"
                    alignItems="center"
                    justifyContent="center"
                    gap="2"
                    borderRadius="full"
                  >
                    <Text fontSize="30px">📸</Text>
                    <Text fontSize="50px">{countdown}</Text>
                  </Flex>
                )}

                {!photoTaken && !recording && (
                  <Button colorScheme="green" onClick={startRecording} w="full" size="lg">
                    ▶️ Iniciar Gravação
                  </Button>
                )}

                {recording && (
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