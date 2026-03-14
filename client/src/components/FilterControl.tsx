import type { FilterParamDef } from '../filters/types';

interface FilterControlProps {
  paramDefs: FilterParamDef[];
  params: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

export function FilterControl({ paramDefs, params, onChange }: FilterControlProps) {
  return (
    <div>
      {paramDefs.map((def) => (
        <div key={def.key} style={{ marginBottom: 4 }}>
          <label>
            {def.label}: {params[def.key]?.toFixed(def.step && def.step < 1 ? 2 : 0)}
          </label>
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
          {def.type === 'select' && def.options && (
            <select
              value={params[def.key] ?? def.default}
              onChange={(e) => onChange(def.key, parseFloat(e.target.value))}
            >
              {def.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
