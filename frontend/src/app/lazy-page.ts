import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export function lazyPage<Props extends object>(
  load: () => Promise<ComponentType<Props>>,
): LazyExoticComponent<ComponentType<Props>> {
  return lazy(() => load().then((component) => ({ default: component })))
}
