import '../styles/globals.css';
import TopNav from '../components/TopNav';

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* CSS Noise Effect Overlay - Applied globally */}
      <div className="noise-overlay"></div>
      <TopNav />
      <Component {...pageProps} />
    </>
  );
}
