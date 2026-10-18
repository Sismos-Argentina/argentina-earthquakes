/* eslint-disable @next/next/no-html-link-for-pages -- Native document navigation is required by the static export. */
export default function DocumentHeader({active}:{active:"memoria"|"metodologia"}){
 return <header className="documentHeader"><a className="documentBrand" href="/" aria-label="Bajo nuestros pies · ir al inicio"><span className="studioEyebrow">Sismos de Argentina</span>Bajo nuestros pies</a><nav aria-label="Navegación del proyecto"><a href="/">Explorar mapa</a><a href="/memoria/" aria-current={active==="memoria"?"page":undefined}>Memoria histórica</a><a href="/metodologia/" aria-current={active==="metodologia"?"page":undefined}>Metodología</a></nav></header>;
}
