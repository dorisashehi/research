interface TooltipProps {
  visible: boolean
  x: number
  y: number
  text: string
}

export default function Tooltip({ visible, x, y, text }: TooltipProps) {
  if (!visible) return null

  return (
    <div
      className="fixed bg-blue-900/95 backdrop-blur px-3 py-2 rounded-lg border border-white/20 text-white text-sm shadow-lg pointer-events-none z-[999]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {text}
    </div>
  )
}
