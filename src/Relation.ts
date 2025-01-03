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

import { Widget, Rect } from './Widget';
import { DockingPoint } from "./DockingPoint";
import { Inequality } from "./Inequality";

/**
 * Relations, such as equalities, inequalities, and unexpected friends.
 */
export
    class Relation extends Widget {

    protected relationString: string;
    protected relation: string;
    protected pythonSymbol: string = ''; // WARNING: This should be initialized in the constructor
    protected latexSymbol: string;
    protected mhchemSymbol: string = ''; // WARNING: This should be initialized in the constructor
    protected mathmlSymbol: string = ''; // WARNING: This should be initialized in the constructor

    /**
     * There's a thing with the baseline and all that... this sort-of fixes it.
     *
     * @returns {p5.Vector} The position to which a Symbol is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality, relation: string) {
        super(p, s);
        this.relationString = relation;
        switch (relation) {
            case 'rightarrow':
                this.relation = '→';
                this.mhchemSymbol = '->';
                this.latexSymbol = '\\rightarrow ';
                break;
            case 'leftarrow':
                this.relation = '←';
                this.latexSymbol = '\\leftarrow ';
                break;
            case 'rightleftarrows':
                this.relation = '⇄';
                this.latexSymbol = '\\rightleftarrows ';
                break;
            case 'equilibrium':
                this.relation = '⇌';
                this.mhchemSymbol = '<=>';
                this.latexSymbol = '\\rightleftharpoons ';
                break;
            case '<=':
                this.relation = '≤';
                this.pythonSymbol = '<=';
                this.latexSymbol = '\\leq ';
                this.mathmlSymbol = '&#x2264;';
                break;
            case '>=':
                this.relation = '≥';
                this.pythonSymbol = '>=';
                this.latexSymbol = '\\geq ';
                this.mathmlSymbol = '&#x2265;';
                break;
            case '<':
                this.relation = '<';
                this.pythonSymbol = '<';
                this.latexSymbol = '<';
                this.mathmlSymbol = '&lt;';
                break;
            case '>':
                this.relation = '>';
                this.pythonSymbol = '>';
                this.latexSymbol = '> ';
                this.mathmlSymbol = '&gt;';
                break;
            case 'equiv':
            case '=':
                this.relation = '=';
                this.pythonSymbol = '==';
                this.latexSymbol = '=';
                break;
            case '.':
                this.relation = '⋅';
                this.mhchemSymbol = ".";
                this.latexSymbol = '\\cdot';
                break;
            case 'equiv':
                this.relation = '≡';
                this.pythonSymbol = '==';
                this.latexSymbol = '\\equiv';
                break;
            default:
                this.relation = relation;
                this.pythonSymbol = relation;
                this.latexSymbol = relation;
        }

        // FIXME Not sure this is entirely right. Maybe make the "type" in DockingPoint an array? Works for now.
        this.docksTo = ['chemical_element', 'state_symbol', 'particle', "operator_brackets"];
        if (!["chemistry", "nuclear"].includes(this.s.editorMode)) {
            this.docksTo.push('operator');
        }
        // WARNING ^^^ There used to be 'differential in there. Removing it, prevents relations from docking as brackets arguments.
        // THIS MAY BREAK THINGS BUT I CAN'T SEE HOW RIGHT NOW.
        // TODO Check that this doesn't break stuff by accident. If it does, the solution is to exclude it only for logic mode.
    }

    get typeAsString(): string {
        return 'Relation';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Relation has one docking point:
     *
     - _right_: Symbol
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["relation"], "right");
    }

    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            if (this.dockingPoints["right"].child != null) {
                expression += " " + this.latexSymbol + " " + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            if (this.dockingPoints["right"].child != null) {
                expression += " " + this.pythonSymbol + " " + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "subscript") {
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mhchem") {
            if (this.dockingPoints["right"].child != null) {
                expression += " " + this.mhchemSymbol + " " + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "mathml") {
            let rel = this.mathmlSymbol ? this.mathmlSymbol : this.relation;
            if (this.dockingPoints["right"].child != null) {
                expression += '<mo>' + rel + "</mo>" + this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            relation: this.relationString
        };
    }

    token(): string {
        // Equals sign always appears in menu, others require loading
        if (this.relation == "=") {
            return '';
        } else if (this.pythonSymbol) {
            return this.pythonSymbol;
        }
        return '';
    }

    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * 0.8 * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.relation, 0, 0);
        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        const s = this.relation || "=";
        // The following cast is OK because x, y, w, and h are present in the returned object...
        const box = this.s.font_up.textBounds(s, 0, 0, this.scale*this.s.baseFontSize*0.8) as Rect;
        return new Rect(-box.w/2, box.y, box.w, box.h);
    }

    _shakeIt(): void {
        this._shakeItDown();
        const thisBox = this.boundingBox();

        if (this.dockingPoints["right"]) {
            const dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size;
                dp.position.y = -this.scale*this.s.xBox.h/2;
            }
        }
    }
}
