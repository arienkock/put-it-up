import { BoardDefinition, BoardRenderer, DrawingContext } from "./types";
import React from "react";

export class DefaultBoardRenderer implements BoardRenderer {
    public BoardComponent?: any

    init(dependencies: DrawingContext) {
        this.BoardComponent = function BoardComponent() {
            return <div>Test</div>
        }
    }

    destroy() {
      
    }
    
    update(boardDefinition: BoardDefinition) {

    }
}


