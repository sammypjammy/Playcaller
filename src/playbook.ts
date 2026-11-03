export type PlayKind='run'|'pass'|'blitz'|'zone'|'man'|'contain'
export type PlaySpec={id:string;name:string;kind:PlayKind;formation:string;description:string;risk:number;base:number;counter:string[];concept:string;target?:string;fake?:boolean;situation?:string;strength?:string;weakness?:string}
export type FormationGroup={id:string;name:string;plays:string[]}
export const offenseGroups:FormationGroup[]=[
  {id:'i',name:'I-Formation',plays:['iDive','iPower','iCounter','iBoot','iCross']},
  {id:'singleDoubles',name:'Singleback',plays:['sbInside','sbOutside','sbSlants','sbStick','sbPACross']},
  {id:'shotgunSpread',name:'Shotgun',plays:['sgDraw','sgVerticals','sgMesh','sgFlood','sgStick']},
  {id:'pistolStrong',name:'Pistol',plays:['pInside','pPower','pCounter','pSlants','pBoot']}
]
export const defenseGroups:FormationGroup[]=[
  {id:'man',name:'Man Coverage',plays:['cover0','cover1']},
  {id:'zone',name:'Zone Coverage',plays:['cover2','cover3','cover4']},
  {id:'pressure',name:'Blitz',plays:['samBlitz','nickelBlitz']}
]
const O=(id:string,name:string,kind:'run'|'pass',formation:string,description:string,risk:number,base:number,counter:string[],concept:string,target?:string):PlaySpec=>({id,name,kind,formation,description,risk,base,counter,concept,target})
export const offensivePlays:PlaySpec[]=[
  O('sbInside','Inside Zone','run','Singleback','Zone steps inside; cut behind the double team.',1,4,['d43Sam','d34Inside'],'inside-zone','A-right'),
  O('sbOutside','Outside Zone','run','Singleback','Stretch the front laterally, then cut upfield.',2,5,['d34Outside','d43Cover3'],'outside-zone','D-right'),
  O('sbSlants','Slants','pass','Singleback','Three short inside breaks against soft coverage.',2,7,['d43Cover1','dNickelCover1'],'slants'),
  O('sbPACross','Play Action Cross','pass','Singleback','Run fake opens a crossing route behind linebackers.',3,9,['d43Cover3','dNickelMatch'],'pa-cross'),
  O('sgDraw','HB Draw','run','Shotgun Spread','Delay the handoff as the rush widens.',2,6,['d34Inside'],'draw','A-left'),
  O('sgVerticals','Four Verticals','pass','Shotgun Spread','Four eligible targets attack deep seams.',5,14,['dDimeQuarters','dDimePrevent'],'verticals'),
  O('sgMesh','Mesh','pass','Shotgun Spread','Shallow crossers trade sides under the safeties.',3,8,['dNickelMatch','d43Cover1'],'mesh'),
  O('sgBubble','Bubble Screen','pass','Shotgun Spread','Quick throw outside with receivers blocking.',2,6,['dNickelCover1','d43Sam'],'bubble'),
  O('iDive','HB Dive','run','I-Formation','Hit the inside gap behind the fullback.',1,4,['d34Inside','d43Sam'],'dive','A-right'),
  O('iToss','HB Toss','run','I-Formation','Pitch outside behind a pulling blocker.',2,6,['d34Outside','dNickelBlitz'],'toss','D-left'),
  O('iBoot','Play Action Bootleg','pass','I-Formation','Fake the dive; roll right for layered routes.',3,9,['d43Cover3','dDimePrevent'],'bootleg'),
  O('iLead','FB Lead','run','I-Formation','Fullback clears the B gap for the halfback.',1,5,['d34Inside','d43Sam'],'lead','B-right'),
  O('trInside','Inside Zone','run','Shotgun Trips','Cut inside against a spread front.',2,5,['d34Inside','d43Sam'],'trips-inside','A-left'),
  O('trFlood','Flood','pass','Shotgun Trips','Three routes stack shallow, intermediate, and deep.',3,10,['d43Cover3','dNickelMatch'],'flood'),
  O('trStick','Stick','pass','Shotgun Trips','Short stick and flat reads for a quick completion.',2,6,['dNickelCover1','d34Cover2Man'],'stick'),
  O('trPost','Deep Post','pass','Shotgun Trips','Post behind the safety with an underneath outlet.',5,15,['dDimeQuarters','dDimePrevent'],'post'),
  O('iPower','Power','run','I-Formation','Pulling guard follows the fullback off tackle.',2,5,[],'power','C-right'),
  O('iCounter','Counter','run','I-Formation','Back counters behind a pulling guard.',3,5,[],'counter','C-left'),
  O('iCross','Play Action Cross','pass','I-Formation','Run fake opens crossing routes behind linebackers.',3,9,[],'pa-cross'),
  O('sbStick','Stick','pass','Singleback','Read the stick and flat defender quickly.',2,5,[],'stick'),
  O('sgFlood','Flood','pass','Shotgun','Three routes attack one sideline at different depths.',3,9,[],'flood'),
  O('sgStick','Stick','pass','Shotgun','Quick stick and flat combination.',2,5,[],'stick'),
  O('pInside','Inside Zone','run','Pistol','Downhill zone run behind the quarterback.',1,4,[],'inside-zone','A-left'),
  O('pPower','Power','run','Pistol','Pulling guard leads an off-tackle run.',2,5,[],'power','C-left'),
  O('pCounter','Counter','run','Pistol','Counter step uses the defense’s pursuit.',3,5,[],'counter','C-right'),
  O('pSlants','Slants','pass','Pistol','Quick slants behind a downhill run threat.',2,6,[],'slants'),
  O('pBoot','Play Action Bootleg','pass','Pistol','Fake the run then roll out for layered routes.',3,8,[],'bootleg')
].filter(p=>offenseGroups.some(g=>g.plays.includes(p.id))).map(p=>({...p,
  situation:p.kind==='run'?'Early downs or manageable short yardage.':p.risk>=5?'When a deeper gain is needed.':'Against a defense leaving space for a quick throw.',
  strength:p.kind==='run'?'Attacks a specific gap or defensive pursuit.':p.concept==='mesh'||p.concept==='pa-cross'?'Crossing routes challenge man coverage.':p.concept==='verticals'?'Inside seams stretch two deep safeties.':p.concept==='flood'?'Three levels stress a sideline zone.':'Route timing creates a defined throwing window.',
  weakness:p.kind==='run'?'A disciplined run fit can close the lane.':p.risk>=5?'Pressure or deep help can prevent the throw.':'Tight underneath coverage can contest the catch.'
}))
const D=(id:string,name:string,kind:PlayKind,formation:string,description:string,counter:string[],concept:string):PlaySpec=>({id,name,kind,formation,description,risk:kind==='blitz'?3:2,base:0,counter,concept})
export const defensivePlays:PlaySpec[]=[
  D('d43Cover2','Cover 2 Zone','zone','4–3 Base','Two deep safeties; corners protect flats.',['sbSlants','trStick'],'cover2'),
  D('d43Cover3','Cover 3 Zone','zone','4–3 Base','Three deep defenders, four underneath.',['trFlood','sbPACross'],'cover3'),
  D('d43Cover1','Cover 1 Man','man','4–3 Base','Man coverage with a free safety over top.',['sbSlants','sgMesh'],'cover1'),
  D('d43Sam','Sam Linebacker Blitz','blitz','4–3 Base','Sam rushes C gap; three deep replace his zone.',['sbInside','iDive'],'sam-blitz'),
  D('d34Cover3','Cover 3 Zone','zone','3–4 Base','Odd front and three-deep shell.',['sbPACross','iBoot'],'cover3'),
  D('d34Cover2Man','Cover 2 Man','man','3–4 Base','Two safeties deep, underneath man coverage.',['trStick','sbSlants'],'cover2man'),
  D('d34Outside','Outside LB Blitz','blitz','3–4 Base','Edge linebackers pressure both tackles.',['sbOutside','iToss'],'outside-blitz'),
  D('d34Inside','Inside LB Blitz','blitz','3–4 Base','Interior linebackers attack A gaps.',['iDive','iLead','trInside'],'inside-blitz'),
  D('dNickelCover2','Cover 2 Zone','zone','Nickel 4–2–5','Nickel defender owns the slot flat.',['sgBubble','trStick'],'cover2'),
  D('dNickelMatch','Cover 3 Match','zone','Nickel 4–2–5','Three deep; underneath defenders match routes.',['sgMesh','trFlood'],'cover3match'),
  D('dNickelCover1','Cover 1 Man','man','Nickel 4–2–5','Man across the slots with one high safety.',['sgBubble','sbSlants'],'cover1'),
  D('dNickelBlitz','Nickel Blitz','blitz','Nickel 4–2–5','Nickel back rushes; safety rotates into coverage.',['sgDraw','iToss'],'nickel-blitz'),
  D('dDimeQuarters','Cover 4 Quarters','zone','Dime 4–1–6','Four deep quarters limit vertical routes.',['sgVerticals','trPost'],'quarters'),
  D('dDimeCover2Man','Cover 2 Man','man','Dime 4–1–6','Two deep safeties and tight man underneath.',['trStick','sgMesh'],'cover2man'),
  D('dDimePrevent','Prevent Defense','zone','Dime 4–1–6','Deep cushion protects the end zone.',['sgVerticals','trPost'],'prevent'),
  D('dDimeDBBlitz','Defensive Back Blitz','blitz','Dime 4–1–6','Dime back rushes from the blind side.',['sgBubble','trFlood'],'db-blitz'),
  D('cover0','Cover 0','man','Nickel 4–2–5','Man coverage with no deep safety and an extra rusher.',[],'cover0'),
  D('cover1','Cover 1','man','4–3 Base','Man coverage with one free safety deep.',[],'cover1'),
  D('cover2','Cover 2','zone','4–3 Base','Two deep safeties and five underneath zones.',[],'cover2'),
  D('cover3','Cover 3','zone','4–3 Base','Three deep thirds and four underneath zones.',[],'cover3'),
  D('cover4','Cover 4','zone','Nickel 4–2–5','Four defenders divide the deep field.',[],'quarters'),
  D('samBlitz','Sam Blitz','blitz','4–3 Base','Strongside linebacker rushes; three deep replace him.',[],'sam-blitz'),
  D('nickelBlitz','Nickel Blitz','blitz','Nickel 4–2–5','Nickel back rushes from the slot.',[],'nickel-blitz')
].filter(p=>defenseGroups.some(g=>g.plays.includes(p.id))).map(p=>({...p,
  situation:p.kind==='blitz'?'When pressure must arrive quickly.':p.kind==='man'?'Against short timing routes.':'Against layered passing routes.',
  strength:p.concept==='cover0'?'Extra rusher challenges protection.':p.concept==='cover1'?'Tight coverage with a middle-field helper.':p.concept==='cover2'?'Protects flats and deep halves.':p.concept==='cover3'?'Three defenders protect deep thirds.':p.concept==='quarters'?'Four defenders limit vertical throws.':'Pressure disrupts a slow-developing play.',
  weakness:p.concept==='cover0'?'No safety help behind man defenders.':p.concept==='cover1'?'Crossing routes can separate from man coverage.':p.concept==='cover2'?'Inside seams can stretch both safeties.':p.concept==='cover3'?'A three-level flood can overload one sideline.':p.concept==='quarters'?'A light box can invite the run.':'A draw or quick throw can exploit the vacated space.'
}))
export const defensiveLookForCall=(id:string)=>defensivePlays.find(p=>p.id===id)?.formation==='Nickel 4–2–5'?'look425':'look43'
export const fakePlays:PlaySpec[]=[
  {...O('fakePuntPass','Fake Punt Pass','pass','Punt','Punter throws to the gunner.',5,8,['puntSafe','puntBlock'],'fake-punt-pass'),fake:true},
  {...O('fakePuntRun','Fake Punt Run','run','Punt','Punter follows interior protection.',5,4,['puntSafe','puntBlock'],'fake-punt-run','B-right'),fake:true},
  {...O('fakeFGPass','Fake Field Goal Pass','pass','Field Goal','Holder rolls out and throws to the wing.',5,7,['fieldGoalSafe','fieldGoalBlock'],'fake-fg-pass'),fake:true},
  {...O('fakeFGRun','Fake Field Goal Run','run','Field Goal','Holder keeps the snap and runs outside.',5,4,['fieldGoalSafe','fieldGoalBlock'],'fake-fg-run','D-right'),fake:true}
]
export const specialGroups:FormationGroup[]=[
  {id:'punt',name:'Punt',plays:['punt','fakePuntPass','fakePuntRun']},
  {id:'fieldGoal',name:'Field Goal',plays:['fieldGoal','fakeFGPass','fakeFGRun']}
]
export const specialResponses=[{id:'puntReturn',name:'Punt Return'},{id:'puntBlock',name:'Punt Block'},{id:'fieldGoalBlock',name:'Field Goal Block'},{id:'puntSafe',name:'Punt Safe'},{id:'fieldGoalSafe',name:'Field Goal Safe'}]
export const offenseById=(id:string)=>[...offensivePlays,...fakePlays].find(p=>p.id===id)
export const defenseById=(id:string)=>defensivePlays.find(p=>p.id===id)
export const offenseGroupFor=(id:string)=>offenseGroups.find(g=>g.plays.includes(id))
export const defenseGroupFor=(id:string)=>defenseGroups.find(g=>g.plays.includes(id))
