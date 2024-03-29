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

import p5 from "p5";

import { Widget, Rect } from './Widget';
import { DockingPoint } from "./DockingPoint";
import { Inequality } from "./Inequality";

/** A class for state symbols. */
export
    class StateSymbol extends Widget {

    protected stateString: string;
    protected state: string;
    protected latexSymbol: string;
    protected mhchemSymbol: string;

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality, state: string) {
        super(p, s);
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

    get typeAsString(): string {
        return 'StateSymbol';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A StateSymbol has one docking point:
     *
     - _right_: Symbol
     */
    generateDockingPoints() {
        const box = this.boundingBox();
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["state_symbol"], "right");
    }

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

    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * 0.8 * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.state, 0, 0);
        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        // The following cast is OK because x, y, w, and h are present in the returned object...
        const box = this.s.font_up.textBounds(this.state || "x", 0, 0, this.s.baseFontSize) as Rect;
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

    _shakeIt(): void {
        this._shakeItDown();

        const thisBox = this.boundingBox();

        if (this.dockingPoints["right"]) {
            const dp = this.dockingPoints["right"];
            if (dp.child) {
                const child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size;
                dp.position.y = -this.scale * this.s.xBox.h/2;
            }
        }
    }
}
