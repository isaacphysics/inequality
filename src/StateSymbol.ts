/*
Copyright 2016 Andrew Wells <aw684@cam.ac.uk>

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


import { Widget, Rect } from './Widget';
import { DockingPoint } from "./DockingPoint";

/**
 * A class for state symbols.
 */
export
    class StateSymbol extends Widget {
    public s: any;
    protected stateString: string;
    protected state: string;
    protected pythonSymbol: string;
    protected latexSymbol: string;
    protected mhchemSymbol: string;


    get typeAsString(): string {
        return "StateSymbol";
    }

    /**
     * There's a thing with the baseline and all that... this sort-of fixes it.
     *
     * @returns {p5.Vector} The position to which a Symbol is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox_h/2);
    }

    constructor(p: any, s: any, state: string) {
        super(p, s);
        this.s = s;
        this.stateString = state;
        this.state = state;
        switch (state) {
            case 'aqueous':
                this.state = '(aq)';
                this.mhchemSymbol = '(aq)'
                this.latexSymbol = '\\text{(aq)}';
                break;
            case 'gas':
                this.state = '(g)';
                this.mhchemSymbol = '(g)'
                this.latexSymbol = '\\text{(g)}';
                break;
            case 'solid':
                this.state = '(s)';
                this.mhchemSymbol = '(s)'
                this.latexSymbol = '\\text{(s)}';
                break;
            case 'liquid':
                this.state = '(l)';
                this.mhchemSymbol = '(l)'
                this.latexSymbol = '\\text{(l)}';
                break;
            case 'metal':
                this.state = '(m)';
                this.mhchemSymbol = '(m)'
                this.latexSymbol = '\\text{(m)}';
                break;
            default:
                this.state = state;
                this.mhchemSymbol = state;
                this.latexSymbol = "\\text{" + state + "}";
        }

        this.docksTo = ['chemical_element', "operator_brackets"];
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Relation has one docking point:
     *
     - _right_: Symbol
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        let descent = this.position.y - (box.y + box.h);

        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox_w/4, -this.s.xBox_h/2), 1, ["state_symbol"], "right");
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
            expression += this.latexSymbol;
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        // } else if (format == "python") {
        //     if (this.dockingPoints["right"].child != null) {
        //         expression += this.dockingPoints["right"].child.formatExpressionAs(format);
        //     }
        } else if (format == "subscript") {
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mhchem") {
            expression += this.mhchemSymbol;
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mathml") {
            expression += '<mo>' + this.state + "</mo>"
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            state: this.stateString
        };
    }

    token(): string {
        return "";
    }

    /** Paints the widget on the canvas. */
    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * 0.8 * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.state, 0, 0);
        this.p.strokeWeight(1);
    }

    /**
     * This widget's tight bounding box. This is used for the cursor hit testing.
     *
     * @returns {Rect} The bounding box
     */
    boundingBox(): Rect {
        let box = this.s.font_up.textBounds(this.state || "x", 0, 0, this.s.baseFontSize);
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
                dp.position.y = -this.scale * this.s.xBox_h/2;
            }
        }
    }
}
