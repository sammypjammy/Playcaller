import type { ActivePlayer, Coordinate, Matchup } from './football'

export function huddlePositions(matchup:Matchup,los:number):Map<string,Coordinate>{
  const positions=new Map<string,Coordinate>()
  const place=(players:ActivePlayer[],center:number)=>players.forEach((p,i)=>{
    const row=Math.floor(i/4),column=i%4
    positions.set(p.id,{yard:center+(row-1)*1.6,lateral:(column-1.5)*1.9+(row%2)*.2})
  })
  place(matchup.offense,Math.max(-7,Math.min(105,los-7)))
  place(matchup.defense,Math.max(-5,Math.min(107,los+9)))
  return positions
}
export function blendPoint(from:Coordinate,to:Coordinate,amount:number):Coordinate{
  const t=Math.max(0,Math.min(1,amount))
  const eased=t*t*(3-2*t)
  return {yard:from.yard+(to.yard-from.yard)*eased,lateral:from.lateral+(to.lateral-from.lateral)*eased}
}
export type TackleAngle='front'|'side'|'pursuit'
export function tackleAngle(defender:Coordinate,carrier:Coordinate):TackleAngle{
  const forward=defender.yard-carrier.yard,lateral=Math.abs(defender.lateral-carrier.lateral)
  return lateral>Math.abs(forward)*1.2?'side':forward>=0?'front':'pursuit'
}
