import { Button, Center, VStack } from '@chakra-ui/react';
import Link from 'next/link';

export default function Home() {
  return (
    <VStack spacing={8} h="100vh" justify="center">
      {/* Seu conteúdo atual... */}
      <Link href="/gravar-video">
        <Button size="lg" colorScheme="red" w="100%" maxW="400px" h="70px">
          🎥 Gravar Vídeo (Câmera Traseira)
        </Button>
      </Link>
    </VStack>
  );
}