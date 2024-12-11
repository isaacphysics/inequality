/*
Copyright 2016 Andrea Franceschini <andrea.franceschini@gmail.com>
               Andrew Wells <aw684@cam.ac.uk>

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
import { DockingPoint } from "./DockingPoint";
import { Relation } from "./Relation";
import { Inequality } from "./Inequality";

/** A class for representing numbers */
export
    class Num extends Widget {

    /**
     * Significand, mantissa, coefficient... this is the part of a number in
     * scientific notation consisting of its significant digits.
     * 
     * It's not like we support anything other than plain old regular
     * first-grade notation but hey.
     * 
     * I'm sure there's also a funny story about why this is a string instead of
     * a number but I can't remember it.
     */
    private significand: string;
    protected superscript = this.dockingPoints.hasOwnProperty("superscript");

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality, significand: string, _exponent: string) {
        super(p, s);
        this.significand = significand;

        this.docksTo = ['symbol', 'exponent', 'subscript', 'top-left', 'symbol_subscript', 'bottom-left', 'relation', 'differential_order', 'differential_argument'];
        if (!["chemistry", "nuclear"].includes(this.s.editorMode)) {
            this.docksTo.push('operator_brackets');
        }
    }

    get typeAsString(): string {
        return 'Num';
    }

    getFullText(_type?: string): string {
        return this.significand;
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Symbol has three docking points:
     *
     * - _right_: Binary operation (addition, subtraction), Symbol (multiplication)
     * - _superscript_: Exponent
     * - _subscript_: Subscript (duh?)
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["operator"], "right");
        if (this.s.editorMode === "maths") {
            this.dockingPoints["superscript"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * 20, -this.scale * this.s.mBox.h), 2/3, ["exponent"], "superscript");
        }
    }

    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            expression = this.getFullText("latex");
            if (this.superscript && this.dockingPoints["superscript"].child != null) {
                expression += "^{" + this.dockingPoints["superscript"].child.formatExpressionAs(format) + "}";
            }
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof Num) {
                    expression += "\\cdot " + this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        } else if (format == "mhchem") {
            expression = this.getFullText("mhchem");
            if (this.superscript && this.dockingPoints["superscript"].child != null) {
                expression += "^" + this.dockingPoints["superscript"].child.formatExpressionAs(format) + "";
            }
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof Num) {
                    expression += "\\cdot " + this.dockingPoints["right"].child.formatExpressionAs(format);
                } else if (this.dockingPoints["right"].child instanceof BinaryOperation) {
                    expression += "" + this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }

        } else if (format == "python") {
            expression = "" + this.getFullText("python");
            if (this.superscript && this.dockingPoints["superscript"].child != null) {
                expression += "**(" + this.dockingPoints["superscript"].child.formatExpressionAs(format) + ")";
            }
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof BinaryOperation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else if (this.dockingPoints["right"].child instanceof Relation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    // WARNING This assumes it's a "Symbol", hence produces a multiplication
                    expression += "*" + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        } else if (format == "subscript") {
            expression = "" + this.getFullText();
            if (this.superscript && this.dockingPoints["superscript"].child != null) {
                expression += this.dockingPoints["superscript"].child.formatExpressionAs(format);
            }
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mathml") {
            expression = '';
            if (this.superscript && this.dockingPoints['superscript'].child != null) {
                expression += '<msup><mn>' + this.getFullText() + '</mn><mrow>' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + '</mrow></msup>';
            } else {
                expression += '<mn>' + this.getFullText() + '</mn>';
            }
            if (this.dockingPoints['right'].child != null) {
                expression += this.dockingPoints['right'].child.formatExpressionAs('mathml');
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            significand: this.significand,
        };
    }

    token(): string {
        return '';
    }

    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.getFullText(), 0, 0);
        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        // The following cast is OK because x, y, w, and h are present in the returned object...
        let box = this.s.font_up.textBounds(this.getFullText() || "x", 0, 0, this.scale * this.s.baseFontSize) as Rect;
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

    _shakeIt(): void {
        this._shakeItDown();

        let thisBox = this.boundingBox();

        let superscriptWidth = 0;
        if (this.dockingPoints["superscript"]) {
            let dp = this.dockingPoints["superscript"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + child.scale*dp.size/2;
                child.position.y = -this.scale * this.s.xBox.h - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
                superscriptWidth = Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size/2;
                dp.position.y = -this.scale * this.s.mBox.h;
                superscriptWidth = dp.size;
            }
        }

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + superscriptWidth + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + superscriptWidth + dp.size;
                dp.position.y = -this.scale * this.s.xBox.h/2;
            }
        }
    }

    isNegative(): boolean {
        return Number(this.significand) < 0;
    }
}
