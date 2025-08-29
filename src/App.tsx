import { useEffect, useState } from 'react';
import './App.css';
import IntroOverlay from './components/IntroOverlay';
import HeroCanvas from './components/HeroCanvas';
import MainContent from './components/MainContent';

function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [isShrinking, setIsShrinking] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [canvasShrunk, setCanvasShrunk] = useState(false);

  useEffect(() => {
    document.body.style.overflow = animationDone ? 'auto' : 'hidden';
  }, [animationDone]);

  // Handle click: start shrinking overlay
  const handleIntroClick = () => {
    setIsShrinking(true);
    setTimeout(() => setHasEntered(true), 800);
  };

  // When animation is done, shrink canvas
  const handleCanvasFinish = () => {
    setAnimationDone(true);
    setTimeout(() => setCanvasShrunk(true), 800); // match transition duration
  };

  return (
    <div className="App">
      {!hasEntered && (
        <IntroOverlay
          onClick={handleIntroClick}
          isShrinking={isShrinking}
        />
      )}
      {hasEntered && (
        <HeroCanvas
          show={hasEntered}
          onFinish={handleCanvasFinish}
          shrunk={canvasShrunk}
        />
      )}
      <MainContent />
    </div>
  );
}

export default App;
