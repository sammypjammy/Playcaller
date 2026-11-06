import type { Result } from './engine'
import type { ActivePlayer, Coordinate, Matchup } from './football'
import { buildReplay } from './replay'
import { routePosition } from './playMotion'

const distance=(a:Coordinate,b:Coordinate)=>Math.hypot(a.yard-b.yard,a.lateral-b.lateral)

// Resolve a completed pass against the same pursuit budget used by the field.
// If nobody can reach the carrier at the rolled spot, the play continues.
export function completionWithContact(result:Result,matchup:Matchup,startYard:number,toGo:number):Result{
  if(result.event!=='completion'||result.touchdown||result.yards<0)return result
  const original=buildReplay(result,matchup,startYard)
  const receiver=matchup.offense.find(p=>p.id===original.receiverId)
  if(!receiver)return result
  const firstCatch=routePosition(receiver,original,original.catchAt??.65)
  const defenders=matchup.defense
  for(let end=Math.max(startYard+result.yards,Math.ceil(firstCatch.yard));end<=100;end++){
    const yards=end-startYard
    const trial={...result,yards}
    const plan=buildReplay(trial,matchup,startYard,receiver.id)
    const catchSpot=routePosition(receiver,plan,plan.catchAt??.65)
    const carrier=routePosition(receiver,plan,1)
    const travel=plan.postCatchDistance??distance(catchSpot,carrier)
    const available=defenders.map(defender=>({
      defender,
      gap:distance(defender.preSnap,carrier)-travel*defender.ratings.speed/receiver.ratings.speed
    })).sort((a,b)=>a.gap-b.gap)[0]
    if(end<100&&available&&available.gap>2.5)continue
    const touchdown=end>=100
    return {
      ...result,yards,text:touchdown?'Touchdown!':`${yards}-yard completion.`,touchdown,
      firstDown:!touchdown&&yards>=toGo,
      replay:{...plan,contact:!touchdown,tacklerId:touchdown?undefined:available?.defender.id}
    }
  }
  return result
}
