import type { Side } from './engine'

export type TeamVisual={id:Side;abbr:string;name:string;primary:string;secondary:string;helmet:string;helmetStripe:string;pants:string;skin:string;outline:string;endZone:string;endZoneStripe:string;uiDark:string}
export const teamVisuals:Record<Side,TeamVisual>={
  home:{id:'home',abbr:'ICF',name:'FOUNDRY',primary:'#ec7042',secondary:'#ffe8a7',helmet:'#f28b4e',helmetStripe:'#ffe6a2',pants:'#f4e4bb',skin:'#b97952',outline:'#492c2b',endZone:'#b64f35',endZoneStripe:'#ee9a62',uiDark:'#402c2e'},
  away:{id:'away',abbr:'BAY',name:'BREAKERS',primary:'#3bb1ca',secondary:'#effcff',helmet:'#e8f8ef',helmetStripe:'#2e9db8',pants:'#2c789c',skin:'#aa7455',outline:'#163e54',endZone:'#216f8c',endZoneStripe:'#6ad0d3',uiDark:'#18394f'}
}
export type SpritePose='idle'|'set'|'run'|'sprint'|'block'|'pass'|'catch'|'tackle'|'fall'|'celebrate'
