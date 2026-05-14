import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TimerClock from './components/TimerClock';

function isDisplayTime(date: Date, config: { duration: number, frequency: number }) {
  const m = date.getMinutes();
  const s = date.getSeconds();

  // frequency represents minutes (0.5, 1, 30, 60)
  const freqSec = config.frequency * 60;
  const currentTotalSec = m * 60 + s;
  
  // The trigger points are multiples of freqSec.
  // We want to show the clock when currentTotalSec is within +/- (duration / 2) of a trigger point.
  const halfDuration = config.duration / 2;
  
  // Remainder when divided by freqSec
  const remainder = currentTotalSec % freqSec;
  
  // If reminder is close to 0 OR close to freqSec
  if (remainder < halfDuration || remainder >= freqSec - halfDuration) {
    return true;
  }

  return false;
}

export default function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'in' | 'out'>('in');
  const [isHovered, setIsHovered] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [config, setConfig] = useState({ duration: 10, frequency: 1, position: 'top-right' });

  useEffect(() => {
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      window.electronAPI.getConfig().then(setConfig);
      // @ts-ignore
      window.electronAPI.onConfigUpdate((newConfig) => setConfig(newConfig));
      // @ts-ignore
      window.electronAPI.onShowPreview(() => setIsPreview(true));
      // @ts-ignore
      window.electronAPI.onHidePreview(() => setIsPreview(false));
    }
  }, []);

  // 时间判断
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const shouldShow = isDisplayTime(now, config);
      const visible = isPreview || shouldShow;
      setIsVisible(visible);
      setAnimationDirection(visible ? 'in' : 'out');
    }, 100);

    return () => clearInterval(interval);
  }, [config, isPreview]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        // Use borderBoxSize for the most accurate outer dimensions (including borders and padding)
        const width = entries[0].borderBoxSize[0].inlineSize;
        const height = entries[0].borderBoxSize[0].blockSize;
        // @ts-ignore
        if (window.electronAPI) {
          // @ts-ignore
          window.electronAPI.updateSize(width, height);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isRight = config.position?.endsWith('right');

  return (
    <div className="fixed inset-0 overflow-hidden h-screen w-screen flex items-center justify-center pointer-events-none">
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
            transition={{
              duration: animationDirection === 'in' ? 0.65 : 0.5,
              ease: "easeInOut"
            }}
            className="w-full h-full flex items-center justify-center pointer-events-auto"
          >
            <div
              ref={containerRef}
              className="cursor-default"
              style={{
                transition: 'opacity 0.2s ease',
                opacity: isHovered ? 0.1 : 1
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <TimerClock />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}