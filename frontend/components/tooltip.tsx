interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}

export default function Tooltip({ visible, x, y, text }: TooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed backdrop-blur px-3 py-2 rounded-lg border border-white/20 text-white text-sm shadow-lg pointer-events-none z-[999]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: "rgba(79, 195, 174, 0.95)", // #4fc3ae with 95% opacity
      }}
    >
      {text}
    </div>
  );
}
