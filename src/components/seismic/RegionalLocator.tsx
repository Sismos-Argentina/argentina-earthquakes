import type { CartographyArtifact } from "@/lib/data/cartography";
import type { RegionBounds } from "@/lib/geo/region";

export default function RegionalLocator({ bounds, cartography, onOpen }: { bounds: RegionBounds; cartography: CartographyArtifact; onOpen: () => void }) {
  const provinces=cartography.layers.ignProvinces.map(feature=>{
    const points=feature.lines.flat();
    return {name:feature.name,west:Math.min(...points.map(p=>p[0])),east:Math.max(...points.map(p=>p[0])),south:Math.min(...points.map(p=>p[1])),north:Math.max(...points.map(p=>p[1]))};
  }).filter(p=>p.west<=bounds[2]&&p.east>=bounds[0]&&p.south<=bounds[3]&&p.north>=bounds[1]);
  const west=provinces.length?Math.min(bounds[0]-.8,...provinces.map(p=>p.west-.5)):Math.min(-82,bounds[0]-2),east=provinces.length?Math.max(bounds[2]+.8,...provinces.map(p=>p.east+.5)):Math.max(-50,bounds[2]+2);
  const south=provinces.length?Math.min(bounds[1]-.8,...provinces.map(p=>p.south-.5)):Math.min(-60,bounds[1]-2),north=provinces.length?Math.max(bounds[3]+.8,...provinces.map(p=>p.north+.5)):Math.max(-18,bounds[3]+2);
  const cosine=Math.cos((north+south)/2*Math.PI/180),scale=Math.min(180/((east-west)*cosine),130/(north-south));
  const offsetX=(180-(east-west)*cosine*scale)/2,offsetY=(130-(north-south)*scale)/2;
  const xy=(lon:number,lat:number)=>[offsetX+(lon-west)*cosine*scale,offsetY+(north-lat)*scale];
  const labels:{name:string;x:number;y:number;width:number}[]=[];
  const ranked=[...provinces].sort((a,b)=>{
    const overlap=(p:typeof a)=>Math.max(0,Math.min(p.east,bounds[2])-Math.max(p.west,bounds[0]))*Math.max(0,Math.min(p.north,bounds[3])-Math.max(p.south,bounds[1]));
    return overlap(b)-overlap(a);
  });
  for(const p of ranked){
    const name=p.name.replace(/^Provincia de(?:l)?\s+/i,""),[x,y]=xy((p.west+p.east)/2,(p.south+p.north)/2),width=name.length*5.8;
    if(x-width/2<2||x+width/2>178||labels.some(b=>Math.abs(x-b.x)<(width+b.width)/2+3&&Math.abs(y-b.y)<14))continue;
    labels.push({name,x,y,width});if(labels.length===4)break;
  }
  const path=(layers:CartographyArtifact["layers"]["ignProvinces"])=>layers.flatMap(f=>f.lines).map(line=>line.map((p,i)=>`${i?"L":"M"}${xy(...p).join(",")}`).join(" ")).join(" ");
  const [x,y]=xy(bounds[0],bounds[3]), [xe,ys]=xy(bounds[2],bounds[1]);
  return <button className="regionalLocator" onClick={onOpen} title="Ver ubicación de esta zona en el mapa 2D">
    <span>Ubicación · norte ↑</span><svg viewBox="0 0 180 130" role="img" aria-label="Rectángulo de la zona elegida sobre Argentina y su contexto">
      <path d={path(cartography.layers.naturalEarthCountries)} fill="none" stroke="#60848e" strokeWidth=".6"/>
      <path d={path(cartography.layers.ignProvinces)} fill="none" stroke="#b8d1df" strokeWidth=".85"/>
      <rect x={x} y={y} width={xe-x} height={ys-y} fill="#ffffff22" stroke="#ffffff" strokeWidth="1.8"/>
      {labels.map(p=><text key={p.name} x={p.x} y={p.y} fill="#f4f8fa" stroke="#0a1a22" strokeWidth="1.5" paintOrder="stroke" fontSize="11" textAnchor="middle">{p.name}</text>)}
    </svg><span>Abrir mapa 2D</span>
  </button>;
}
