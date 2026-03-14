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
    <div className="filter-chain">
      <h3>Filters</h3>
      {filterSettings.map((setting) => {
        const plugin = getFilter(setting.filterId);
        if (!plugin) return null;

        return (
          <div
            key={setting.filterId}
            className={`filter-item ${setting.enabled ? '' : 'disabled'}`}
          >
            <div className="filter-item-header">
              <input
                type="checkbox"
                className="filter-toggle"
                checked={setting.enabled}
                onChange={() => onToggle(setting.filterId)}
              />
              <span className="filter-name">{plugin.name}</span>
              {plugin.serverSide && <span className="filter-badge">Server</span>}
            </div>
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
