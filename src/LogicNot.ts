/*
Copyright 2019 Andrea Franceschini <andrea.franceschini@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import p5 from "p5";

import { Widget, Rect } from './Widget'
import { BinaryOperation } from "./BinaryOperation";
import { LogicBinaryOperation } from "./LogicBinaryOperation";
import { Relation } from "./Relation";
import { DockingPoint } from "./DockingPoint";
import { Inequality } from "./Inequality";

/** LogicNot. */
export
    class LogicNot extends Widget {

    private latexSymbol: Object;
    private pythonSymbol: Object;
    // private mathmlSymbol: Object = ''; // WARNING: This should be initialized in the constructor

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, 0);
    }

    constructor(p: p5, s: Inequality) {
        super(p, s);

        this.latexSymbol = '\\lnot';
        if (this.s.logicSyntax == 'logic') {
            this.latexSymbol = '\\lnot';
        } else if (this.s.logicSyntax == 'binary') {
            this.latexSymbol = '\\overline';
        }
        this.pythonSymbol = '~';
        // this.mathmlSymbol = '¬'
        this.docksTo = ['symbol', 'relation'];
    }

    get typeAsString(): string {
        return 'LogicNot';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A LogicNot has three docking points:
     *
     * - _argument_: The expression to negate
     * - _right_: Binary operation (addition, subtraction)
     */
    generateDockingPoints() {
        let box = this.boundingBox();

        this.dockingPoints["argument"] = new DockingPoint(this, this.p.createVector(0, -this.s.xBox.h/2), 1, ["symbol", "differential"], "argument");
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * this.s.mBox.w/4 + this.scale * 20, -this.s.xBox.h/2), 1, ["operator"], "right");
    }

    formatExpressionAs(format: string): string {
        // TODO Triple check
        let expression = "";
        if (format == "latex") {
            let lhs = '', rhs = '';
            if (this.s.logicSyntax == 'logic') {
                lhs = '('; rhs = ')';
            } else if (this.s.logicSyntax == 'binary') {
                lhs = '{'; rhs = '}';
            }
            if (this.dockingPoints['argument'] && this.dockingPoints['argument'].child) {
                expression += this.latexSymbol + lhs + this.dockingPoints['argument'].child.formatExpressionAs(format) + rhs;
            } else {
                expression += this.latexSymbol + lhs + rhs;
            }
            if (this.dockingPoints['right'] && this.dockingPoints['right'].child) {
                expression += this.dockingPoints['right'].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            if (this.dockingPoints['argument'] && this.dockingPoints['argument'].child) {
                expression += this.pythonSymbol + '(' + this.dockingPoints['argument'].child.formatExpressionAs(format) + ')';
            } else {
                expression += '()';
            }
            if (this.dockingPoints['right'] && this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof BinaryOperation ||
                    this.dockingPoints["right"].child instanceof Relation ||
                    this.dockingPoints["right"].child instanceof LogicBinaryOperation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    expression += " * " + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        } else if (format == "subscript") {
            expression += "{NOT}";
        } else if (format == 'mathml') {
            if (this.dockingPoints['argument'] && this.dockingPoints['argument'].child) {
                expression = '<mover accent="true"><mrow>' + this.dockingPoints['argument'].child.formatExpressionAs(format) + '</mrow></mover>';
            }
            if (this.dockingPoints['right'].child) {
                expression += this.dockingPoints['right'].child.formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Object {
        return {};
    }

    token(): string {
        return '';
    }

    _draw(): void {
        const box = this.boundingBox();
        const sw = this.s.baseFontSize/15;

        if (this.s.logicSyntax == 'logic') {
            // The following cast is OK because x, y, w, and h are present in the returned object...
            const notBox = this.s.font_up.textBounds("¬", 0, 0, this.scale * this.s.baseFontSize) as Rect;
            box.x = box.x + notBox.w;

            this.p.fill(this.color).noStroke().strokeJoin(this.p.ROUND);

            const m = Math.sqrt(Math.max(1, box.h / this.s.mBox.h));
            const a = m * this.s.baseFontSize/5;
            const b = m * (3+this.s.baseFontSize)/5;
            const c = Math.sqrt(4 * m + 1);
            // LHS
            this.p.beginShape();
            this.p.vertex(      box.x + b, -box.h/2 + m);
            this.p.bezierVertex(box.x + c, -box.h/2 + a,
                                box.x + c,  box.h/2 - a,
                                box.x + b,  box.h/2 - m);
            this.p.vertex(      box.x + a,  box.h/2);
            this.p.bezierVertex(box.x - c,  box.h/2 - a,
                                box.x - c, -box.h/2 + a,
                                box.x + a, -box.h/2);
            this.p.endShape();

            // RHS
            this.p.beginShape();
            this.p.vertex(      box.w/2 - b, -box.h/2 + m);
            this.p.bezierVertex(box.w/2 - c, -box.h/2 + a,
                                box.w/2 - c,  box.h/2 - a,
                                box.w/2 - b,  box.h/2 - m);
            this.p.vertex(      box.w/2 - a,  box.h/2);
            this.p.bezierVertex(box.w/2 + c,  box.h/2 - a,
                                box.w/2 + c, -box.h/2 + a,
                                box.w/2 - a, -box.h/2);
            this.p.endShape();

            this.p.stroke(this.color).strokeCap(this.p.SQUARE).strokeWeight(sw);
            this.p.noFill();
            this.p.beginShape();
            let h = 0.8 * notBox.h;
            this.p.vertex(box.x - notBox.w, -h/2);
            this.p.vertex(box.x - notBox.w/4, -h/2);
            this.p.vertex(box.x - notBox.w/4, h/2);
            this.p.endShape();
        } else if (this.s.logicSyntax == 'binary') {
            this.p.stroke(this.color).strokeCap(this.p.ROUND).strokeWeight(sw);
            let yShift = this.s.baseFontSize/2 * this.scale/3;
            this.p.line(box.x, box.y + yShift, box.x + box.w, box.y + yShift);
        }

        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        let box: Rect;
        let yShift: number = 0;
        // The following casts are OK because x, y, w, and h are present in the returned object...
        if (this.s.logicSyntax == 'logic') {
            box = this.s.font_up.textBounds("¬()", 0, 0, this.scale * this.s.baseFontSize) as Rect;
            yShift = 0;
        } else if (this.s.logicSyntax == 'binary') {
            box = this.s.font_up.textBounds("X", 0, 0, this.scale * this.s.baseFontSize) as Rect;
            yShift = this.s.baseFontSize/2 * this.scale;
        } else {
            box = new Rect(0, 0, 50, 50);
        }

        let width = box.w + this._argumentBox.w;
        let height = Math.max(box.h, this._argumentBox.h);

        return new Rect(-width/2, -height/2 - yShift, width, height + yShift/4);
    }

    /** Calculates the argument's bounding box */
    get _argumentBox(): Rect {
        if (this.dockingPoints["argument"] && this.dockingPoints["argument"].child) {
            return this.dockingPoints["argument"].child.subtreeDockingPointsBoundingBox;
        } else {
            return new Rect(0, 0, this.s.baseDockingPointSize, 0);
        }
    }

    _shakeIt(): void {
        this._shakeItDown();

        const thisBox = this.boundingBox();
        // The following cast is OK because x, y, w, and h are present in the returned object...
        const notBox = this.s.font_up.textBounds("¬", 0, 0, this.scale * this.s.baseFontSize) as Rect;
        if (this.s.logicSyntax == 'binary') {
            notBox.w = 0;
        }
        thisBox.x += notBox.w;

        if (this.dockingPoints["argument"]) {
            const dp = this.dockingPoints["argument"];
            if (dp.child) {
                const child = dp.child;
                child.position.x = thisBox.x + child.leftBound + dp.size;
                child.position.y = -child.dockingPoint.y;
            } else {
                dp.position.x = notBox.w/2;
                dp.position.y = 0;
            }
        }

        if (this.dockingPoints["right"]) {
            const dp = this.dockingPoints["right"];
            if (dp.child) {
                const child = dp.child;
                child.position.x = thisBox.x - notBox.w + thisBox.w + child.leftBound + dp.size;
                child.position.y = -child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x - notBox.w + thisBox.w + dp.size;
                dp.position.y = 0;
            }
        }
    }
}
