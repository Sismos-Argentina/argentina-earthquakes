"use client";

import { useId, type CSSProperties } from "react";

type Marker = {
  label: string;
  value: number;
};

type DualRangeFilterProps = {
  label: string;
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit?: string;
  markers?: Marker[];
  onChange: (minimum: number, maximum: number) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default function DualRangeFilter({
  label,
  min,
  max,
  minValue,
  maxValue,
  step,
  unit = "",
  markers = [],
  onChange,
}: DualRangeFilterProps) {
  const id = useId();
  const span = max - min || 1;
  const position = (value: number) => `${((value - min) / span) * 100}%`;
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 0 : 0;
  const format = (value: number) => `${value.toFixed(decimals)}${unit}`;
  const style = {
    "--range-start": position(minValue),
    "--range-end": position(maxValue),
  } as CSSProperties;

  return (
    <fieldset className="rangeFilter">
      <legend>{label}</legend>
      <div className="rangeValues" aria-hidden="true">
        <strong>{format(minValue)}</strong>
        <span>hasta</span>
        <strong>{format(maxValue)}</strong>
      </div>
      <div className="dualRange" style={style}>
        <span className="rangeTrack" />
        <span className="rangeSelection" />
        {markers
          .filter((marker) => marker.value >= min && marker.value <= max)
          .map((marker) => (
            <span
              key={marker.value}
              className="rangeMarker"
              style={{ left: position(marker.value) }}
              aria-hidden="true"
            >
              <i />
              <small>{marker.label}</small>
            </span>
          ))}
        <input
          id={`${id}-min`}
          className="rangeInput rangeInput--min"
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          aria-label={`${label}: mínimo`}
          aria-valuetext={format(minValue)}
          onChange={(event) => onChange(Math.min(Number(event.currentTarget.value), maxValue), maxValue)}
        />
        <input
          id={`${id}-max`}
          className="rangeInput rangeInput--max"
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          aria-label={`${label}: máximo`}
          aria-valuetext={format(maxValue)}
          onChange={(event) => onChange(minValue, Math.max(Number(event.currentTarget.value), minValue))}
        />
      </div>
      <div className="rangeNumbers" aria-label={`${label}: valores exactos`}>
        <label htmlFor={`${id}-number-min`}>
          Mín.
          <input
            id={`${id}-number-min`}
            type="number"
            min={min}
            max={maxValue}
            step={step}
            value={minValue}
            onChange={(event) => {
              if (!event.currentTarget.value) return;
              onChange(clamp(Number(event.currentTarget.value), min, maxValue), maxValue);
            }}
          />
        </label>
        <label htmlFor={`${id}-number-max`}>
          Máx.
          <input
            id={`${id}-number-max`}
            type="number"
            min={minValue}
            max={max}
            step={step}
            value={maxValue}
            onChange={(event) => {
              if (!event.currentTarget.value) return;
              onChange(minValue, clamp(Number(event.currentTarget.value), minValue, max));
            }}
          />
        </label>
      </div>
    </fieldset>
  );
}
