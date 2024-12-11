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

import { Widget, Rect } from './Widget';
import { Num } from './Num';
import { DockingPoint } from "./DockingPoint";
import { Inequality } from "./Inequality";

/**
 * Binary operations, such as plus and minus.
 *
 * BE EXTRA CAREFUL with the minus sign: use "−" (U+2212), not just a dash.
 */
export
    class BinaryOperation extends Widget {

    protected operation: string;
    protected mhchemSymbol: string;
    protected latexSymbol: string;
    protected mathmlSymbol: string;
    protected pythonSymbol: string;

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale * (this.s.xBox?.h ?? 50)/2);
    }

    constructor(p: p5, s: Inequality, operation: string) {
        super(p, s);
        this.operation = operation;
        switch(this.operation) {
          case '±':
            this.latexSymbol = '\\pm';
            this.pythonSymbol = '±';
            this.mathmlSymbol = '±';
            this.mhchemSymbol = '\\pm';
            break;
          case '−':
            this.latexSymbol = '-';
            this.pythonSymbol = '-';
            this.mathmlSymbol = '-';
            this.mhchemSymbol = '-';
            break;
          default:
            this.latexSymbol = this.pythonSymbol = this.mathmlSymbol = this.mhchemSymbol = this.operation;
            break;
        }

        // FIXME Not sure this is entirely right. Maybe make the "type" in DockingPoint an array? Works for now.
        this.docksTo = ['exponent', 'chemical_element', 'state_symbol', 'particle', 'operator_brackets', 'symbol', 'differential', 'top-left', 'bottom-left'];
        if (!["chemistry", "nuclear"].includes(this.s.editorMode)) {
            this.docksTo.push('operator', 'relation');
        }
    }

    get typeAsString(): string {
        return 'BinaryOperation';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A BinaryOperation has one docking point:
     *
      - _right_: Symbol
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + (this.s.mBox?.w ?? 50)/4, -(this.s.xBox?.h ?? 50)/2), 1, ["symbol", "differential"], "right");
    }

    /**
     * It is possible to use the binary minus symbol to form -1.
     * For nuclear atomic numbers this causes a parsing error because of how
     * binary operators are currently formatted.
     *
      - _right_: right docking point widget to check
     *
     */
    isSolitaryNegativeOne(right: Nullable<Widget>): boolean {
        if (right?.typeAsString == "Num") {
            if ((right as Num).getFullText() === "1" && this.latexSymbol == '-') {
                return !right.dockingPoints["right"].child
                    && !right.dockingPoints["superscript"].child;
            }
        }
        return false;
    }

    formatExpressionAs(format: string): string {
        let expression = " ";
        if (format == "latex") {
            if (this.isSolitaryNegativeOne(this.dockingPoints["right"].child)) {
                return "-1";
            }

            expression += this.latexSymbol + " ";
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            expression += this.pythonSymbol + " ";
            if (this.dockingPoints["right"].child != null) {
                expression += "" + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mhchem") {
            if (this.isSolitaryNegativeOne(this.dockingPoints["right"].child)) {
                return "-1";
            }

          expression += this.mhchemSymbol + " ";
            if (this.dockingPoints["right"].child != null) {
                expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
            } else {
                // This is a charge, most likely:
                expression = this.operation.replace(/−/g, "-");
            }
        } else if (format == "subscript") {
            expression = "";
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mathml") {
            expression = '<mo>' + this.mathmlSymbol + "</mo>";
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            operation: this.operation
        };
    }

    token(): string {
        return '';
    }

    _draw(): void {
        this.p.fill(this.color as p5.Color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up as string|object)
            .textSize(this.s.baseFontSize * 0.8 * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.operation, 0, 0);
        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        const s = "+";
        // The following cast is OK because x, y, w, and h are present in the returned object...
        const box = this.s.font_up.textBounds(s, 0, 0, this.scale*this.s.baseFontSize*0.8) as Rect;
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

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
                dp.position.y = -this.scale * (this.s.xBox?.h ?? 50)/2;
            }
        }
    }
}
