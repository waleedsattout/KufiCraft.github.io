// interfaces and types for kufi.ts

/**
 * Represents a point on the board.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a shape item (square, circle, etc.).
 */
export interface ShapeItem {
  type: 'shape';
  point: Point;
  fill: string;
  shape: string;
}

/**
 * Represents an arch item between two points.
 */
export interface ArchItem {
  type: 'arch';
  start: Point;
  end: Point;
  dir: number;
  stroke: string;
}

/**
 * Represents a line item (polyline or closed shape).
 */
export interface LineItem {
  type: 'line';
  points: Point[];
  stroke: string;
}

/**
 * Union type for all drawable items.
 */
export type BoardItem = ShapeItem | ArchItem | LineItem;

/**
 * Scrolling state for the hand tool.
 */
export interface ScrollingState {
  is: boolean;
  startX: number;
  scrollLeft: number;
  startY: number;
  scrollTop: number;
}

/**
 * Board settings and state.
 */
export interface BoardSettings {
  isPainting: boolean;
  currentTool: string;
  currentColor: string;
  lastSavedBoard: string;
  scrolling: ScrollingState;
  toBeRemovedElements: Element[];
  dummy: Partial<ShapeItem & ArchItem & LineItem> & { [key: string]: any } | any;
  archDir: number;
  drawingShape: string;
  linePoints: Point[];
  name?: string;
  isMonospaced?: boolean;
  size?: number;
  tool: string;
  color: string;
  snap: () => void;
  zoom: (dir?: number) => void;
  notify: (type?: string | false, text?: string) => true | undefined;
  empty: () => true;
}

/**
 * Drawing tools methods for manipulating and rendering board items.
 */
export interface DrawingTools {
  /**
   * Snap a point to the grid.
   * @param x - The x coordinate.
   * @param y - The y coordinate.
   * @returns The snapped point.
   */
  point: (x: number, y: number) => Point;
  /**
   * Save the current board state to localStorage.
   * @returns true if successful.
   */
  save: () => true;
  /**
   * Undo the last drawing action.
   */
  undo: () => void;
  /**
   * Backup the current SVG innerHTML.
   * @returns true if successful.
   */
  backup: () => true;
  /**
   * Export the board as SVG, PNG, or PDF.
   * @param type - Export type ('svg', 'png', 'pdf').
   * @returns Promise that resolves to true if successful.
   */
  export: (type: string) => Promise<true>;
  /**
   * Draw items on the workspace.
   * @param items - Item(s) to draw.
   * @param dummy - If true, draw as dummy/preview.
   * @returns The created SVGPathElement(s).
   */
  draw: (items: BoardItem | BoardItem[], dummy?: boolean) => SVGPathElement | SVGPathElement[];
  /**
   * Create a shape item.
   * @param point - Point object.
   * @param isRect - If true, force square.
   * @returns The created ShapeItem.
   */
  shape: (point: Point, isRect?: boolean) => ShapeItem;
  /**
   * Get SVG path for a shape item.
   * @param item - The shape item.
   * @returns The SVG path string.
   */
  getPathForShape: (item: ShapeItem) => string;
  /**
   * Create an arch item between two points.
   * @param point1 - Start point.
   * @param point2 - End point.
   * @returns The created ArchItem.
   */
  arch: (point1: Point, point2: Point) => ArchItem;
  /**
   * Calculate the radius for an arch.
   * @param points - Array of two points.
   * @returns The radius.
   */
  radius: (points: [Point, Point]) => number;
  /**
   * Create a line or shape from points.
   * @param points - Array of points.
   * @returns The created LineItem, ShapeItem, or array of ShapeItems.
   */
  line: (points: Point[]) => LineItem | ShapeItem | ShapeItem[];
  /**
   * Push items to the board and draw them.
   * @param items - Item(s) to push.
   * @returns The pushed item(s).
   */
  push: (items: BoardItem | BoardItem[]) => BoardItem | BoardItem[];
  /**
   * Get rectangle info from a point.
   * @param point - The point.
   * @returns Rectangle info (x, y, width, height).
   */
  rectFromPoint: (point: Point) => { x: number; y: number; width: number; height: number };
  /**
   * Check if a point is a main rectangle.
   * @param point - The point.
   * @returns True if main rectangle.
   */
  isMainRect: (point: Point) => boolean;
  /**
   * Check if two points are the same.
   * @param point1 - First point.
   * @param point2 - Second point.
   * @returns True if points are the same.
   */
  isSamePoint: (point1: Point, point2: Point) => boolean;
  /**
   * Change the color of an SVG element.
   * @param el - The SVG element.
   * @returns true if successful.
   */
  changeColor: (el: SVGElement) => true;
  /**
   * Remove hidden elements (for eraser tool).
   * @returns true if successful.
   */
  removeHidden: () => true;
  /**
   * Hide an SVG element (for eraser tool).
   * @param el - The SVG element.
   * @returns true if successful.
   */
  hide: (el: SVGElement) => true;
  /**
   * Reset dummy/preview elements and tool state.
   * @param empty - If true, also reset lines.
   * @returns true if successful.
   */
  resets: (empty?: boolean) => true;
}

/**
 * Main board object.
 */
export interface Board {
  svg: SVGElement;
  workspace: SVGGElement;
  data: BoardItem[];
  settings: BoardSettings;
  drawingTools: DrawingTools;
  init: (name: string, isMonospaced: boolean, restoreFromLocalStorage?: boolean) => void;
} 