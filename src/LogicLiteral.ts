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

///// <reference path="../../typings/p5.d" />
///// <reference path="../../typings/lodash.d" />

/* tslint:disable: no-unused-variable */
/* tslint:disable: comment-format */

import p5 from "p5";

import { Widget, Rect } from './Widget'
import { LogicBinaryOperation } from './LogicBinaryOperation';
import { LogicNot } from './LogicNot';
import { DockingPoint } from './DockingPoint';
import { Relation } from './Relation';
import { Inequality } from "./Inequality";

/** A class for representing numbers */
export
    class LogicLiteral extends Widget {

    private value: boolean;
    protected right = this.dockingPoints.hasOwnProperty("right");

    /**
     * There's a thing with the baseline and all that... this sort-of fixes it.
     *
     * @returns {p5.Vector} The position to which a Symbol is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }


    constructor(p: p5, s: Inequality, value: boolean) {
        super(p, s);
        this.value = value;

        this.docksTo = ['symbol', 'relation'];
    }

    get typeAsString(): string {
        return 'LogicLiteral';
    }

    getFullText(type?: string): string {
        if (this.s.logicSyntax == 'logic') {
            switch(type) {
                case 'latex':
                    return this.value ? '\\mathsf{T}' : '\\mathsf{F}';
                case 'python':
                    return this.value ? 'True' : 'False';
                default:
                    return this.value ? 'T' : 'F';
            }
        } else if (this.s.logicSyntax == 'binary') {
            switch(type) {
                case 'latex':
                    return this.value ? '1' : '0';
                case 'python':
                    return this.value ? 'True' : 'False';
                default:
                    return this.value ? '1' : '1';
            }
        }
        return 'LogicLiteral::getFullText error';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Symbol has three docking points:
     *
     * - _right_: Binary operation (addition, subtraction), Symbol (multiplication)
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["operator"], "right");
    }

    /**
     * Generates the expression corresponding to this widget and its subtree.
     *
     * The `subscript` format is a special one for generating symbols that will work with the sympy checker. It squashes
     * everything together, ignoring operations and all that jazz.
     *
     * @param format A string to specify the output format. Supports: latex, python, subscript.
     * @returns {string} The expression in the specified format.
     */

    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            expression = this.getFullText("latex");
            if (this.right && this.dockingPoints["right"].child != null) {
                expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            expression = "" + this.getFullText("python");
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof LogicBinaryOperation ||
                    this.dockingPoints["right"].child instanceof LogicNot ||
                    this.dockingPoints["right"].child instanceof Relation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    // WARNING This should not happen.
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        } else if (format == "mathml") {
            expression = '';
            expression += '<mn>' + this.getFullText() + '</mn>';
            if (this.dockingPoints['right'].child != null) {
                expression += this.dockingPoints['right'].child.formatExpressionAs('mathml');
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            value: this.value,
        };
    }

    token(): string {
        return this.value ? 'True' : 'False';
    }

    /** Paints the widget on the canvas. */
    // IMPORTANT: 𝖳 and 𝖥 are special unicode characters: U+1D5B3 and U+1D5A5
    _draw(): void {
        let box = this.boundingBox();

        if (this.s.logicSyntax == 'logic') {
            let sw = this.s.baseFontSize/12;
            this.p.stroke(this.color).strokeCap(this.p.PROJECT).strokeWeight(sw);
            if (this.value) {
                // Draw T
                this.p.line(box.x + box.w/10,     box.y + sw,             box.x + 9*box.w/10,  box.y + sw);
                this.p.line(box.x + box.w/2,      box.y + 2*sw,           box.x +   box.w/2,   0);
            } else {
                // Draw F
                this.p.line(box.x + box.w/5,      box.y + sw,             box.x +   box.w/5,   0);
                this.p.line(box.x + box.w/5 + sw, box.y + sw,             box.x + 4*box.w/5,   box.y + sw);
                this.p.line(box.x + box.w/5 + sw, box.y + sw + 2*box.h/5, box.x + 7*box.w/10,  box.y + sw + 2*box.h/5);
            }
        } else if (this.s.logicSyntax == 'binary') {
            this.p.fill(this.color).strokeWeight(0).noStroke();

            this.p.textFont(this.s.font_up)
                .textSize(this.s.baseFontSize * this.scale)
                .textAlign(this.p.CENTER, this.p.BASELINE)
                .text(this.value ? '1' : '0', 0, 0);
            this.p.strokeWeight(1);
        }
        this.p.strokeWeight(1);
    }

    /**
     * This widget's tight bounding box. This is used for the cursor hit testing.
     *
     * @returns {Rect} The bounding box
     */
    boundingBox(): Rect {
        let box: Rect;
        // The following casts are OK because x, y, w, and h are present in the returned object...
        if (this.s.logicSyntax == 'logic') {
            box = this.s.font_up.textBounds(this.value ? 'T' : 'F', 0, 0, this.scale * this.s.baseFontSize) as Rect;
        } else if (this.s.logicSyntax == 'binary') {
            box = this.s.font_up.textBounds(this.value ? '1' : '0', 0, 0, this.scale * this.s.baseFontSize) as Rect;
        } else {
            box = new Rect(0, 0, 50, 50);
        }
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

    /**
     * Internal companion method to shakeIt(). This is the one that actually does the work, and the one that should be
     * overridden by children of this class.
     *
     * @private
     */
    _shakeIt(): void {
        this._shakeItDown();

        let thisBox = this.boundingBox();

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size;
                dp.position.y = -this.scale * this.s.xBox.h/2;
            }
        }
    }
}
