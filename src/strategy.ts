import type { PlaySpec } from './playbook'

export type MatchupRating='Favorable'|'Neutral'|'Unfavorable'
export type MatchupAssessment={rating:MatchupRating;edge:number;why:string}
/** Concept vs coverage/front advantage in yard equivalents. Every pair defaults to neutral. */
export const conceptEdges:Record<string,Record<string,[number,string]>>={
  mesh:{cover0:[2,'Shallow crossers can separate from defenders chasing in man coverage.'],cover1:[2,'Shallow crossers can separate from man defenders.'],cover2:[-1,'Underneath zone defenders can pass the crossers off.']},
  'pa-cross':{cover1:[2,'Crossing routes challenge man coverage after the run fake.'],cover0:[1,'Crossing routes challenge man coverage, though extra pressure may arrive.'],cover3:[-1,'Three deep defenders protect the area behind the crossing routes.']},
  verticals:{cover2:[2,'Inside seams stretch the space between the two deep safeties.'],quarters:[-2,'Four deep defenders can match the vertical routes.'],cover0:[1,'A vertical route can win without safety help, if protection holds.']},
  flood:{cover3:[2,'Three route depths overload one sideline defender in a three-deep shell.'],cover1:[-1,'Man defenders can follow each route across the field.']},
  stick:{cover2:[1,'The stick and flat read puts an underneath zone defender in conflict.'],cover1:[-1,'Tight man coverage can disrupt the short timing route.']},
  slants:{cover3:[1,'Quick inside breaks reach the soft space before deep defenders close.'],cover0:[-1,'Press man and immediate pressure shrink the throwing window.']},
  draw:{'sam-blitz':[2,'The delayed handoff can use the space left by a rushing linebacker.'],'nickel-blitz':[2,'The nickel rusher leaves a lane inside the slot.'],quarters:[1,'A light box gives the back room to run.']},
  'inside-zone':{quarters:[1,'A light box gives the back an interior crease.'],'sam-blitz':[-1,'The extra run fitter can close the inside gap.']},
  power:{quarters:[2,'A light box must handle a pulling guard and lead blocker.'],cover0:[-1,'Crowded pressure can meet the puller at the point of attack.']},
  counter:{'sam-blitz':[1,'The counter step can punish a linebacker who overpursues.'],cover3:[0,'A balanced front can fit the counter if defenders stay disciplined.']},
  'outside-zone':{'sam-blitz':[-1,'A strongside rusher can set the edge.'],quarters:[1,'A lighter front can be stretched horizontally.']},
  bootleg:{'sam-blitz':[-1,'An edge rusher can pressure the rolling quarterback.'],cover3:[1,'The rollout can stress the flat defender with layered routes.']},
  'fake-punt-pass':{'special-safe':[-2,'The safe return unit keeps coverage on the eligible gunner.'],'special-block':[1,'The kick rush can leave the gunner uncovered if the throw gets away.']},
  'fake-punt-run':{'special-safe':[-2,'The safe return unit stays ready for the run.']},
  'fake-fg-pass':{'special-safe':[-2,'The safe kick defense keeps coverage on the wing.'],'special-block':[1,'The kick rush can leave a wing open for a quick pass.']},
  'fake-fg-run':{'special-safe':[-2,'The safe kick defense keeps its edge contain.']}
}
export function assessMatchup(offense:PlaySpec,defense:PlaySpec):MatchupAssessment{
  const [edge,why]=conceptEdges[offense.concept]?.[defense.concept]??[0,'The call meets a balanced defensive answer; execution and player ratings will decide the result.']
  return {edge,rating:edge>0?'Favorable':edge<0?'Unfavorable':'Neutral',why}
}
export const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value))
export type ProbabilityProfile={completion:number;sack:number;interception:number;fumble:number}
export function probabilities(offense:PlaySpec,defense:PlaySpec,edge:number,skill:number,toGo:number,yard=50,down=1):ProbabilityProfile{
  const pressure=defense.kind==='blitz'||defense.concept==='cover0'
  const deep=offense.risk>=5
  const compressedField=yard>=80&&deep
  const longLateDown=down>=3&&toGo>=8
  return {
    completion:offense.kind==='pass'?clamp((deep?.53:.67)+edge*.045+skill*.012-(pressure?.075:0)-(toGo>=10&&deep?.025:0)-(compressedField?.035:0)-(longLateDown?.02:0)-(offense.fake?.08:0),.32,.78):0,
    sack:offense.kind==='pass'?clamp(.055+(pressure?.075:0)-skill*.006+(offense.fake?.025:0),.015,.2):0,
    interception:offense.kind==='pass'?clamp(.014+(deep?.012:0)+(edge<0?.006:0)+(offense.fake?.01:0),.005,.055):0,
    fumble:offense.kind==='run'?clamp(.009+(offense.fake?.017:0),.004,.035):0
  }
}
export function executionNote(result:{matchup?:MatchupRating;event?:string;yards:number;turnover:boolean;offense:string}){
  if(result.offense==='punt'||result.offense==='fieldGoal')return ''
  const failure=result.event==='incomplete'||result.event==='sack'||result.turnover||result.yards<=0
  if(result.matchup==='Favorable')return failure?'The call found a useful matchup, but execution did not produce a gain.':'The call found a useful matchup and the offense executed it for a gain.'
  if(result.matchup==='Unfavorable')return failure?'The defense had the better matchup and the offense could not overcome it.':'The defense had the better matchup, but execution still produced a gain.'
  return 'The pre-snap alignment offered clues; the coverage was confirmed only after the snap.'
}
