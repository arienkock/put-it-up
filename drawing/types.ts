export interface BoardRenderer {
    init: (dependencies: DrawingContext) => void
    update: (boardDefinition: BoardDefinition) => void
}

export interface DrawingContext {
}

export interface BoardDefinition {
    contents: BoardItem[];
}

type BoardItem = Note | Path;
interface Note extends Box, Draggable, Selectable {
    text: string;
    color: string;
}
type Box = Coordinates & Dimensions;
interface Draggable {
    isBeingDragged: boolean;
}
interface Selectable {
    isSelected: boolean
}
interface Coordinates {
    top: number;
    left: number;
}
interface Dimensions {
    height: number;
    width: number;
}
interface Path extends Selectable {
    points: AnchorPoints[];
    strokeStyle: string;
    startMarkerStyle: string;
    endMarkerStyle: string;
}
interface AnchorPoints extends Draggable, Coordinates {
}
