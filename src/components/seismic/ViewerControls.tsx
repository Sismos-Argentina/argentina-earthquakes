"use client";
import MapControls from "./MapControls";
import type {ViewerControlProps} from "./controls-types";
export type {ControlPanel} from "./controls-types";
export default function ViewerControls(props: ViewerControlProps) { return <MapControls {...props}/>; }
