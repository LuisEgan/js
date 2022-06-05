import { cellSize } from ".";

export type TGroup<T> = { [id: number]: T };

export class Rectangle<Group = {}> {
  x = 0;
  y = 0;
  width = cellSize;
  height = cellSize;
  groupIndex? = -1;
}
