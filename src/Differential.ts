/*
Copyright 2016 Andrea Franceschini <andrea.franceschini@gmail.com>

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
import _compact = require('lodash/compact');
import _map = require('lodash/map');
import _repeat = require('lodash/repeat');
import _values = require('lodash/values');

import { Widget, Rect } from './Widget'
import { BinaryOperation } from "./BinaryOperation";
import { DockingPoint } from "./DockingPoint";

/** A class for representing variables and constants (aka, letters). */
export
class Differential extends Widget {

    public s: any;
    protected letter: string;

    get typeAsString(): string {
        return "Differential";
    }

    /**
     * There's a thing with the baseline and all that... this sort-of fixes it.
     *
     * @returns {p5.Vector} The position to which a Differential is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox_h/2);
    }

    public constructor(p: any, s: any, letter: string) {
        super(p, s);
        this.letter = letter;
        this.s = s;
        this.docksTo = ['operator', 'differential', 'relation'];
    }

    /**
     * Prevents Differentials from being detached from Derivatives when the user is not an admin/editor.
     */
    get isDetachable() {
        const userIsPrivileged = this.s.isUserPrivileged();
        return document.location.pathname == '/equality' || userIsPrivileged || !this.sonOfADerivative;
    }

    /**
     * Climbs up the ancestors to see if this widget is docked to a Derivative.
     */
    get sonOfADerivative() {
        let p = this.parentWidget;
        while (null !== p) {
            if (p.typeAsString === 'Derivative') {
                return true;
            }
            p = this.parentWidget;
        }
        return false;
    }

