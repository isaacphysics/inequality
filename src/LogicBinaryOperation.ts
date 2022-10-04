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

import { DockingPoint } from "./DockingPoint";
import { BinaryOperation } from "./BinaryOperation";
import { Inequality } from "./Inequality";

/**
 * Boolean Logic Binary operations, such as ANDs and ORs.
 *
 * BE EXTRA CAREFUL with the minus sign: use "−" (U+2212), not just a dash.
 */
export
    class LogicBinaryOperation extends BinaryOperation {

    protected operation: string;
    protected latexSymbol: string;
    protected mathmlSymbol: string;
    protected pythonSymbol: string;

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality, operation: string) {
        super(p, s, operation);
        this.operation = operation;
        if (this.s.logicSyntax == 'logic') {
            switch(this.operation) {
            case 'and':
                this.latexSymbol = '\\land';
                this.pythonSymbol = '&';
                this.mathmlSymbol = '∧';
                break;
            case 'or':
                this.latexSymbol = '\\lor';
                this.pythonSymbol = '|';
                this.mathmlSymbol = '∨';
                break;
            case 'xor':
                this.latexSymbol = '\\veebar';
                this.pythonSymbol = '^';
                this.mathmlSymbol = '⊻';
                break;
            default:
                this.latexSymbol = this.pythonSymbol = this.mathmlSymbol = this.operation;
                break;
            }
        } else if (this.s.logicSyntax == 'binary') {
            switch(this.operation) {
            case 'and':
                this.latexSymbol = '\\cdot';
                this.pythonSymbol = '&';
                this.mathmlSymbol = '·';
                break;
            case 'or':
                this.latexSymbol = '+';
                this.pythonSymbol = '|';
                this.mathmlSymbol = '+';
                break;
            case 'xor':
                this.latexSymbol = '\\oplus';
                this.pythonSymbol = '^';
                this.mathmlSymbol = '⊕';
                break;
                default:
                this.latexSymbol = this.pythonSymbol = this.mathmlSymbol = this.operation;
                break;
            }
        } else {
            this.latexSymbol = this.pythonSymbol = this.mathmlSymbol = 'WRONG LOGIC SYNTAX';
        }

        this.docksTo = ['operator', 'operator_brackets'];
    }

    get typeAsString(): string {
        return 'LogicBinaryOperation';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Binary Operation has one docking point:
     *
      - _right_: Symbol
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["symbol"], "right");
    }

    formatExpressionAs(format: string): string {
        let expression = " ";
        if (format == "latex") {
            expression += this.latexSymbol + " ";
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            expression += this.pythonSymbol + " ";
            if (this.dockingPoints["right"].child != null) {
                expression += "" + this.dockingPoints["right"].child.formatExpressionAs(format);
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

    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * 0.8 * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.mathmlSymbol, 0, 0);
        this.p.strokeWeight(1);
    }
}
