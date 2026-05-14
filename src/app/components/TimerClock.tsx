import { useEffect, useState } from 'react';

function ClockIcon() {
  const [rotation, setRotation] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours() % 12;
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      setRotation({
        hours: (hours * 30) + (minutes * 0.5),
        minutes: minutes * 6,
        seconds: seconds * 6
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative shrink-0 size-[45px]">
      <svg className="block size-full" fill="none" viewBox="0 0 64 64">
        <circle cx="32" cy="32" fill="white" r="32" />
        <g transform="translate(32, 32)">
          {/* Second hand - Thin, Red */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-28"
            stroke="#FF3B30"
            strokeLinecap="round"
            strokeWidth="1.2"
            transform={`rotate(${rotation.seconds})`}
          />
          {/* Hour hand - Thick, Black */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-16"
            stroke="#141414"
            strokeLinecap="round"
            strokeWidth="3.5"
            transform={`rotate(${rotation.hours})`}
          />
          {/* Minute hand - Same thickness, Black */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-24"
            stroke="#141414"
            strokeLinecap="round"
            strokeWidth="3.5"
            transform={`rotate(${rotation.minutes})`}
          />
        </g>
      </svg>
    </div>
  );
}

function DigitalClock() {
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white h-full relative rounded-[8px] shrink-0 flex items-center justify-center pl-[8px] pr-[8px] py-[6px] font-digital">
      <div className="flex items-center justify-center font-digital text-[26px] text-black leading-none whitespace-nowrap">
        {time.split(':').map((part, index, array) => (
          <div key={index} className="flex items-center">
            <span>{part}</span>
            {index < array.length - 1 && (
              <span className="mx-[-7px] translate-y-[1px]">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TimerClock() {
  return (
    <div className="bg-[#ededed] shadow-[0_8px_16px_rgba(0,0,0,0.22)] border border-black/5 flex gap-[10px] items-center px-[16px] py-[8px] relative rounded-[11px] min-w-[140px] z-[9999]">
      <ClockIcon />
      <DigitalClock />
    </div>
  );
}
