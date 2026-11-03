import type { ActivePlayer } from './football'

export type PathPoint = { forward: number; lateral: number }

// All paths are relative to the player's presnap spot. Positive forward is
// toward the defense, regardless of which team has the ball on the field.
export function assignmentPath(player: ActivePlayer): PathPoint[] {
  const { kind, route, gap, target } = player.assignment
  const side = Math.sign(player.preSnap.lateral) || 1
  const gapSide = gap?.endsWith('left') ? -1 : 1
  const gapWidth = gap?.startsWith('D') ? 7 : gap?.startsWith('C') ? 4 : gap?.startsWith('B') ? 2.5 : .7
  if (kind === 'ballCarry' || kind === 'leadBlock') return [{forward:0,lateral:0},{forward:2,lateral:gapSide*gapWidth*.5},{forward:kind==='leadBlock'?5:9,lateral:gapSide*gapWidth}]
  if (kind === 'pullBlock') return [{forward:0,lateral:0},{forward:0,lateral:gapSide*3},{forward:3,lateral:gapSide*4}]
  if (kind === 'runBlock') return [{forward:0,lateral:0},{forward:1,lateral:target==='outside-zone'||target==='toss'?gapSide*1.5:0},{forward:3,lateral:target==='outside-zone'||target==='toss'?gapSide*2:0}]
  if (kind === 'passBlock' || kind === 'protection') return [{forward:0,lateral:0},{forward:.8,lateral:0},{forward:1.2,lateral:0}]
  if (kind !== 'route') return [{forward:0,lateral:0}]
  const name = route?.toLowerCase() ?? ''
  if (name.includes('block')) return [{forward:0,lateral:0},{forward:1,lateral:0}]
  if (name.includes('cross') || name.includes('mesh') || name.includes('drag')) return [{forward:0,lateral:0},{forward:name.includes('drag')?3:5,lateral:0},{forward:name.includes('drag')?6:9,lateral:-side*11}]
  if (name.includes('post')) return [{forward:0,lateral:0},{forward:8,lateral:0},{forward:16,lateral:-side*6}]
  if (name.includes('corner')) return [{forward:0,lateral:0},{forward:8,lateral:0},{forward:15,lateral:side*6}]
  if (name.includes('wheel')) return [{forward:0,lateral:0},{forward:2,lateral:side*4},{forward:15,lateral:side*4}]
  if (name.includes('out')) return [{forward:0,lateral:0},{forward:name.includes('deep')?10:6,lateral:0},{forward:name.includes('deep')?10:6,lateral:side*6}]
  if (name.includes('slant')) return [{forward:0,lateral:0},{forward:3,lateral:0},{forward:9,lateral:-side*5}]
  if (name.includes('bubble') || name.includes('screen')) return [{forward:0,lateral:0},{forward:-1,lateral:side*2},{forward:2,lateral:side*5}]
  if (name.includes('flat') || name.includes('checkdown')) return [{forward:0,lateral:0},{forward:2,lateral:side*3},{forward:4,lateral:side*5}]
  if (name.includes('hitch') || name.includes('stick') || name.includes('sit')) return [{forward:0,lateral:0},{forward:6,lateral:0},{forward:5,lateral:0}]
  return [{forward:0,lateral:0},{forward:18,lateral:0}]
}

export function pointOnPath(points: PathPoint[], progress: number): PathPoint {
  if (points.length === 1) return points[0]
  const scaled = Math.max(0,Math.min(1,progress)) * (points.length - 1)
  const index = Math.min(points.length - 2, Math.floor(scaled))
  const t = scaled - index
  return {forward:points[index].forward+(points[index+1].forward-points[index].forward)*t,
    lateral:points[index].lateral+(points[index+1].lateral-points[index].lateral)*t}
}
