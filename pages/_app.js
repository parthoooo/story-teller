import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* CSS Noise Effect Overlay - Applied globally */}
      <div className="noise-overlay"></div>
      <Component {...pageProps} />
    </>
  )
} 