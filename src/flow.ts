import type { Result } from './engine'
export type FlowPhase='HUDDLE'|'PLAY_SELECTED'|'BREAKING_HUDDLE'|'LINING_UP'|'READY_FOR_SNAP'|'PLAY_RUNNING'|'PLAY_ENDING'|'SHOWING_RESULT'|'RETURNING_TO_HUDDLE'
export type FlowState={phase:FlowPhase;revision:number}
export type FlowEvent='SELECT'|'BREAK'|'LINE_UP'|'READY'|'SNAP'|'CONVERSION_SNAP'|'END_RUN'|'SHOW_RESULT'|'RETURN'|'HUDDLE'|'SPECIAL_RESET'|'RESET'
export const initialFlow:FlowState={phase:'HUDDLE',revision:0}
const next:Partial<Record<FlowPhase,Partial<Record<FlowEvent,FlowPhase>>>>={
  HUDDLE:{SELECT:'PLAY_SELECTED',CONVERSION_SNAP:'PLAY_RUNNING'},
  PLAY_SELECTED:{SELECT:'PLAY_SELECTED',BREAK:'BREAKING_HUDDLE'},
  BREAKING_HUDDLE:{LINE_UP:'LINING_UP'},
  LINING_UP:{READY:'READY_FOR_SNAP'},
  READY_FOR_SNAP:{SELECT:'PLAY_SELECTED',SNAP:'PLAY_RUNNING'},
  PLAY_RUNNING:{END_RUN:'PLAY_ENDING'},
  PLAY_ENDING:{SHOW_RESULT:'SHOWING_RESULT'},
  SHOWING_RESULT:{RETURN:'RETURNING_TO_HUDDLE',SPECIAL_RESET:'HUDDLE'},
  RETURNING_TO_HUDDLE:{HUDDLE:'HUDDLE'}
}
export function flowReducer(state:FlowState,event:FlowEvent):FlowState{
  if(event==='RESET')return {phase:'HUDDLE',revision:state.revision+1}
  const phase=next[state.phase]?.[event]
  return phase?{phase,revision:state.revision+1}:state
}
export const flowDurations={break:650,lineUp:750,run:1500,ending:700,result:1700,return:1000}
export function durationFor(phase:FlowPhase,quick:boolean,result?:Result){
  const distance=Math.abs(result?.yards??0)
  const runDuration=result?.conversionReturn?3800:result?.event==='incomplete'?1700:Math.max(1350,Math.min(3100,1350+distance*55+(result?.event==='completion'?300:0)))
  const base=phase==='BREAKING_HUDDLE'?flowDurations.break:phase==='LINING_UP'?flowDurations.lineUp:phase==='PLAY_RUNNING'?result?runDuration:flowDurations.run:phase==='PLAY_ENDING'?flowDurations.ending:phase==='SHOWING_RESULT'?flowDurations.result:phase==='RETURNING_TO_HUDDLE'?flowDurations.return:0
  return Math.round(base*(quick?.45:1))
}
export function isSelectionPhase(phase:FlowPhase){return phase==='HUDDLE'||phase==='READY_FOR_SNAP'}
export function isSnapReady(phase:FlowPhase){return phase==='READY_FOR_SNAP'}
export function isPlaying(phase:FlowPhase){return phase==='PLAY_RUNNING'||phase==='PLAY_ENDING'||phase==='SHOWING_RESULT'}

