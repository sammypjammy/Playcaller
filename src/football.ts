/** Football structure and coordinates. `yard` always increases toward the offense's goal. */
import { defenseById, offenseById, offenseGroupFor } from './playbook'
export type Side = 'home'|'away'
export type OffensivePosition = 'QB'|'HB'|'FB'|'WR'|'TE'|'LT'|'LG'|'C'|'RG'|'RT'|'P'|'K'|'H'
export type DefensivePosition = 'DE'|'DT'|'NT'|'EDGE'|'MLB'|'OLB'|'ILB'|'CB'|'NB'|'DB'|'FS'|'SS'
export type Position = OffensivePosition|DefensivePosition
export type Ratings = {speed:number;strength:number;blocking:number;passing:number;catching:number;tackling:number;coverage:number}
export type RosterPlayer = {id:string;name:string;jersey:number;position:Position;team:Side;ratings:Ratings}
export type Coordinate = {yard:number;lateral:number}
export type AssignmentKind = 'passing'|'handoff'|'ballCarry'|'route'|'passBlock'|'runBlock'|'pullBlock'|'leadBlock'|'playAction'|'protection'|'passRush'|'runGap'|'man'|'zone'|'blitz'|'qbSpy'|'edgeContain'|'runSupport'|'deepSafety'
export type Assignment = {kind:AssignmentKind;target?:string;gap?:Gap;zone?:string;route?:string}
export type PlayerState = 'set'|'moving'|'blocking'|'carrying'|'covering'|'rushing'
export type ActivePlayer = RosterPlayer & {formationRole:string;field:Coordinate;preSnap:Coordinate;assignment:Assignment;state:PlayerState;onLine:boolean;eligible:boolean;technique?:Technique}
export type Gap = 'A-left'|'A-right'|'B-left'|'B-right'|'C-left'|'C-right'|'D-left'|'D-right'
export type Technique = '0'|'1'|'2'|'2i'|'3'|'4'|'4i'|'5'|'6'|'7'|'9'
export const allTechniques:Technique[]=['0','1','2','2i','3','4','4i','5','6','7','9']
export type PersonnelCode = '00'|'01'|'10'|'11'|'12'|'13'|'20'|'21'|'22'|'23'
export type Personnel = {code:PersonnelCode;rb:number;te:number;wr:number}
export const personnel:Record<PersonnelCode,Personnel> = {
  '00':{code:'00',rb:0,te:0,wr:5},'01':{code:'01',rb:0,te:1,wr:4},
  '10':{code:'10',rb:1,te:0,wr:4},'11':{code:'11',rb:1,te:1,wr:3},
  '12':{code:'12',rb:1,te:2,wr:2},'13':{code:'13',rb:1,te:3,wr:1},
  '20':{code:'20',rb:2,te:0,wr:3},'21':{code:'21',rb:2,te:1,wr:2},
  '22':{code:'22',rb:2,te:2,wr:1},'23':{code:'23',rb:2,te:3,wr:0}
}
type BackSlot = {depth:number;lateral:number}
export type OffensiveFormation = {id:string;name:string;family:'underCenter'|'shotgun'|'pistol';compatible:PersonnelCode[];defaultPersonnel:PersonnelCode;qbDepth:number;backSlots:BackSlot[];teLateral:number[];wrLateral:number[];lineEnds:'wide'|'tightRight'|'tightLeft'|'tightBoth';mirrorOf?:string}
const underBack=[{depth:-7,lateral:0},{depth:-4,lateral:0}]
const singleBack=[{depth:-7,lateral:0},{depth:-5,lateral:4}]
const shotgunBack=[{depth:-5,lateral:4},{depth:-6,lateral:-4}]
const pistolBack=[{depth:-7,lateral:0},{depth:-5,lateral:3}]
const F=(id:string,name:string,family:OffensiveFormation['family'],compatible:PersonnelCode[],defaultPersonnel:PersonnelCode,qbDepth:number,backSlots:BackSlot[],teLateral:number[],wrLateral:number[],lineEnds:OffensiveFormation['lineEnds'],mirrorOf?:string):OffensiveFormation=>({id,name,family,compatible,defaultPersonnel,qbDepth,backSlots,teLateral,wrLateral,lineEnds,mirrorOf})
export const offensiveFormations:OffensiveFormation[]=[
  F('i','I-Formation','underCenter',['20','21','22','23'],'21',-.9,underBack,[5,-5,8],[-20,20,-12,12,0],'tightRight'),
  F('strongI','Strong I','underCenter',['20','21','22','23'],'21',-.9,[{depth:-7,lateral:0},{depth:-4,lateral:2.5}],[5,-5,8],[-20,20,-12,12,0],'tightRight'),
  F('weakI','Weak I','underCenter',['20','21','22','23'],'21',-.9,[{depth:-7,lateral:0},{depth:-4,lateral:-2.5}],[-5,5,-8],[20,-20,12,-12,0],'tightLeft','strongI'),
  F('ace','Singleback Ace','underCenter',['11','12','13'],'12',-.9,singleBack,[-5,5,8],[-20,20,-12,12,0],'tightBoth'),
  F('singleDoubles','Singleback','underCenter',['11'],'11',-.9,singleBack,[5,-5,8],[-20,20,-12,12,0],'tightRight'),
  F('singleTrips','Singleback Trips','underCenter',['10','11','12'],'11',-.9,singleBack,[5,-5,8],[-20,8,15,22,-12],'tightRight'),
  F('shotgunSpread','Shotgun Spread','shotgun',['11'],'11',-5,shotgunBack,[5,-5,8],[-20,20,-11,11,0],'wide'),
  F('shotgunTripsRight','Shotgun Trips','shotgun',['11'],'11',-5,shotgunBack,[5,-5,8],[-20,8,15,22,-11],'wide'),
  F('shotgunTripsLeft','Shotgun Trips Left','shotgun',['10','11'],'10',-5,[{depth:-5,lateral:-4},{depth:-6,lateral:4}],[-5,5,-8],[20,-8,-15,-22,11],'wide','shotgunTripsRight'),
  F('shotgunDoubles','Shotgun Doubles','shotgun',['10','11'],'11',-5,shotgunBack,[5,-5,8],[-20,20,-11,11,0],'wide'),
  F('shotgunBunch','Shotgun Bunch','shotgun',['10','11'],'11',-5,shotgunBack,[5,-5,8],[-20,12,16,20,-11],'tightRight'),
  F('shotgunEmpty','Shotgun Empty','shotgun',['00','01'],'00',-5,[],[5,-5,8],[-20,20,-11,11,0],'wide'),
  F('pistolStrong','Pistol Strong','pistol',['10','11','12','20','21','22'],'21',-4,pistolBack,[5,-5,8],[-20,20,-12,12,0],'tightRight'),
  F('pistolWeak','Pistol Weak','pistol',['10','11','12','20','21','22'],'21',-4,[{depth:-7,lateral:0},{depth:-5,lateral:-3}],[-5,5,-8],[20,-20,12,-12,0],'tightLeft','pistolStrong'),
  F('pistolSpread','Pistol Spread','pistol',['10','11'],'10',-4,pistolBack,[5,-5,8],[-20,20,-11,11,0],'wide')
]
export type DefensivePackage = {id:string;name:string;line:DefensivePosition[];linebackers:DefensivePosition[];backs:DefensivePosition[]}
const DP=(id:string,name:string,line:DefensivePosition[],linebackers:DefensivePosition[],backs:DefensivePosition[]):DefensivePackage=>({id,name,line,linebackers,backs})
export const defensivePackages:DefensivePackage[]=[
  DP('base43','4–3',['DE','DT','DT','DE'],['OLB','MLB','OLB'],['CB','CB','FS','SS']),
  DP('base34','3–4',['DE','NT','DE'],['OLB','ILB','ILB','OLB'],['CB','CB','FS','SS']),
  DP('base44','4–4',['DE','DT','DT','DE'],['OLB','MLB','ILB','OLB'],['CB','CB','FS']),
  DP('nickel425','Nickel 4–2–5',['DE','DT','DT','DE'],['MLB','OLB'],['CB','CB','NB','FS','SS']),
  DP('nickel335','Nickel 3–3–5',['DE','NT','DE'],['OLB','MLB','OLB'],['CB','CB','NB','FS','SS']),
  DP('dime416','Dime 4–1–6',['DE','DT','DT','DE'],['MLB'],['CB','CB','NB','DB','FS','SS']),
  DP('quarter317','Quarter 3–1–7',['DE','NT','DE'],['MLB'],['CB','CB','NB','DB','DB','FS','SS']),
  DP('goalLine','Goal Line',['DE','DT','NT','DT','DE'],['OLB','MLB','ILB','OLB'],['CB','SS']),
  DP('bear52','Bear 5–2–4',['DE','DT','NT','DT','DE'],['MLB','OLB'],['CB','CB','FS','SS']),
  DP('wide43','Wide 9 4–3',['EDGE','DT','DT','EDGE'],['OLB','MLB','OLB'],['CB','CB','FS','SS'])
]
export type FrontSlot = {technique:Technique;side:'left'|'right'|'center';gap:Gap}
export type DefensiveFront = {id:string;name:string;lineCount:number;slots:FrontSlot[]}
const slot=(technique:Technique,side:FrontSlot['side'],gap:Gap):FrontSlot=>({technique,side,gap})
export const defensiveFronts:DefensiveFront[]=[
  {id:'even',name:'Even Front',lineCount:4,slots:[slot('5','left','C-left'),slot('3','left','B-left'),slot('2i','right','A-right'),slot('5','right','C-right')]},
  {id:'odd',name:'Odd Front',lineCount:3,slots:[slot('4i','left','B-left'),slot('0','center','A-right'),slot('4i','right','B-right')]},
  {id:'over',name:'Over Front',lineCount:4,slots:[slot('6','left','C-left'),slot('2','left','A-left'),slot('3','right','B-right'),slot('7','right','C-right')]},
  {id:'under',name:'Under Front',lineCount:4,slots:[slot('7','left','C-left'),slot('3','left','B-left'),slot('1','right','A-right'),slot('4','right','B-right')]},
  {id:'wide9',name:'Wide 9 Front',lineCount:4,slots:[slot('9','left','D-left'),slot('3','left','B-left'),slot('2i','right','A-right'),slot('9','right','D-right')]},
  {id:'bear',name:'Bear Front',lineCount:5,slots:[slot('6','left','C-left'),slot('3','left','B-left'),slot('0','center','A-right'),slot('3','right','B-right'),slot('6','right','C-right')]},
  {id:'goal',name:'Goal Line Front',lineCount:5,slots:[slot('7','left','C-left'),slot('4','left','B-left'),slot('0','center','A-right'),slot('4','right','B-right'),slot('7','right','C-right')]}
]
export type Coverage = {id:string;name:string;deep:number;mode:'man'|'zone'|'run'}
export const coverages:Coverage[]=[{id:'cover0',name:'Cover 0',deep:0,mode:'man'},{id:'cover2',name:'Cover 2',deep:2,mode:'zone'},{id:'cover3',name:'Cover 3',deep:3,mode:'zone'},{id:'cover4',name:'Cover 4 Quarters',deep:4,mode:'zone'},{id:'prevent',name:'Prevent',deep:4,mode:'zone'},{id:'cover2Man',name:'Cover 2 Man',deep:2,mode:'man'},{id:'pressMan',name:'Cover 1 Man',deep:1,mode:'man'},{id:'runFit',name:'Run Fit',deep:1,mode:'run'}]
export type DefensiveLook = {id:string;name:string;packageId:string;frontId:string;coverageId:string}
export const defensiveLooks:DefensiveLook[]=[
  {id:'look43',name:'4–3 Base',packageId:'base43',frontId:'even',coverageId:'cover3'},
  {id:'look34',name:'3–4 Base',packageId:'base34',frontId:'odd',coverageId:'cover3'},
  {id:'look44',name:'4–4 Run Front',packageId:'base44',frontId:'over',coverageId:'runFit'},
  {id:'look425',name:'Nickel 4–2–5',packageId:'nickel425',frontId:'even',coverageId:'cover2'},
  {id:'look335',name:'Nickel 3–3–5',packageId:'nickel335',frontId:'odd',coverageId:'cover3'},
  {id:'look416',name:'Dime 4–1–6',packageId:'dime416',frontId:'under',coverageId:'cover2'},
  {id:'look317',name:'Quarter 3–1–7',packageId:'quarter317',frontId:'odd',coverageId:'cover3'},
  {id:'lookGoal',name:'Goal Line',packageId:'goalLine',frontId:'goal',coverageId:'runFit'},
  {id:'lookBear',name:'Bear Front',packageId:'bear52',frontId:'bear',coverageId:'runFit'},
  {id:'lookWide9',name:'Wide 9 Front',packageId:'wide43',frontId:'wide9',coverageId:'cover3'}
]

