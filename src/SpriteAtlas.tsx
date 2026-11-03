import { teamVisuals, type SpritePose, type TeamVisual } from './visuals'

const poses:SpritePose[]=['idle','set','run','sprint','block','pass','catch','tackle','fall','celebrate']
function PixelSprite({v,pose}:{v:TeamVisual;pose:SpritePose}){
  const armUp=pose==='catch'||pose==='celebrate'
  const running=pose==='run'||pose==='sprint'
  const blocking=pose==='block'||pose==='tackle'
  const passing=pose==='pass'
  const crouch=pose==='set'
  const fallen=pose==='fall'
  const helmet=v.helmet,trim=v.helmetStripe,jersey=v.primary,shoulder=v.secondary,pants=v.pants,outline=v.outline
  return <g shapeRendering="crispEdges">
    <rect x="2" y="18" width="11" height="2" fill="#0b2119" opacity=".42"/>
    {fallen?<g transform="translate(2 7) rotate(90 6 6)"><Body v={v} pose="idle"/></g>:<g transform={crouch?'translate(0 2)':'translate(0 0)'}>
      <rect x="4" y="1" width="8" height="6" fill={outline}/><rect x="5" y="0" width="6" height="1" fill={outline}/>
      <rect x="5" y="1" width="6" height="5" fill={helmet}/><rect x="6" y="0" width="4" height="2" fill={helmet}/>
      <rect x="8" y="1" width="1" height="5" fill={trim}/><rect x="11" y="4" width="3" height="1" fill={trim}/><rect x="12" y="5" width="2" height="1" fill={outline}/>
      <rect x="5" y="6" width="5" height="2" fill={v.skin}/>
      <Body v={v} pose={pose}/>
      {armUp?<><rect x="1" y="4" width="2" height="6" fill={jersey}/><rect x="2" y="2" width="2" height="3" fill={v.skin}/><rect x="12" y="3" width="2" height="7" fill={jersey}/><rect x="12" y="1" width="2" height="3" fill={v.skin}/></>:blocking?<><rect x="1" y="8" width="4" height="2" fill={shoulder}/><rect x="0" y="9" width="3" height="2" fill={v.skin}/><rect x="11" y="8" width="4" height="2" fill={jersey}/><rect x="14" y="8" width="2" height="2" fill={v.skin}/></>:passing?<><rect x="2" y="8" width="2" height="5" fill={jersey}/><rect x="0" y="7" width="3" height="2" fill={v.skin}/><rect x="12" y="8" width="3" height="2" fill={jersey}/><rect x="14" y="6" width="2" height="3" fill={v.skin}/><rect x="16" y="5" width="2" height="2" fill="#6a3727"/></>:<><rect x="2" y="9" width="2" height={running?3:5} fill={jersey}/><rect x="2" y={running?11:13} width="2" height="2" fill={v.skin}/><rect x="12" y={running?8:9} width="2" height="4" fill={jersey}/><rect x="12" y={running?7:12} width="2" height="2" fill={v.skin}/></>}
      {running?<><rect x="5" y="15" width="3" height="2" fill={pants}/><rect x={pose==='sprint'?2:3} y="17" width="4" height="2" fill={outline}/><rect x="9" y="15" width="3" height="2" fill={pants}/><rect x="11" y="17" width="4" height="2" fill={outline}/></>:<><rect x="5" y="15" width="3" height="3" fill={pants}/><rect x="4" y="18" width="4" height="1" fill={outline}/><rect x="9" y="15" width="3" height="3" fill={pants}/><rect x="9" y="18" width="4" height="1" fill={outline}/></>}
    </g>}
  </g>
}
function Body({v,pose}:{v:TeamVisual;pose:SpritePose}){return <g><rect x="3" y="8" width="11" height="4" fill={v.secondary}/><rect x="4" y="8" width="9" height="7" fill={v.primary}/><rect x="4" y="8" width="2" height="3" fill={v.secondary}/><rect x="11" y="8" width="2" height="3" fill={v.secondary}/><rect x="7" y="10" width="3" height="3" fill={v.secondary}/><rect x="5" y="14" width="7" height="2" fill={v.pants}/>{pose==='tackle'&&<rect x="12" y="11" width="3" height="2" fill={v.secondary}/>}</g>}
export default function SpriteAtlas(){return <defs>{Object.values(teamVisuals).flatMap(v=>poses.map(pose=><symbol id={`player-${v.id}-${pose}`} key={`${v.id}-${pose}`} viewBox="0 0 18 20" overflow="visible"><PixelSprite v={v} pose={pose}/></symbol>))}</defs>}
