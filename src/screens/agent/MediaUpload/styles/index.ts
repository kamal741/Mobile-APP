// Re-export all style objects under a single convenient import
export { layoutStyles } from './layout.styles';
export { gridStyles } from './grid.styles';
export { componentStyles } from './component.styles';

// Flattened convenience alias (spread everything together)
// Components that need a single `styles` object can import this
import { layoutStyles } from './layout.styles';
import { gridStyles } from './grid.styles';
import { componentStyles } from './component.styles';

export const styles = {
  ...layoutStyles,
  ...gridStyles,
  ...componentStyles,
};