    /**
     * Climbs up the parents to see if this widget is docked to the denominator of a Derivative.
     * 
     * @returns {boolean}
     */
    get orderNeedsMoving(): boolean {
        let w: Widget = this;
        while (null !== w.parentWidget) {
            if (w.parentWidget.typeAsString === 'Derivative' && w.dockedTo === 'denominator') {
                return true;
            }
            w = w.parentWidget;
        }
        return false;
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Differential has three docking points:
     *
     * - _right_: Binary operation (addition, subtraction), Differential (multiplication)
     * - _order_: Exponent
     * - _subscript_: Subscript (duh?)
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        // let descent = this.position.y - (box.y + box.h);

        this.dockingPoints["argument"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox_w/4, -this.s.xBox_h/2), 1, ["differential_argument"], "argument");
        this.dockingPoints["order"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * 20, -this.scale * this.s.mBox_h), 2/3, ["differential_order"], "order");
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + 1.25*this.s.mBox_w, -this.s.xBox_h/2), 1, ["differential", "operator"], "right");
    }

    /**
     * Generates the expression corresponding to this widget and its subtree.
     *
     * The `subscript` format is a special one for generating Differentials that will work with the sympy checker. It squashes
     * everything together, ignoring operations and all that jazz.
     *
     * @param format A string to specify the output format. Supports: latex, python, subscript.
     * @returns {string} The expression in the specified format.
     */
    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            if (this.letter == "δ") {
                expression = "\\mathrm{\\delta}";
            } else if (this.letter == "∆" || this.letter == "Δ") { // The two deltas are different!
                expression = "\\mathrm{\\Delta}";
            } else {
                expression = "\\mathrm{" + this.letter + "}";
            }
            
            if (this.dockingPoints["order"].child != null && !this.orderNeedsMoving) {
                expression += "^{" + this.dockingPoints["order"].child.formatExpressionAs(format) + "}";
            }
            if (this.dockingPoints["argument"].child != null) {
                if (this.dockingPoints["argument"].child instanceof BinaryOperation) {
                    expression += " " + this.dockingPoints["argument"].child.formatExpressionAs(format);
                } else {
                    // WARNING This assumes it's a Differential, hence produces a multiplication
                    expression += " " + this.dockingPoints["argument"].child.formatExpressionAs(format);
                }
            }
            // AAARGH! Curses, you Leibniz!
            if (this.dockingPoints["order"].child != null && this.orderNeedsMoving) {
                expression += "^{" + this.dockingPoints["order"].child.formatExpressionAs(format) + "}";
            }
            if (this.dockingPoints["right"].child != null) {
                expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            if (this.letter == "δ") {
                expression = "delta";
            } else if (this.letter == "∆" || this.letter == "Δ") { // The two deltas are different!
                expression = "Delta";
            } else {
                expression = "d";
            }
            let args = [];
            if (this.dockingPoints["argument"].child != null) {
                args.push(this.dockingPoints["argument"].child.formatExpressionAs(format));
            }
            expression += args.join("");

            // FIXME We need to decide what to do with orders.
            if (this.dockingPoints["order"].child != null) {
                let n = parseInt(this.dockingPoints["order"].child.formatExpressionAs(format));
                if (!isNaN(n) && n > 1) {
                    expression += _repeat(" * " + expression, n-1);
                }
            }
            if (this.dockingPoints["right"].child != null) {
                let op = (this.dockingPoints["right"].child.typeAsString == 'Relation' ||
                      this.dockingPoints["right"].child.typeAsString == 'BinaryOperation')
                      ? '' : ' * ';
                expression += op + this.dockingPoints["right"].child.formatExpressionAs(format);
            }

        } else if (format == "mathml") {
            expression = '';
            if (this.dockingPoints["order"].child == null && this.dockingPoints["argument"].child != null) {
                expression += "<mi>" + this.letter  + "</mi>" + this.dockingPoints["argument"].child.formatExpressionAs(format);
            } else if (this.dockingPoints["order"].child != null && this.dockingPoints["argument"].child != null) {
                if (this.orderNeedsMoving) {
                    expression += '<msup><mrow><mi>' + this.letter + '</mi>' + this.dockingPoints["argument"].child.formatExpressionAs(format) + '</mrow><mrow>' + this.dockingPoints["order"].child.formatExpressionAs(format) + '</mrow></msup>';
                } else {
                    expression += '<msup><mi>' + this.letter + '</mi><mrow>' + this.dockingPoints["order"].child.formatExpressionAs(format) + '</mrow></msup>' + this.dockingPoints["argument"].child.formatExpressionAs(format);
                }
            }
            if (this.dockingPoints['right'].child != null) {
                expression += this.dockingPoints['right'].child.formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            letter: this.letter
        };
    }

    token(): string {
        // DRY this out.
        let expression;
        if (this.letter == "δ") {
            expression = "delta";
        } else if (this.letter == "∆" || this.letter == "Δ") { // The two Deltas are different!
            expression = "Delta";
        } else {
            expression = "d";
        }
        let args = [];
        if (this.dockingPoints["argument"].child != null) {
            args.push(this.dockingPoints["argument"].child.formatExpressionAs("python"));
        }
        expression += args.join(" ");

        return expression;
    }

    /** Paints the widget on the canvas. */
    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
              .textSize(this.s.baseFontSize * this.scale)
              .textAlign(this.p.CENTER, this.p.BASELINE)
              .text(this.letter, 0, 0);
        this.p.strokeWeight(1);
    }

    /**
     * This widget's tight bounding box. This is used for the cursor hit testing.
     *
     * @returns {Rect} The bounding box
     */
    boundingBox(): Rect {
        let box = this.s.font_up.textBounds(this.letter || "D", 0, 0, this.scale * this.s.baseFontSize);
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

    /**
     * Helper to shake the argument.
     * 
     * @private
     * @returns {number} The width of the argument, if one is present, 0 otherwise.
     */
    _shakeArgument(displacement = 0, thisBox = this.boundingBox()): number {
        if (this.dockingPoints["argument"]) {
            let dp = this.dockingPoints["argument"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + displacement + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
                return Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = thisBox.x + thisBox.w + displacement + dp.size;
                dp.position.y = -this.scale*this.s.xBox_h/2;
                return 2*dp.size;
            }
        } else {
            return 0;
        }
    }

    /**
     * Helper to shake the order.
     * 
     * @private
     * @returns {number} The width of the order, if one is present, 0 otherwise.
     */
    _shakeOrder(displacement = 0, thisBox = this.boundingBox()): number {
        if (this.dockingPoints["order"]) {
            let dp = this.dockingPoints["order"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + displacement + dp.size*child.scale/2;
                child.position.y = -this.scale*this.s.xBox_h - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
                return Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = thisBox.x + thisBox.w + displacement + dp.size/2;
                dp.position.y = -this.scale*this.s.mBox_h;
                return dp.size;
            }
        } else {
            return 0;
        }
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

        let orderWidth = 0, argumentWidth = 0;
        if (this.orderNeedsMoving) {
            argumentWidth = this._shakeArgument(0, thisBox);
            orderWidth = this._shakeOrder(argumentWidth, thisBox);
        } else {
            orderWidth = this._shakeOrder(0, thisBox);
            argumentWidth = this._shakeArgument(orderWidth, thisBox);
        }

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + orderWidth + argumentWidth + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + orderWidth + argumentWidth + dp.size;
                dp.position.y = -this.scale*this.s.xBox_h/2;
            }
        }
    }

    /**
     * @returns {Array<Widget>} A flat array of the children of this widget, as widget objects
     */
    get children(): Array<Widget> {
        return _compact(_map(_values(this.dockingPoints), "child"));
    }
}
