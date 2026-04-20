/* tslint:disable: no-unused-variable */
/* tslint:disable: comment-format */

import p5 from "p5";

import { Widget, Rect } from './Widget';
import { DockingPoint } from "./DockingPoint";
import { Inequality } from "./Inequality";
import { Num } from "./Num";

/**
 * A class for graph lines. These are the lines that can be used to connect things in a graph
 */
export
    class GraphLine extends Widget {

    protected pythonSymbol: string = ''; // WARNING: This should be initialized in the constructor
    //protected latexSymbol: string;
    protected mhchemSymbol: string = ''; // WARNING: This should be initialized in the constructor
    protected mathmlSymbol: string = ''; // WARNING: This should be initialized in the constructor
    
    private type: string;

    /**
     * There's a thing with the baseline and all that... this sort-of fixes it.
     *
     * @returns {p5.Vector} The position to which a Symbol is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality, type: string) {
        super(p, s);

        this.type = type;
        this.docksTo = ["startline"];
    }

    get typeAsString(): string {
        return 'GraphLine';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Relation has one docking point:
     *
     - _right_: Symbol
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        this.dockingPoints["endline"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["node"], "endline");
    }

    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            expression = " → ";
            if (this.dockingPoints["endline"].child != null) {
                const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
                const b = directions.some(dir => this.dockingPoints["endline"].child?.dockingPoints[dir].child)
                expression += (this.dockingPoints["endline"].child as Num).getFullText("python") + ", " + (b ? this.dockingPoints["endline"].child.formatExpressionAs(format) : "");
            }
        } else if (format == "python") {
            const endChild = this.dockingPoints["endline"].child;

            if (!endChild) {
                return "";
            }

            const nested = endChild.formatExpressionAs(format);

            return nested !== undefined ? nested : (endChild as Num).getFullText("python");
        }
        return expression;
    }

    properties(): Object {
        return { 
            type: this.type,
        };
    }

    token(): string {
        return '→';
    }

    _draw(): void {
        this.p.noFill().strokeCap(this.p.SQUARE).strokeWeight(4 * this.scale).stroke(this.color);

        let box = this.boundingBox();
        
        const angle = Math.PI * 2 / 8;
        const radius = box.h * 2.5;
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const arrowSize = 10;
        
        directions.forEach((dir, index) => {
            const x = radius * Math.cos(angle * index - Math.PI / 2);
            const y = radius * Math.sin(angle * index - Math.PI / 2);

            if (this.dockedTo === dir || (!this.dockedTo && dir === "E")) {
                this.p.line(0, 0, x, y);
                
                const baseAngle = angle * index - Math.PI / 2;
                const x1 = x - arrowSize * Math.cos(baseAngle - Math.PI / 6);
                const y1 = y - arrowSize * Math.sin(baseAngle - Math.PI / 6);
                const x2 = x - arrowSize * Math.cos(baseAngle + Math.PI / 6);
                const y2 = y - arrowSize * Math.sin(baseAngle + Math.PI / 6);
                
                this.p.fill(this.color);
                this.p.triangle(x, y, x1, y1, x2, y2);
                if (this.type === '↔') {
                    const oppositeX1 = -x - arrowSize * Math.cos(baseAngle + Math.PI / 6);
                    const oppositeY1 = -y - arrowSize * Math.sin(baseAngle + Math.PI / 6);
                    const oppositeX2 = -x - arrowSize * Math.cos(baseAngle - Math.PI / 6);
                    const oppositeY2 = -y - arrowSize * Math.sin(baseAngle - Math.PI / 6);
                    this.p.triangle(-x, -y, oppositeX1, oppositeY1, oppositeX2, oppositeY2);
                }
            }
            
        });
        

        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        const s = "=";
        // The following cast is OK because x, y, w, and h are present in the returned object...
        const box = this.s.font_up.textBounds(s, 0, 0, this.scale*this.s.baseFontSize*0.8) as Rect;
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

    _shakeIt(): void {
        this._shakeItDown();
        const thisBox = this.boundingBox();

        if (this.dockingPoints["endline"]) {
            const angle = Math.PI * 2 / 8;
            const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

            const dp = this.dockingPoints["endline"];
            if (dp.child) {
                let child = dp.child;

                if (directions.includes(this.dockedTo)) {
                    const radius = thisBox.h * 5;
                    directions.forEach((dir, index) => {
                        const x = radius * Math.cos(angle * index - Math.PI / 2);
                        const y = -thisBox.y + radius * Math.sin(angle * index - Math.PI / 2);

                        if (this.dockedTo === dir) {
                            child.position.x = x;
                            child.position.y = y;
                        }
                        
                    });
                } else {
                    child.position.x = thisBox.x + thisBox.w + child.leftBound + dp.size/2;
                    child.position.y = this.dockingPoint.y - child.dockingPoint.y;
                }
            } else {
                if (directions.includes(this.dockedTo)) {
                    const radius = thisBox.h * 5;
                    directions.forEach((dir, index) => {
                        const x = radius * Math.cos(angle * index - Math.PI / 2);
                        const y = radius * Math.sin(angle * index - Math.PI / 2);

                        if (this.dockedTo === dir) {
                            dp.position.x = x;
                            dp.position.y = y;
                        }
                        
                    });
                } else {
                    dp.position.x = thisBox.x + thisBox.w + dp.size;
                    dp.position.y = -this.scale*this.s.xBox.h/2;
                }
            }     
        }

    }
}
