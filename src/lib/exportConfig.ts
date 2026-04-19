import type { SwordConfig } from '../store/configStore';

export async function exportConfig(config: SwordConfig): Promise<void> {
  const json = JSON.stringify(config, null, 2);
  await navigator.clipboard.writeText(json);
}
