import { teams, type Side, type TeamId } from './engine'

export type TeamVisual={id:Side;abbr:string;name:string;primary:string;secondary:string;helmet:string;helmetStripe:string;pants:string;skin:string;outline:string;endZone:string;endZoneStripe:string;uiDark:string}
const palettes:Record<TeamId,Omit<TeamVisual,'id'|'abbr'|'name'>>={
  red:{primary:'#c93639',secondary:'#ffe4bd',helmet:'#c93639',helmetStripe:'#ffe4bd',pants:'#f4e4bb',skin:'#b97952',outline:'#4f2528',endZone:'#a72b31',endZoneStripe:'#ed7975',uiDark:'#402c2e'},
  blue:{primary:'#2857d5',secondary:'#e9efff',helmet:'#2857d5',helmetStripe:'#e9efff',pants:'#d9e5ff',skin:'#aa7455',outline:'#182b65',endZone:'#1f44ad',endZoneStripe:'#7898f1',uiDark:'#183154'},
  green:{primary:'#25824e',secondary:'#e2f5c9',helmet:'#25824e',helmetStripe:'#e2f5c9',pants:'#d5e7bb',skin:'#9d6d4c',outline:'#18472e',endZone:'#1e673d',endZoneStripe:'#75bc83',uiDark:'#173e2c'},
  black:{primary:'#242831',secondary:'#f1d384',helmet:'#242831',helmetStripe:'#f1d384',pants:'#bfc4ca',skin:'#9c6547',outline:'#11161c',endZone:'#20242c',endZoneStripe:'#9a844f',uiDark:'#1a2029'}
}
export function visualsFor(homeId:TeamId,awayId:TeamId):Record<Side,TeamVisual>{
  return {home:{...palettes[homeId],id:'home',abbr:teams[homeId].short,name:teams[homeId].name.split(' ').at(-1)!.toUpperCase()},away:{...palettes[awayId],id:'away',abbr:teams[awayId].short,name:teams[awayId].name.split(' ').at(-1)!.toUpperCase()}}
}
export const teamVisuals=visualsFor('red','blue')
export type SpritePose='idle'|'set'|'run'|'sprint'|'block'|'pass'|'catch'|'tackle'|'fall'|'celebrate'
