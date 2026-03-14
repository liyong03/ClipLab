import type { FilterSetting } from '../filters/types';
import { getFilter } from '../filters/registry';
import { FilterControl } from './FilterControl';

interface FilterChainProps {
  filterSettings: FilterSetting[];
  onToggle: (filterId: string) => void;
  onParamChange: (filterId: string, key: string, value: number) => void;
}

export function FilterChain({ filterSettings, onToggle, onParamChange }: FilterChainProps) {
  return (
    <div>
      <h3>Filters</h3>
      {filterSettings.map((setting) => {
        const plugin = getFilter(setting.filterId);
        if (!plugin) return null;

        return (
          <div
            key={setting.filterId}
            style={{
              border: '1px solid #ccc',
              padding: 8,
              marginBottom: 8,
              opacity: setting.enabled ? 1 : 0.5,
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={setting.enabled}
                onChange={() => onToggle(setting.filterId)}
              />
              {plugin.name}
              {plugin.serverSide && ' (Server)'}
            </label>
            {setting.enabled && (
              <FilterControl
                paramDefs={plugin.params}
                params={setting.params}
                onChange={(key, value) => onParamChange(setting.filterId, key, value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