const firstNames=['Jalen','Marcus','Eli','Dante','Caleb','Trey','Nolan','Andre','Isaiah','Miles','Roman','Theo','Devin','Keon','Malik','Owen','Cole','Avery','Micah','Bryce','Jonah','Zion','Arlen','Darius','Luca','Emmett','Rashad','Kendrick']
const lastNames=['Cross','Mercer','Hayes','Vale','Dawson','Brooks','Vega','Price','Bennett','Stone','Reed','Cole','Morris','Banks','Holt','Warren','Ellis','Foster','Blake','Rivers','Porter','Harris','Walsh','Young','Turner','Grant','King','Carter']
const rosterNumbers:Record<Position,number[]>={QB:[12],HB:[22,28],FB:[40],WR:[11,17,19,82,83],TE:[86,87,88],LT:[70],LG:[71],C:[72],RG:[73],RT:[74],P:[6],K:[3],H:[8],DE:[90,91,92],DT:[93,94,95],NT:[96],EDGE:[97,98],MLB:[50,51],OLB:[52,53,54],ILB:[55,56],CB:[20,21,23],NB:[24,25],DB:[26,27],FS:[30,31],SS:[32,33]}
const baseRatings:Record<Position,Ratings>={
  QB:{speed:66,strength:62,blocking:35,passing:81,catching:45,tackling:28,coverage:25},
  P:{speed:57,strength:55,blocking:30,passing:52,catching:40,tackling:32,coverage:25},K:{speed:54,strength:48,blocking:25,passing:30,catching:35,tackling:30,coverage:23},H:{speed:59,strength:53,blocking:36,passing:48,catching:64,tackling:31,coverage:28},
  HB:{speed:83,strength:70,blocking:61,passing:38,catching:70,tackling:38,coverage:28},FB:{speed:67,strength:82,blocking:79,passing:30,catching:58,tackling:49,coverage:31},
  WR:{speed:84,strength:62,blocking:55,passing:30,catching:80,tackling:35,coverage:30},TE:{speed:72,strength:80,blocking:74,passing:30,catching:76,tackling:45,coverage:32},
  LT:{speed:55,strength:86,blocking:84,passing:20,catching:25,tackling:45,coverage:20},LG:{speed:56,strength:84,blocking:82,passing:20,catching:25,tackling:46,coverage:20},C:{speed:54,strength:83,blocking:83,passing:20,catching:25,tackling:45,coverage:20},RG:{speed:56,strength:84,blocking:82,passing:20,catching:25,tackling:46,coverage:20},RT:{speed:55,strength:86,blocking:84,passing:20,catching:25,tackling:45,coverage:20},
  DE:{speed:72,strength:83,blocking:30,passing:20,catching:25,tackling:79,coverage:35},DT:{speed:62,strength:88,blocking:30,passing:20,catching:25,tackling:81,coverage:28},NT:{speed:57,strength:91,blocking:30,passing:20,catching:25,tackling:84,coverage:24},EDGE:{speed:82,strength:77,blocking:30,passing:20,catching:25,tackling:78,coverage:42},
  MLB:{speed:74,strength:79,blocking:30,passing:20,catching:40,tackling:82,coverage:67},OLB:{speed:79,strength:74,blocking:30,passing:20,catching:39,tackling:76,coverage:67},ILB:{speed:72,strength:80,blocking:30,passing:20,catching:40,tackling:81,coverage:62},
  CB:{speed:86,strength:60,blocking:30,passing:20,catching:66,tackling:67,coverage:83},NB:{speed:83,strength:64,blocking:30,passing:20,catching:64,tackling:70,coverage:79},DB:{speed:81,strength:67,blocking:30,passing:20,catching:62,tackling:69,coverage:77},FS:{speed:82,strength:69,blocking:30,passing:20,catching:68,tackling:72,coverage:81},SS:{speed:78,strength:76,blocking:30,passing:20,catching:62,tackling:78,coverage:73}
}
export function createRoster(team:Side):RosterPlayer[]{
  let index=0
  return (Object.keys(rosterNumbers) as Position[]).flatMap(position=>rosterNumbers[position].map(jersey=>{
    const n=index++,bias=(team==='home'?3:-2),variation=(n*7%9)-4
    const ratings=Object.fromEntries(Object.entries(baseRatings[position]).map(([k,v])=>[k,Math.max(20,Math.min(99,v+bias+variation))])) as Ratings
    return {id:`${team}-${position}-${jersey}`,name:`${firstNames[(n*5+(team==='home'?2:5))%firstNames.length]} ${lastNames[(n*11+Math.floor(n/28)*3+(team==='home'?3:9))%lastNames.length]}`,jersey,position,team,ratings}
  }))
}
export const rosters:Record<Side,RosterPlayer[]>={home:createRoster('home'),away:createRoster('away')}
const offensiveLine:OffensivePosition[]=['LT','LG','C','RG','RT']
const lineLateral=[-2.8,-1.4,0,1.4,2.8]
function choose(roster:RosterPlayer[],position:Position,index=0):RosterPlayer {
  const player=roster.filter(p=>p.position===position)[index]
  if(!player) throw new Error(`Roster lacks ${position} #${index+1}`)
  return player
}
function active(player:RosterPlayer,formationRole:string,field:Coordinate,onLine:boolean,eligible:boolean):ActivePlayer {
  return {...player,formationRole,field,preSnap:{...field},assignment:{kind:'runSupport'},state:'set',onLine,eligible}
}
function eligibleNumber(jersey:number){return jersey>=0&&jersey<=49||jersey>=80&&jersey<=89}
function receiversOnLine(players:ActivePlayer[],strategy:OffensiveFormation['lineEnds']){
  const skill=players.filter(p=>p.position==='WR'||p.position==='TE')
  const byLateral=[...skill].sort((a,b)=>a.field.lateral-b.field.lateral)
  let left=byLateral[0],right=byLateral.at(-1)
  const tes=skill.filter(p=>p.position==='TE')
  if(strategy==='tightRight'&&tes.length)right=tes.find(p=>p.field.lateral>0)??tes[0]
  if(strategy==='tightLeft'&&tes.length)left=tes.find(p=>p.field.lateral<0)??tes[0]
  if(strategy==='tightBoth'&&tes.length>=2){left=tes.find(p=>p.field.lateral<0)??tes[0];right=tes.find(p=>p.field.lateral>0)??tes[1]}
  if(left?.id===right?.id)throw new Error('Formation needs two line ends')
  for(const p of skill){p.onLine=p.id===left.id||p.id===right!.id;p.eligible=eligibleNumber(p.jersey)}
}
export function buildOffense(team:Side,formationId:string,code?:PersonnelCode,los=50):ActivePlayer[]{
  const formation=offensiveFormations.find(f=>f.id===formationId)
  if(!formation)throw new Error(`Unknown offensive formation ${formationId}`)
  const group=personnel[code??formation.defaultPersonnel]
  if(!formation.compatible.includes(group.code))throw new Error(`${group.code} cannot use ${formation.name}`)
  const roster=rosters[team],players:ActivePlayer[]=[]
  offensiveLine.forEach((position,i)=>players.push(active(choose(roster,position),position,{yard:los,lateral:lineLateral[i]},true,false)))
  players.push(active(choose(roster,'QB'),'QB',{yard:los+formation.qbDepth,lateral:0},false,false))
  for(let i=0;i<group.rb;i++){
    const position=i===0?'HB':'FB',slot=formation.backSlots[i]
    if(!slot)throw new Error(`Missing back slot in ${formation.name}`)
    players.push(active(choose(roster,position),position,{yard:los+slot.depth,lateral:slot.lateral},false,true))
  }
  for(let i=0;i<group.te;i++)players.push(active(choose(roster,'TE',i),`TE${i+1}`,{yard:los,lateral:formation.teLateral[i]},false,true))
  for(let i=0;i<group.wr;i++)players.push(active(choose(roster,'WR',i),`WR${i+1}`,{yard:los,lateral:formation.wrLateral[i]},false,true))
  receiversOnLine(players,formation.lineEnds)
  for(const p of players.filter(p=>(p.position==='WR'||p.position==='TE')&&!p.onLine))p.field.yard=los-1.7
  for(const p of players)p.preSnap={...p.field}
  const errors=validateOffense(players,group)
  if(errors.length)throw new Error(`${formation.name} ${group.code}: ${errors.join('; ')}`)
  return players
}

const techniqueOffset:Record<Technique,number>={'0':0,'1':.6,'2':1.4,'2i':1.05,'3':2.1,'4':2.8,'4i':2.45,'5':3.6,'6':4.4,'7':5.2,'9':6.8}
function coverageForCall(callId:string,look:DefensiveLook){const concept=defenseById(callId)?.concept; if(concept==='cover0')return 'cover0';if(concept==='cover2')return 'cover2';if(concept==='cover3'||concept==='cover3match')return 'cover3';if(concept==='cover1')return 'pressMan';if(concept==='cover2man')return 'cover2Man';if(concept==='quarters')return 'cover4';if(concept==='prevent')return 'prevent';if(concept?.includes('blitz'))return 'cover3';return look.coverageId}
export function buildDefense(team:Side,lookId:string,offense:ActivePlayer[],callId='base',los=50):ActivePlayer[]{
  const look=defensiveLooks.find(x=>x.id===lookId)
  if(!look)throw new Error(`Unknown defensive look ${lookId}`)
  const pack=defensivePackages.find(x=>x.id===look.packageId)!,front=defensiveFronts.find(x=>x.id===look.frontId)!
  if(pack.line.length!==front.lineCount)throw new Error('Front and package line counts differ')
  const roster=rosters[team],players:ActivePlayer[]=[],counts:Partial<Record<Position,number>>={}
  const next=(position:DefensivePosition)=>{const index=counts[position]??0;counts[position]=index+1;return choose(roster,position,index)}
  const coverageId=coverageForCall(callId,look)
  const concept=defenseById(callId)?.concept??'cover3'
  const teRight=offense.some(p=>p.position==='TE'&&p.field.lateral>0)
  const teLeft=offense.some(p=>p.position==='TE'&&p.field.lateral<0)
  const strengthShift=teRight && !teLeft ? 0.8 : teLeft && !teRight ? -0.8 : 0
  pack.line.forEach((position,i)=>{
    const slot=front.slots[i],sign=slot.side==='left'?-1:slot.side==='right'?1:0
    const shift=sign>0&&teRight?.25:sign<0&&teLeft?-.25:0
    const p=active(next(position),`${slot.side} ${slot.technique}-tech`,{yard:los+1.1,lateral:sign*techniqueOffset[slot.technique]+shift},false,false)
    p.technique=slot.technique;p.assignment={kind:'passRush',gap:slot.gap};players.push(p)
  })
  pack.linebackers.forEach((position,i)=>{
    const lateral=(i-(pack.linebackers.length-1)/2)*4.8+strengthShift
    const p=active(next(position),['Will LB','Mike LB','Sam LB','Jack LB'][i],{yard:los+5.8,lateral},false,false)
    const gaps:Gap[]=['B-left','A-left','A-right','B-right']
    const blitz=concept==='cover0'?i===pack.linebackers.length-1:concept==='sam-blitz'?i===pack.linebackers.length-1:concept==='outside-blitz'?i===0||i===pack.linebackers.length-1:concept==='inside-blitz'?i===1||i===2:false
    p.assignment=blitz?{kind:'blitz',gap:concept==='outside-blitz'?(i===0?'D-left':'D-right'):gaps[i%4]}:{kind:'runGap',gap:gaps[i%4]}
    players.push(p)
  })
  const wr=offense.filter(p=>p.position==='WR').sort((a,b)=>a.field.lateral-b.field.lateral)
  const cornerLateral=[wr[0]?.field.lateral??-18,wr.at(-1)?.field.lateral??18]
  const slotLateral=wr.slice(1,-1).map(p=>p.field.lateral)
  pack.backs.forEach((position,i)=>{
    const isCorner=position==='CB',isSafety=position==='FS'||position==='SS'
    const lateral=isCorner?cornerLateral[counts.CB??0]??(i%2?-18:18):isSafety?(position==='FS'?-8:8)+strengthShift:slotLateral[(counts.NB??0)+(counts.DB??0)]??(position==='NB'?-10:10+6*(counts.DB??0))
    const depth=Math.min(isSafety?(coverageId==='cover0'?5:coverageId==='pressMan'&&position==='SS'?6:coverageId==='cover3'&&position==='SS'?8:coverageId==='prevent'?20:14):isCorner?(coverageId==='cover0'||coverageId==='pressMan'||coverageId==='cover2Man'?1.1:coverageId==='prevent'?14:7):coverageId==='cover0'||coverageId==='pressMan'?2:9,110-los-.5)
    const role=isCorner?`${(counts.CB??0)===0?'Left':'Right'} Corner`:position==='FS'?'Free Safety':position==='SS'?'Strong Safety':position==='NB'?'Nickel Slot':`Dime Back ${counts.DB??0}`
    const p=active(next(position),role,{yard:los+depth,lateral},false,false)
    p.assignment={kind:'zone',zone:isSafety?'deep':isCorner?'outside':'slot'};players.push(p)
  })
  if(concept==='nickel-blitz'||concept==='db-blitz'){
    const blitzer=players.find(p=>p.position===(concept==='nickel-blitz'?'NB':'DB'))
    if(blitzer)blitzer.assignment={kind:'blitz',gap:blitzer.field.lateral<0?'D-left':'D-right'}
  }
  assignDefense(players,offense,coverageId,callId)
  const errors=validateDefense(players,pack,front)
  if(errors.length)throw new Error(`${look.name}: ${errors.join('; ')}`)
  return players
}
function assignOffense(players:ActivePlayer[],playId:string){
  const spec=offenseById(playId),concept=spec?.concept??'inside-zone',pass=spec?.kind==='pass'
  const routes:Record<string,string[]>={slants:['slant','slant','slant','flat'], 'pa-cross':['cross','post','flat','drag'],verticals:['vertical','vertical','vertical','vertical'],mesh:['cross','cross','sit','wheel'],bubble:['bubble','block bubble','vertical','flat'],bootleg:['cross','deep out','flat','drag'],flood:['flat','out','post','corner'],stick:['stick','flat','vertical','hitch'],post:['post','go','cross','flat'],'fake-punt-pass':['gunner go','gunner out','flat'],'fake-fg-pass':['wing out','flat','post']}
  const routeList=routes[concept]??['flat','slant','post','cross']
  const eligible=players.filter(p=>p.position==='WR'||p.position==='TE').sort((a,b)=>a.field.lateral-b.field.lateral)
  for(const p of players){
    const side=p.field.lateral<0?'left':'right'
    if(p.position==='QB'){p.assignment={kind:concept.startsWith('pa-')||concept==='bootleg'?'playAction':pass?'passing':'handoff',target:concept==='bootleg'?'roll right':pass?'read progression':'HB'};continue}
    if(offensiveLine.includes(p.position as OffensivePosition)){
      const pull=['toss','lead','power','counter'].includes(concept)&&p.position===(concept==='toss'||concept==='power'?'RG':'LG')
      p.assignment={kind:pass?'passBlock':pull?'pullBlock':'runBlock',gap:spec?.target as Gap??(side==='left'?'B-left':'B-right'),target:concept};continue
    }
    if(p.position==='HB'){p.assignment=pass?(concept==='pa-cross'||concept==='bootleg'?{kind:'playAction',target:'fake handoff'}:concept==='bubble'||concept==='verticals'?{kind:'protection',target:'edge rusher'}:{kind:'route',route:concept==='mesh'?'wheel':'checkdown'}):{kind:'ballCarry',gap:spec?.target as Gap??'A-right'};continue}
    if(p.position==='FB'){p.assignment=pass?{kind:'protection',target:'inside rush'}:{kind:'leadBlock',gap:spec?.target as Gap??'A-right'};continue}
    const index=eligible.indexOf(p)
    p.assignment=pass?{kind:routeList[index]==='block bubble'?'passBlock':'route',route:routeList[index],target:concept}:{kind:'runBlock',target:concept==='outside-zone'||concept==='toss'?'edge defender':'second level',gap:spec?.target as Gap}
  }
}
function assignDefense(players:ActivePlayer[],offense:ActivePlayer[],coverageId:string,callId:string){
  const coverage=coverages.find(c=>c.id===coverageId)??coverages[1]
  const support=players.filter(p=>!p.technique)
  const linebackers=support.filter(p=>['MLB','OLB','ILB'].includes(p.position))
  const backs=support.filter(p=>!linebackers.includes(p))
  if(coverage.mode==='man'){
    const remaining=offense.filter(p=>p.eligible)
    const deep=coverageId==='cover0'?[]:coverageId==='cover2Man'?backs.filter(p=>p.position==='FS'||p.position==='SS'): [backs.find(p=>p.position==='FS')??backs.find(p=>p.position==='SS')].filter(Boolean) as ActivePlayer[]
    deep.forEach((p,i)=>p.assignment={kind:'deepSafety',zone:coverageId==='cover2Man'?(i===0?'left half':'right half'):'middle deep'})
    const coverers=[...backs.filter(p=>!deep.includes(p)&&p.assignment.kind!=='blitz'),...linebackers.filter(p=>p.assignment.kind!=='blitz'&&p.assignment.kind!=='edgeContain'&&p.assignment.kind!=='qbSpy')]
    for(const p of coverers){
      const nearest=[...remaining].sort((a,b)=>Math.abs(a.field.lateral-p.field.lateral)-Math.abs(b.field.lateral-p.field.lateral))[0]
      if(nearest){p.assignment={kind:'man',target:nearest.id};remaining.splice(remaining.indexOf(nearest),1)}
      else p.assignment={kind:'runSupport',gap:p.field.lateral<0?'C-left':'C-right'}
    }
    return
  }
  if(coverage.mode==='run'){
    const deep=backs.find(p=>p.position==='FS')
    if(deep)deep.assignment={kind:'deepSafety',zone:'middle deep'}
    for(const p of backs.filter(p=>p!==deep))p.assignment={kind:'runSupport',gap:p.field.lateral<0?'D-left':'D-right'}
    for(const p of linebackers)if(p.assignment.kind!=='blitz'&&p.assignment.kind!=='edgeContain'&&p.assignment.kind!=='qbSpy')p.assignment={kind:'runGap',gap:p.assignment.gap??'A-right'}
    return
  }
  const deepCandidates=coverageId==='cover3'?[...backs.filter(p=>p.position==='CB'),...backs.filter(p=>p.position==='FS'),...backs.filter(p=>p.position==='SS'),...backs.filter(p=>!['CB','FS','SS'].includes(p.position))]:[...backs.filter(p=>p.position==='FS'||p.position==='SS'),...backs.filter(p=>p.position==='CB'),...backs.filter(p=>!['CB','FS','SS'].includes(p.position))]
  const deep=deepCandidates.slice(0,coverage.deep).sort((a,b)=>a.field.lateral-b.field.lateral)
  deep.forEach((p,i)=>p.assignment={kind:'deepSafety',zone:coverageId==='prevent'?['left deep cushion','left middle cushion','right middle cushion','right deep cushion'][i]:coverage.deep===2?i===0?'left half':'right half':coverage.deep===4?['left quarter','left middle','right middle','right quarter'][i]:['left third','middle third','right third'][i]})
  for(const p of backs.filter(p=>!deep.includes(p)&&p.assignment.kind!=='blitz'))p.assignment={kind:'zone',zone:p.field.lateral<0?'left flat':'right flat'}
  for(const p of linebackers){
    if(p.assignment.kind==='blitz'||p.assignment.kind==='edgeContain'||p.assignment.kind==='qbSpy')continue
    p.assignment={kind:'zone',zone:p.field.lateral<0?'hook left':'hook right',gap:p.assignment.gap}
  }
  if(defenseById(callId)?.concept==='cover3match'){
    const nickel=backs.find(p=>p.position==='NB'&&p.assignment.kind!=='blitz')
    const slot=offense.filter(p=>p.eligible).sort((a,b)=>Math.abs(a.field.lateral-(nickel?.field.lateral??0))-Math.abs(b.field.lateral-(nickel?.field.lateral??0)))[0]
    if(nickel&&slot)nickel.assignment={kind:'man',target:slot.id,gap:nickel.field.lateral<0?'D-left':'D-right'}
  }
}
export type Matchup = {offense:ActivePlayer[];defense:ActivePlayer[];formation:OffensiveFormation;personnel:Personnel;look:DefensiveLook;front:DefensiveFront;coverage:Coverage;playId:string;defenseCall:string}
export function buildMatchup(offenseTeam:Side,formationId:string,lookId:string,playId:string,defenseCall:string,los:number,code?:PersonnelCode):Matchup {
  const formation=offensiveFormations.find(f=>f.id===formationId)!
  const group=personnel[code??formation.defaultPersonnel]
  const attacking=buildOffense(offenseTeam,formationId,group.code,los)
  assignOffense(attacking,playId)
  const defending=buildDefense(offenseTeam==='home'?'away':'home',lookId,attacking,defenseCall,los)
  const look=defensiveLooks.find(x=>x.id===lookId)!
  const front=defensiveFronts.find(x=>x.id===look.frontId)!
  const coverage=coverages.find(x=>x.id===coverageForCall(defenseCall,look))!
  const matchup={offense:attacking,defense:defending,formation,personnel:group,look,front,coverage,playId,defenseCall}
  const errors=validateMatchup(matchup)
  if(errors.length)throw new Error(errors.join('; '))
  return matchup
}
export function buildSpecialMatchup(offenseTeam:Side,playId:string,defenseCall:string,los:number):Matchup {
  const punt=playId==='punt'||playId.startsWith('fakePunt')
  const roster=rosters[offenseTeam],attack:ActivePlayer[]=[]
  const add=(position:OffensivePosition,role:string,depth:number,lateral:number,onLine=false,eligible=false,index=0)=>{const p=active(choose(roster,position,index),role,{yard:los+depth,lateral},onLine,eligible);attack.push(p);return p}
  offensiveLine.forEach((position,i)=>{const p=add(position,position,0,lineLateral[i],true);p.assignment={kind:'passBlock',target:'protect kick lane'}})
  if(punt){
    const punter=add('P','Punter',Math.max(-14,-los-9),0);punter.assignment={kind:playId==='fakePuntPass'?'passing':playId==='fakePuntRun'?'ballCarry':'passing',target:playId==='punt'?'punt':'fake'}
    const protector=add('FB','Upback',-5,0);protector.assignment={kind:'protection',target:'inside rusher'}
    const left=add('TE','Left Wing',0,-5,true,true);left.assignment={kind:'passBlock',target:'left edge'}
    const right=add('TE','Right Wing',0,5,true,true,1);right.assignment={kind:'passBlock',target:'right edge'}
    const gunnerL=add('WR','Left Gunner',-1.7,-21,false,true);gunnerL.assignment={kind:playId==='fakePuntPass'?'route':'runSupport',route:'gunner go',target:'coverage lane'}
    const gunnerR=add('WR','Right Gunner',-1.7,21,false,true,1);gunnerR.assignment={kind:playId==='fakePuntPass'?'route':'runSupport',route:'gunner out',target:'coverage lane'}
  }else{
    const holder=add('H','Holder',-7,3);holder.assignment={kind:playId==='fakeFGRun'?'ballCarry':'passing',target:playId==='fieldGoal'?'hold kick':'fake'}
    const kicker=add('K','Kicker',-10,-4);kicker.assignment={kind:playId==='fieldGoal'?'passing':'runSupport',target:'kick approach'}
    const left=add('TE','Left Wing',0,-5,true,true);left.assignment={kind:playId==='fakeFGPass'?'route':'passBlock',route:'wing out',target:'left edge'}
    const right=add('TE','Right Wing',0,5,true,true,1);right.assignment={kind:'passBlock',target:'right edge'}
    const fb=add('FB','Left Protector',-2,-8);fb.assignment={kind:playId==='fakeFGPass'?'route':'passBlock',route:'flat',target:'left edge'}
    const hb=add('HB','Right Protector',-2,9);hb.assignment={kind:playId==='fakeFGPass'?'route':'leadBlock',route:'post',gap:'D-right'}
  }
  const lookId=defenseCall==='puntReturn'?'look43':defenseCall==='puntSafe'||defenseCall==='fieldGoalSafe'?'look425':'look43'
  const defend=buildDefense(otherTeam(offenseTeam),lookId,attack,'d43Cover3',los)
  if(defenseCall==='puntReturn'){
    const returner=defend.find(p=>p.position==='FS')!
    returner.field.yard=Math.min(108,los+40);returner.assignment={kind:'runSupport',target:'return catch'}
  }else if(defenseCall==='puntBlock'||defenseCall==='fieldGoalBlock'){
    defend.filter(p=>p.position==='OLB'||p.position==='MLB').forEach((p,i)=>p.assignment={kind:'blitz',gap:i%2?'C-right':'C-left'})
  }else{
    defend.filter(p=>p.position==='FS'||p.position==='SS').forEach(p=>p.assignment={kind:'deepSafety',zone:'fake protection'})
  }
  const look=defensiveLooks.find(x=>x.id===lookId)!,front=defensiveFronts.find(x=>x.id===look.frontId)!
  const formation=F(punt?'puntUnit':'fieldGoalUnit',punt?'Punt Unit':'Field Goal Unit','underCenter',['12'],'12',-7,[],[-5,5],[-21,21],'tightBoth')
  const matchup:Matchup={offense:attack,defense:defend,formation,personnel:personnel['12'],look,front,coverage:coverages.find(x=>x.id===look.coverageId)!,playId,defenseCall}
  const errors=validateSpecialMatchup(matchup)
  if(errors.length)throw new Error(errors.join('; '))
  return matchup
}
function otherTeam(s:Side):Side{return s==='home'?'away':'home'}
export function validateSpecialMatchup(m:Matchup):string[]{
  const all=[...m.offense,...m.defense],errors:string[]=[]
  if(m.offense.length!==11||m.defense.length!==11||new Set(all.map(p=>p.id)).size!==22)errors.push('special teams need 22 unique players')
  if(m.offense.filter(p=>p.onLine).length!==7)errors.push('special teams offense needs seven on line')
  if(m.offense.filter(p=>p.onLine&&p.eligible).length!==2)errors.push('special teams need eligible line ends')
  if(m.offense.some(p=>!p.assignment.kind)||m.defense.some(p=>!p.assignment.kind))errors.push('special teams assignments missing')
  errors.push(...validateCoordinates(m.offense,'special offense'),...validateCoordinates(m.defense,'special defense'))
  return errors
}
export function formationCompatibleWithPlay(f:OffensiveFormation,playId:string){
  return offenseGroupFor(playId)?.id===f.id
}
export function assignmentEdge(matchup:Matchup){
  const attack=matchup.offense,defend=matchup.defense,run=offenseById(matchup.playId)?.kind==='run'
  const blockers=attack.filter(p=>['runBlock','pullBlock','leadBlock','passBlock','protection'].includes(p.assignment.kind))
  const defenders=defend.filter(p=>['runGap','blitz','passRush','edgeContain','man','zone','deepSafety','runSupport'].includes(p.assignment.kind))
  const block=blockers.reduce((n,p)=>n+p.ratings.blocking,0)/Math.max(1,blockers.length)
  const resistance=defenders.reduce((n,p)=>n+(run?p.ratings.tackling:p.ratings.coverage),0)/Math.max(1,defenders.length)
  const pressure=defend.filter(p=>p.assignment.kind==='blitz').length
  const protection=attack.filter(p=>p.assignment.kind==='protection').length
  const fakePasser=offenseById(matchup.playId)?.fake&&offenseById(matchup.playId)?.kind==='pass'?attack.find(p=>p.assignment.kind==='passing'):undefined
  const fakePenalty=fakePasser?Math.round((fakePasser.ratings.passing-80)/12):0
  return Math.max(-6,Math.min(3,Math.round((block-resistance)/15+(run?0:(protection-pressure)*.5)+fakePenalty)))
}

function validateCoordinates(players:ActivePlayer[],label:string){
  const errors:string[]=[]
  for(const p of players){if(!Number.isFinite(p.field.yard)||!Number.isFinite(p.field.lateral)||p.field.yard< -10||p.field.yard>110||Math.abs(p.field.lateral)>26.65)errors.push(`${label} invalid coordinate ${p.formationRole}`)}
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
    const a=players[i].field,b=players[j].field
    if(Math.hypot(a.yard-b.yard,a.lateral-b.lateral)<.75)errors.push(`${label} overlapping ${players[i].formationRole}/${players[j].formationRole}`)
  }
  return errors
}
export function validateOffense(players:ActivePlayer[],group:Personnel):string[]{
  const errors:string[]=[]
  if(players.length!==11)errors.push(`offense has ${players.length} players`)
  if(new Set(players.map(p=>p.id)).size!==players.length)errors.push('duplicate offensive IDs')
  if(group.rb+group.te+group.wr!==5)errors.push('invalid personnel combination')
  const count=(position:Position)=>players.filter(p=>p.position===position).length
  if(count('QB')!==1||offensiveLine.some(pos=>count(pos)!==1))errors.push('missing QB or offensive line role')
  if(count('HB')+count('FB')!==group.rb||count('TE')!==group.te||count('WR')!==group.wr)errors.push('personnel counts do not match')
  if(players.filter(p=>p.onLine).length!==7||players.filter(p=>!p.onLine).length!==4)errors.push('formation must have seven on line and four behind')
  if(players.filter(p=>p.onLine&&p.eligible).length!==2)errors.push('formation needs two eligible line ends')
  if(new Set(players.map(p=>p.formationRole)).size!==players.length)errors.push('duplicate offensive formation roles')
  const linemen=offensiveLine.map(pos=>players.find(p=>p.position===pos))
  if(linemen.every(Boolean)&&linemen.some((p,i)=>i>0&&p!.field.lateral<=linemen[i-1]!.field.lateral))errors.push('offensive line order invalid')
  const lineYard=players.find(p=>p.position==='C')?.field.yard
  if(lineYard!==undefined&&(players.some(p=>p.onLine&&Math.abs(p.field.yard-lineYard)>.1)||players.some(p=>!p.onLine&&p.field.yard>lineYard-(p.position==='QB'?.75:1))))errors.push('line of scrimmage or backfield depth invalid')
  if(players.some(p=>offensiveLine.includes(p.position as OffensivePosition)&&(!p.onLine||p.eligible)))errors.push('interior line eligibility invalid')
  if(players.some(p=>p.eligible&&!eligibleNumber(p.jersey)))errors.push('ineligible jersey number')
  const lineEnds=players.filter(p=>p.onLine&&p.eligible)
  if(lineEnds.length===2&&!(lineEnds.some(p=>p.field.lateral< -2.8)&&lineEnds.some(p=>p.field.lateral>2.8)))errors.push('eligible ends must flank the offensive line')
  if(players.some(p=>!p.assignment?.kind))errors.push('offensive assignment missing')
  errors.push(...validateCoordinates(players,'offense'))
  return errors
}
export function validateDefense(players:ActivePlayer[],pack:DefensivePackage,front:DefensiveFront):string[]{
  const errors:string[]=[]
  if(players.length!==11||pack.line.length+pack.linebackers.length+pack.backs.length!==11)errors.push('defense must have 11 players')
  if(new Set(players.map(p=>p.id)).size!==players.length)errors.push('duplicate defensive IDs')
  const required=[...pack.line,...pack.linebackers,...pack.backs].sort()
  if(players.map(p=>p.position).sort().join('|')!==required.join('|'))errors.push('defensive personnel mismatch')
  if(players.filter(p=>p.technique).length!==front.lineCount)errors.push('line technique count mismatch')
  if(new Set(players.map(p=>p.formationRole)).size!==players.length)errors.push('duplicate defensive formation roles')
  if(players.some(p=>!p.assignment?.kind))errors.push('defensive assignment missing')
  errors.push(...validateCoordinates(players,'defense'))
  return errors
}
export function validateMatchup(m:Matchup):string[]{
  const errors=[...validateOffense(m.offense,m.personnel),...validateDefense(m.defense,defensivePackages.find(p=>p.id===m.look.packageId)!,m.front)]
  const all=[...m.offense,...m.defense]
  if(all.length!==22||new Set(all.map(p=>p.id)).size!==22)errors.push('matchup must have 22 unique players')
  for(const a of m.offense)for(const b of m.defense)if(Math.hypot(a.field.yard-b.field.yard,a.field.lateral-b.field.lateral)<.75)errors.push(`opposing players overlap at ${a.formationRole}/${b.formationRole}`)
  return errors
}
