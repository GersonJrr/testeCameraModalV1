// pages/_app.js
import '../styles/globals.css'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp