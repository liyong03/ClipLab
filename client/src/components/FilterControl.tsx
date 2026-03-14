import type { FilterParamDef } from '../filters/types';

interface FilterControlProps {
  paramDefs: FilterParamDef[];
  params: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

export function FilterControl({ paramDefs, params, onChange }: FilterControlProps) {
  return (
    <div className="filter-params">
      {paramDefs.map((def) => (
        <div key={def.key} className="filter-param">
          <span className="filter-param-label">{def.label}</span>
          {def.type === 'range' && (
            <input
              type="range"
              min={def.min}
              max={def.max}
              step={def.step}
              value={params[def.key] ?? def.default}
              onChange={(e) => onChange(def.key, parseFloat(e.target.value))}
            />
          )}
          <span className="filter-param-value">
            {(params[def.key] ?? def.default).toFixed(def.step && def.step < 1 ? 2 : 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
