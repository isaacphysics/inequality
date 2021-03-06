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

///// <reference path="../../typings/p5.d" />
///// <reference path="../../typings/lodash.d" />

/* tslint:disable: no-unused-variable */
/* tslint:disable: comment-format */

import p5 from "p5";


import { Widget, Rect } from './Widget'
import { BinaryOperation } from "./BinaryOperation";
import { DockingPoint } from "./DockingPoint";
import { Relation } from "./Relation";

/** A class for representing numbers */
export
    class Num extends Widget {

    public s: any;
    private significand: string;
    private num_font_size: number;
    protected right = this.dockingPoints.hasOwnProperty("right");
    protected superscript = this.dockingPoints.hasOwnProperty("superscript");

    get typeAsString(): string {
        return "Num";
    }

    /**
     * There's a thing with the baseline and all that... this sort-of fixes it.
     *
     * @returns {p5.Vector} The position to which a Symbol is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox_h/2);
    }


    constructor(p: any, s: any, significand: string, exponent: string) {
        super(p, s);
        this.significand = significand;
        this.num_font_size = 50;
        this.s = s;


        this.docksTo = ['symbol', 'exponent', 'subscript', 'top-left', 'symbol_subscript', 'bottom-left', 'particle', 'relation', 'operator_brackets', 'differential_order', 'differential_argument'];
    }

    getFullText(type?: string): string {
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
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox_w/4, -this.s.xBox_h/2), 1, ["operator"], "right");
        this.dockingPoints["superscript"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * 20, -this.scale * this.s.mBox_h), 2/3, ["exponent"], "superscript");
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
            if (this.superscript && this.dockingPoints["superscript"].child != null) {
                expression += "^{" + this.dockingPoints["superscript"].child.formatExpressionAs(format) + "}";
            }
            if (this.right && this.dockingPoints["right"].child != null) {
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
            if (this.right && this.dockingPoints["right"].child != null) {
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
            if (this.dockingPoints["superscript"].child != null) {
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
            if (this.dockingPoints["superscript"].child != null) {
                expression += this.dockingPoints["superscript"].child.formatExpressionAs(format);
            }
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mathml") {
            expression = '';
            if (this.dockingPoints['superscript'].child == null) {
                expression += '<mn>' + this.getFullText() + '</mn>';

            } else {
                expression += '<msup><mn>' + this.getFullText() + '</mn><mrow>' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + '</mrow></msup>';

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

    /** Paints the widget on the canvas. */
    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.getFullText(), 0, 0);
        this.p.strokeWeight(1);
    }

    /**
     * This widget's tight bounding box. This is used for the cursor hit testing.
     *
     * @returns {Rect} The bounding box
     */
    boundingBox(): Rect {
        let box = this.s.font_up.textBounds(this.getFullText() || "x", 0, 0, this.scale * this.s.baseFontSize);
        return new Rect(-box.w/2 - this.s.xBox.w/4, box.y, box.w, box.h);
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

        let superscriptWidth: number;
        if (this.dockingPoints["superscript"]) {
            let dp = this.dockingPoints["superscript"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + child.scale*dp.size/2;
                child.position.y = -this.scale * this.s.xBox_h - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
                superscriptWidth = Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size/2;
                dp.position.y = -this.scale * this.s.mBox_h;
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
                dp.position.y = -this.scale * this.s.xBox_h/2;
            }
        }
    }

    isNegative(): boolean {
        return Number(this.significand) < 0;
    }
}
