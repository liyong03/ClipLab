import type { ComponentType } from 'react';

export interface FilterParamDef {
  key: string;
  label: string;
  type: 'range' | 'select' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  default: number;
  options?: { label: string; value: number }[];
}

export interface FilterControlProps {
  params: Record<string, number>;
  paramDefs: FilterParamDef[];
  onChange: (key: string, value: number) => void;
}

export interface FilterPlugin {
  id: string;
  name: string;
  category: string;
  params: FilterParamDef[];
  serverSide?: boolean;
  createNodes?(ctx: AudioContext, params: Record<string, number>): AudioNode[];
  controlComponent?: ComponentType<FilterControlProps>;
}

export interface FilterSetting {
  filterId: string;
  enabled: boolean;
  params: Record<string, number>;
}
