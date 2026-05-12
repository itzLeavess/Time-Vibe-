import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TimerClock from './components/TimerClock';

function isDisplayTime(date: Date) {
  const s = date.getSeconds();

  // [TEST MODE TRIGGER]
  // 10~20s and 40~50s for testing
  if (s >= 10 && s < 20) return true;
  if (s >= 40 && s < 50) return true;

  return false;
}

export default function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'in' | 'out'>('in');
  const [isHovered, setIsHovered] = useState(false);

  // 时间判断
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const shouldShow = isDisplayTime(now);
      setIsVisible(shouldShow);
      setAnimationDirection(shouldShow ? 'in' : 'out');
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden h-screen w-screen flex items-center">
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{
              duration: animationDirection === 'in' ? 0.65 : 0.5,
              ease: "easeInOut"
            }}
          >
            <div
              className={`transition-opacity duration-200 ${isHovered ? 'opacity-10' : 'opacity-100'}`}
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