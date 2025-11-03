import { StickyPlugin } from './plugins/sticky-plugin.js';
import { ImagePlugin } from './plugins/image-plugin.js';

const registry = new Map();

// Register built-in plugins statically
registry.set('sticky', new StickyPlugin());
registry.set('image', new ImagePlugin());

export function getPlugin(type) {
  return registry.get(type);
}

export function getAllPlugins() {
  return Array.from(registry.values());
}

export function registerPlugin(type, pluginInstance) {
  registry.set(type, pluginInstance);
}


