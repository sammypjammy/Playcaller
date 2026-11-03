import assert from 'node:assert/strict'
import test from 'node:test'
import { durationFor, flowReducer, initialFlow, isSnapReady, type FlowEvent } from './flow'

test('normal snap follows one legal huddle-to-huddle sequence',()=>{
  let state=initialFlow
  const events:FlowEvent[]=['SELECT','BREAK','LINE_UP','READY','SNAP','END_RUN','SHOW_RESULT','RETURN','HUDDLE']
  const phases=['PLAY_SELECTED','BREAKING_HUDDLE','LINING_UP','READY_FOR_SNAP','PLAY_RUNNING','PLAY_ENDING','SHOWING_RESULT','RETURNING_TO_HUDDLE','HUDDLE']
  events.forEach((event,i)=>{state=flowReducer(state,event);assert.equal(state.phase,phases[i])})
})

test('snap is legal only after alignment and cannot repeat during a play',()=>{
  let state=flowReducer(initialFlow,'SNAP')
  assert.equal(state,initialFlow)
  for(const event of ['SELECT','BREAK','LINE_UP','READY'] as FlowEvent[])state=flowReducer(state,event)
  assert.ok(isSnapReady(state.phase))
  state=flowReducer(state,'SNAP')
  const revision=state.revision
  state=flowReducer(state,'SNAP')
  assert.equal(state.revision,revision)
  assert.equal(state.phase,'PLAY_RUNNING')
})

test('special change resets to a new huddle and quick pacing stays bounded',()=>{
  let state=initialFlow
  for(const event of ['SELECT','BREAK','LINE_UP','READY','SNAP','END_RUN','SHOW_RESULT','SPECIAL_RESET'] as FlowEvent[])state=flowReducer(state,event)
  assert.equal(state.phase,'HUDDLE')
  assert.ok(durationFor('PLAY_ENDING',true)<durationFor('PLAY_ENDING',false))
  assert.ok(durationFor('SHOWING_RESULT',false)>=1500)
})
