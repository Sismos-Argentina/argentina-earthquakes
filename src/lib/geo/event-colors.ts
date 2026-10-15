export type EventColorMode = "depth" | "magnitude";
export const DEPTH_STOPS = [[0,"#f5a957"],[30,"#f8bc72"],[70,"#f3dc9b"],[150,"#88d5d4"],[300,"#52b0cf"],[600,"#927bd6"],[750,"#b894ed"]] as const;
export const MAGNITUDE_STOPS = [[1,"#efe4bc"],[3,"#e8bf7a"],[5,"#e48758"],[7,"#c44b67"],[9,"#852f70"]] as const;
const rgb = (hex: string) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);

/** Display colors in sRGB; Three.js callers convert them to linear vertex colors. */
export function eventColor(value: number, mode: EventColorMode = "depth"): [number,number,number] {
  const stops = mode === "depth" ? DEPTH_STOPS : MAGNITUDE_STOPS;
  const bounded = Math.max(stops[0][0],Math.min(stops[stops.length-1][0],value));
  let index=1;
  while(index<stops.length-1 && bounded>stops[index][0]) index++;
  const [a,ca]=stops[index-1], [b,cb]=stops[index];
  const t=(bounded-a)/(b-a), start=rgb(ca), end=rgb(cb);
  return start.map((v,i)=>v+(end[i]-v)*t) as [number,number,number];
}
export function eventColorCss(value: number, mode: EventColorMode = "depth") {
  return `rgb(${eventColor(value,mode).map(v=>Math.round(v*255)).join(",")})`;
}
export function eventGradient(mode: EventColorMode = "depth") {
  const stops=mode==="depth"?DEPTH_STOPS:MAGNITUDE_STOPS;
  const min=stops[0][0], max=stops[stops.length-1][0];
  return `linear-gradient(to right, ${stops.map(([v,c])=>`${c} ${(v-min)/(max-min)*100}%`).join(", ")})`;
}
