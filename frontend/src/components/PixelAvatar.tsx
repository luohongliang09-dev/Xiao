import type { CSSProperties, ReactElement } from 'react'

const PALETTE: Record<string, string> = {
  s: '#f6c9a0', // 皮肤
  e: '#2b1f1c', // 眼睛
  H: '#7db8e6', // 秘书舰发色（浅蓝）
  h: '#6b4f3a', // 指挥官发色（棕）
  w: '#f0f2f5', // 白色水手领
  U: '#2c3e50', // 海军蓝制服
  g: '#e6b422', // 金色徽章
}

const SHIP: string[] = [
  '..HHHHHHHH..',
  '.HHHHHHHHHH.',
  '.HssssssssH.',
  '.HssssssssH.',
  '.HseesseesH.',
  '.HssssssssH.',
  '.HssssssssH.',
  '.HHssssssHH.',
  '..HHHHHHHH..',
  '..wwwwwwww..',
  '..UUUUUUUU..',
  '..UUUUUUUU..',
]

const COMMANDER: string[] = [
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '.hssssssssh.',
  '.hssssssssh.',
  '.hseesseesh.',
  '.hssssssssh.',
  '.hssssssssh.',
  '.hhsssssshh.',
  '..hhhhhhhh..',
  '..UUgUUgUU..',
  '..UUUUUUUU..',
  '..UUUUUUUU..',
]

function PixelFace({ grid, size }: { grid: string[]; size: number }) {
  const rects: ReactElement[] = []
  grid.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      const color = PALETTE[ch]
      if (color) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />)
      }
    })
  })
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" style={{ display: 'block' }}>
      {rects}
    </svg>
  )
}

const frame: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
}

export function ShipGirlAvatar({ size = 34 }: { size?: number }) {
  return (
    <div style={frame}>
      <PixelFace grid={SHIP} size={size} />
    </div>
  )
}

export function CommanderAvatar({ size = 34 }: { size?: number }) {
  return (
    <div style={frame}>
      <PixelFace grid={COMMANDER} size={size} />
    </div>
  )
}
