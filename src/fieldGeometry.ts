export const YARDS_TO_PIXELS=1000/120
export const FIELD_LENGTH=120
export const FIELD_WIDTH=420
export const yardX=(yard:number)=> (yard+10)*YARDS_TO_PIXELS
export const lateralY=(lateral:number)=>210+lateral*7.2
export const turfBands=Array.from({length:20},(_,i)=>({yard:i*5,x:yardX(i*5),width:5*YARDS_TO_PIXELS}))
export const yardLines=Array.from({length:21},(_,i)=>({yard:i*5,x:yardX(i*5)}))
