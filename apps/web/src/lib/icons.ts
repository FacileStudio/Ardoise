import { icons, registerIcons } from '@facile/muse';
import mdi from './icons/mdi.json';
import solar from './icons/solar.json';

type IconSet = {
  prefix: string;
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
};

function flatten(set: IconSet) {
  return Object.fromEntries(
    Object.entries(set.icons).map(([name, icon]) => [
      `${set.prefix}:${name}`,
      {
        body: icon.body,
        width: icon.width ?? set.width ?? 24,
        height: icon.height ?? set.height ?? 24,
      },
    ])
  );
}

registerIcons({ ...flatten(solar), ...flatten(mdi) });

export const ardoise = {
  brand: 'solar:bill-list-bold-duotone',
  mission: 'solar:case-round-linear',
  document: 'solar:document-linear',
  signature: 'solar:pen-new-round-linear',
  client: 'solar:users-group-two-rounded-linear',
  provider: 'solar:buildings-linear',
  company: 'solar:buildings-2-linear',
  invoice: 'solar:bill-list-linear',
  quote: 'solar:document-text-linear',
  payment: 'solar:wallet-linear',
  offer: 'solar:tag-price-linear',
  catalog: 'solar:layers-linear',
  revenue: 'solar:graph-up-linear',
  send: 'solar:plain-linear',
  pdf: 'solar:file-download-linear',
  transfer: 'solar:transfer-horizontal-linear',
  more: 'solar:menu-dots-linear',
  tick: 'mdi:check',
  numbering: 'solar:hashtag-linear',
  plume: 'solar:pen-new-square-bold-duotone',
  nuage: 'solar:cloud-bold-duotone',
  glouton: 'solar:magnet-wave-bold-duotone',
} as const;

export { icons };
