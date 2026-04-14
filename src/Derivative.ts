/*
Copyright 2017 Andrea Franceschini <andrea.franceschini@gmail.com>

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
import { Num } from "./Num";
import { Differential } from "./Differential";
import { Inequality } from "./Inequality";

export
    class Derivative extends Widget {

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, 0);
    }

    constructor(p: p5, s: Inequality) {
        super(p, s);

        this.docksTo = ['operator', 'symbol', 'operator_brackets', 'relation'];
    }

    get typeAsString(): string {
        return 'Derivative';
    }

    /** Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Derivative has three docking point:
     *
     * - _right_: Binary operation (addition, subtraction), Symbol (multiplication)
     * - _numerator_: Differential
     * - _denominator_: Differential
     */
    generateDockingPoints() {
        let box = this.boundingBox();
        // FIXME That 50 is hard-coded, need to investigate when this.width gets initialized.
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(50 + this.scale * this.s.mBox.w/4, -box.h/2), 1, ["operator"], "right");
        this.dockingPoints["numerator"] = new DockingPoint(this, this.p.createVector(0, -(box.h + 25)), 1, ["differential"], "numerator");
        this.dockingPoints["denominator"] = new DockingPoint(this, this.p.createVector(0, 0 + 25), 1, ["differential"], "denominator");
    }

    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            if (this.dockingPoints["numerator"].child[0] != null && this.dockingPoints["denominator"].child[0] != null) {
                expression += "\\frac{" + this.dockingPoints["numerator"].child[0].formatExpressionAs(format) + "}{" + this.dockingPoints["denominator"].child[0].formatExpressionAs(format) + "}";
                if (this.dockingPoints["right"].child[0] != null) {
                    expression += this.dockingPoints["right"].child[0].formatExpressionAs(format);
                }
            }
        } else if (format == "python") {
            if (this.dockingPoints["numerator"].child[0] != null &&
                this.dockingPoints["denominator"].child[0] != null &&
                this.dockingPoints["numerator"].child[0] instanceof Differential &&
                this.dockingPoints["denominator"].child[0] instanceof Differential) {
                expression += "Derivative(";
                if (this.dockingPoints["numerator"].child[0].dockingPoints["argument"].child[0] != null) {
                    expression += this.dockingPoints["numerator"].child[0].dockingPoints["argument"].child[0].formatExpressionAs(format) + ", ";
                } else {
                    expression += "_, ";
                }
                let stack: Array<Widget> = [this.dockingPoints["denominator"].child[0]];
                let list = [];
                while(stack.length > 0) {
                    let e = stack.shift();
                    if (e instanceof Differential) {
                        // WARNING: This stops at the first non-Differential, which is kinda OK, but may confuse people.
                        let o = 1;
                        let o_child: Nullable<Widget> = e.dockingPoints["order"].child[0];
                        if (o_child != null && o_child instanceof Num) {
                            o = parseInt((o_child as Num).getFullText());
                        }
                        do {
                            if (e.dockingPoints["argument"].child[0] != null) {
                                list.push(e.dockingPoints["argument"].child[0].formatExpressionAs(format));
                            } else {
                                list.push("?");
                            }
                            o -= 1;
                        } while(o > 0);
                        if (e.dockingPoints["right"].child[0] != null) {
                            stack.push(e.dockingPoints["right"].child[0]);
                        }
                    }
                }
                expression += list.join(", ") + ")";
                if(this.dockingPoints["right"].child[0] != null) {
                    expression += this.dockingPoints["right"].child[0].formatExpressionAs(format);
                }
            }
        } else if (format == "subscript") {
            if (this.dockingPoints["right"].child[0] != null) {
                expression += "[Derivative:" + this.id + "]";
            }
        } else if (format == 'mathml') {
            expression = '';
            if (this.dockingPoints["numerator"].child[0] != null && this.dockingPoints["denominator"].child[0] != null) {
                expression += '<mfrac><mrow>' + this.dockingPoints['numerator'].child[0].formatExpressionAs(format) + '</mrow><mrow>' + this.dockingPoints['denominator'].child[0].formatExpressionAs(format) + '</mrow></mfrac>';
            }
            if (this.dockingPoints['right'].child[0] != null) {
                expression += this.dockingPoints['right'].child[0].formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Nullable<Object> {
        return null;
    }

    token(): string {
        let r = /(^Derivative\((.*?),(.*)\)).*$/;
        return this.formatExpressionAs("python").replace(r, 'Derivative(_,$3)');
    }

    _draw(): void {
        this.p.noFill().strokeCap(this.p.SQUARE).strokeWeight(4 * this.scale).stroke(this.color);

        let box = this.boundingBox();
        this.p.line(-box.w/2, 0, box.w/2, 0);

        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        // The following cast is OK because x, y, w, and h are present in the returned object...
        let box = this.s.font_up.textBounds("+", 0, 0, this.scale * this.s.baseFontSize) as Rect;

        let width = Math.max(box.w, this._numeratorBox.w, this._denominatorBox.w);

        return new Rect(-width/2, -box.h/2, width, box.h);
    }

    get _numeratorBox(): Rect {
        let numeratorBox = new Rect(0, 0, this.s.baseDockingPointSize, this.s.baseDockingPointSize);
        if (this.dockingPoints["numerator"] && this.dockingPoints["numerator"].child[0]) {
            numeratorBox = this.dockingPoints["numerator"].child[0].subtreeDockingPointsBoundingBox;
        }
        return numeratorBox;
    }

    get _denominatorBox(): Rect {
        let denominatorBox = new Rect(0, 0, this.s.baseDockingPointSize, this.s.baseDockingPointSize);
        if (this.dockingPoints["denominator"] && this.dockingPoints["denominator"].child[0]) {
            denominatorBox = this.dockingPoints["denominator"].child[0].subtreeDockingPointsBoundingBox;
        }
        return denominatorBox;
    }

    _shakeIt(): void {
        this._shakeItDown();

        let thisBox = this.boundingBox();

        if (this.dockingPoints["numerator"]) {
            let dp = this.dockingPoints["numerator"];
            if (dp.child[0]) {
                let child = dp.child[0];
                // TODO Keep an eye on these, we might need the subtreeDockingPointsBoundingBox instead.
                child.position.x = -child.subtreeBoundingBox.x - child.subtreeBoundingBox.w/2;
                child.position.y = -dp.size - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
            } else {
                dp.position.x = 0;
                dp.position.y = -this.s.xBox.h/2 - dp.size;
            }
        }

        if (this.dockingPoints["denominator"]) {
            let dp = this.dockingPoints["denominator"];
            if (dp.child[0]) {
                let child = dp.child[0];
                // TODO Keep an eye on these, we might need the subtreeDockingPointsBoundingBox instead.
                child.position.x = -child.subtreeBoundingBox.x - child.subtreeBoundingBox.w/2;
                child.position.y = dp.size - child.subtreeDockingPointsBoundingBox.y;
            } else {
                dp.position.x = 0;
                dp.position.y = this.s.xBox.h/2 + dp.size;
            }
        }

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child[0]) {
                let child = dp.child[0];
                child.position.x = thisBox.x + thisBox.w + child.leftBound + dp.size/2;
                child.position.y = -child.dockingPoint.y;
            } else {
                dp.position.x = this.subtreeBoundingBox.w/2 + dp.size;
                dp.position.y = 0;
            }
        }
    }
}
