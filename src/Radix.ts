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

import { Widget, Rect } from './Widget'
import { BinaryOperation } from "./BinaryOperation";
import { Relation } from "./Relation";
import { DockingPoint } from "./DockingPoint";
import { Inequality } from "./Inequality";

/** Radix. Or, as they say, the _nth_ principal root of its argument. */
export
    class Radix extends Widget {

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality) {
        super(p, s);

        this.docksTo = ['symbol', 'operator', 'exponent', 'operator_brackets', 'relation', 'differential_argument'];
    }

    get typeAsString(): string {
        return 'Radix';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Radix has three docking points:
     *
     * - _right_: Binary operation (addition, subtraction), Symbol (multiplication)
     * - _superscript_: Exponent
     * - _argument_: The argument (duh?)
     */
    generateDockingPoints() {
        const box = this.boundingBox();
        const descent = this.position.y - (box.y + box.h);
        this.dockingPoints["argument"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * this.s.xBox.w/2, -this.s.xBox.h/2), 1, ["symbol"], "argument");
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w + this.scale * this.s.xBox.w/2, -this.s.xBox.h/2), 1, ["operator"], "right");
        this.dockingPoints["superscript"] = new DockingPoint(this, this.p.createVector(box.w + this.scale * this.s.xBox.w/2, -(box.h + descent + this.scale * 20)), 2/3, ["exponent"], "superscript");
    }

    formatExpressionAs(format: string): string {
        // TODO Triple check
        let expression = "";
        if (format == "latex") {
            if ('argument' in this.dockingPoints && this.dockingPoints['argument'].child) {
                expression += '\\sqrt{' + this.dockingPoints['argument'].child.formatExpressionAs(format) + '}';
            }
            if ('superscript' in this.dockingPoints && this.dockingPoints['superscript'].child) {
                expression += '^{' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + '}';
            }
            if ('right' in this.dockingPoints && this.dockingPoints['right'].child) {
                expression += this.dockingPoints['right'].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            if ('argument' in this.dockingPoints && this.dockingPoints['argument'].child) {
                expression += 'sqrt(' + this.dockingPoints['argument'].child.formatExpressionAs(format) + ')';
            }
            if ('superscript' in this.dockingPoints && this.dockingPoints['superscript'].child) {
                expression += '**(' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + ')';
            }
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof BinaryOperation || this.dockingPoints["right"].child instanceof Relation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    expression += " * " + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        } else if (format == "subscript") {
            expression += "{SQRT}";
        } else if (format == "mathml") {
            expression = '';
            // TODO Include indexes when they will be implemented
            if ('argument' in this.dockingPoints && this.dockingPoints['argument'].child) {
                let sqrt = '<msqrt>' + this.dockingPoints['argument'].child.formatExpressionAs(format) + '</msqrt>';
                if ('superscript' in this.dockingPoints && this.dockingPoints['superscript'].child) {
                    expression += '<msup>' + sqrt + '<mrow>' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + '</mrow></msup>';
                } else {
                    expression += sqrt;
                }
            }
            if (this.dockingPoints['right'].child != null) {
                expression += this.dockingPoints['right'].child.formatExpressionAs('mathml');
            }
        }
        return expression;
    }

    properties(): Nullable<Object> {
        return null;
    }

    /**
     * This should have been 'sqrt' but we decided not to support it as an
     * available symbol at Isaac. Too controversial.
     */
    token(): string {
        return '';
    }

    _draw(): void {
        let b = new Rect(this.boundingBox().x, this.boundingBox().y, this._radixCharacterBox?.w ?? 0, this.boundingBox().h);

        this.p.fill(this.color).noStroke();
        this.p.beginShape();
        this.p.vertex(
            b.x,                            b.y+b.h-this.s.xBox.h*0.8);
        this.p.bezierVertex(
            b.x+b.w*(1/6),                  b.y+b.h-this.s.xBox.h-this.scale*5,
            b.x+b.w*(0.8/6),                b.y+b.h-this.s.xBox.h-this.scale*5,
            b.x+b.w*(3/6),                  b.y+b.h);
        this.p.vertex(
            b.x+b.w+this.scale*2,           b.y+this.scale*4);
        this.p.vertex(
            b.x+b.w+this._argumentBox.w,    b.y+this.scale*4);
        this.p.vertex(
            b.x+b.w+this._argumentBox.w,    b.y);
        this.p.vertex(
            b.x+b.w,                        b.y);
        this.p.vertex(
            b.x+b.w-this.scale*1,           b.y);
        this.p.vertex(
            b.x+b.w*(3/6),                  b.y+b.h-this.scale*12);
        this.p.vertex(
            b.x+b.w*(1/6)+this.scale*2,     b.y+b.h-this.s.xBox.h-this.scale*10);
        this.p.vertex(
            b.x-this.scale*2,               b.y+b.h-this.s.xBox.h*0.8-this.scale*2);
        this.p.endShape();
    }

    boundingBox(): Rect {
        // Half the x-box width is a nice beautification addition, but requires expanding the bounding box. See _shakeIt().
        let width = (this._radixCharacterBox?.w ?? 0) + this._argumentBox.w + this.s.xBox.w/2;
        let height = Math.max((this._radixCharacterBox?.h ?? 0), this._argumentBox.h);
        return new Rect(-(this._radixCharacterBox?.w ?? 0), -height/2 + this.dockingPoint.y, width, height);
    }

    /** Calculates the bounding box for the V-shaped thing on the left. */
    get _radixCharacterBox(): Nullable<Rect> {
        return Rect.fromObject(this.s.font_up.textBounds("\u221A", 0, 0, this.scale * this.s.baseFontSize) as Rect);
    }

    /** Calculates the bounding box for the argument. */
    get _argumentBox(): Rect {
        if (this.dockingPoints["argument"] && this.dockingPoints["argument"].child) {
            return this.dockingPoints["argument"].child.subtreeDockingPointsBoundingBox;
        } else {
            return new Rect(0, 0, this.s.baseDockingPointSize, 0);
        }
    }

    _shakeIt(): void {
        this._shakeItDown();

        if (this.dockingPoints["argument"]) {
            let dp = this.dockingPoints["argument"];
            if (dp.child) {
                let child = dp.child;
                // Half the x-box width is a nice beautification addition, but requires expanding the bounding box. See boundingBox().
                child.position.x = child.leftBound + this.s.xBox.w/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y + child.topBound - this._argumentBox.h/2;
            } else {
                dp.position.x = this._argumentBox.center.x;
                dp.position.y = this.dockingPoint.y;
            }
        }

        let superscriptWidth = 0;
        if (this.dockingPoints["superscript"]) {
            let dp = this.dockingPoints["superscript"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = this._argumentBox.w + child.leftBound + dp.size/2;
                child.position.y = this.boundingBox().y - child.dockingPoint.y - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
                superscriptWidth = Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = this.boundingBox().x + this.boundingBox().w + dp.size;
                dp.position.y = this.boundingBox().y;
                superscriptWidth = dp.size;
            }
        }

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = this.boundingBox().x + this.boundingBox().w + superscriptWidth + child.leftBound;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = this.boundingBox().x + this.boundingBox().w + superscriptWidth + dp.size;
                dp.position.y = (-this.scale * this.s.xBox.h/2);
            }
        }
    }
}
