type Rect={left:number;top:number;width:number;height:number};
export type CoachmarkPlacement={left:number;top:number;side:"top"|"bottom"|"left"|"right"|"none";tip:number};
export function placeCoachmark(target:Rect|null,size:{width:number;height:number},viewport:{width:number;height:number},avoid:Rect[]=[]):CoachmarkPlacement {
 const m=10,g=14,w=Math.min(size.width,viewport.width-m*2),h=Math.min(size.height,viewport.height-m*2);
 const x=(v:number)=>Math.max(m,Math.min(viewport.width-w-m,v)),y=(v:number)=>Math.max(m,Math.min(viewport.height-h-m,v));
 if(!target)return {left:x((viewport.width-w)/2),top:y(viewport.height-h-76),side:"none",tip:24};
 const cx=target.left+target.width/2,cy=target.top+target.height/2;
 const candidates:CoachmarkPlacement[]=[{left:cx-w/2,top:target.top+target.height+g,side:"top",tip:0},{left:cx-w/2,top:target.top-h-g,side:"bottom",tip:0},{left:target.left+target.width+g,top:cy-h/2,side:"left",tip:0},{left:target.left-w-g,top:cy-h/2,side:"right",tip:0}];
 for(const r of avoid){candidates.push({left:r.left-w-g,top:cy-h/2,side:"right",tip:0},{left:cx-w/2,top:r.top+r.height+g,side:"top",tip:0});}
 const overlap=(a:Rect,b:Rect)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
 return candidates.map((c,i)=>{const left=x(c.left),top=y(c.top),rect={left,top,width:w,height:h},horizontal=c.side==="top"||c.side==="bottom";return {placement:{left,top,side:c.side,tip:Math.max(18,Math.min((horizontal?w:h)-18,horizontal?cx-left:cy-top))},score:overlap(rect,target)*8+avoid.reduce((s,r)=>s+overlap(rect,r)*2,0)+(Math.abs(left-c.left)+Math.abs(top-c.top))*10+i};}).sort((a,b)=>a.score-b.score)[0].placement;
}
