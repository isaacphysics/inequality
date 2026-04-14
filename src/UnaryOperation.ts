import p5 from "p5";

import {Rect, Widget} from "./Widget";
import {Inequality} from "./Inequality";
import {DockingPoint} from "./DockingPoint";
import {BinaryOperation} from "./BinaryOperation";
import {LogicBinaryOperation} from "./LogicBinaryOperation";
import {Relation} from "./Relation";
import {Brackets} from "./Brackets";

/** UnaryOperation */
export class UnaryOperation extends Widget {

    protected type: string;
    protected operation: string;
    protected mhchemFormat: (arg: string) => string;
    protected latexFormat: (arg: string) => string;
    protected mathmlFormat: (arg: string) => string;
    protected pythonFormat: (arg: string) => string;

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, 0);
    }

    constructor(p: p5, s: Inequality, type: string, operation: string) {
        super(p, s);
        this.type = type;
        this.operation = operation;

        switch(operation) {
            case "!":
                this.latexFormat = this.mhchemFormat = (arg) => type === "postfix"
                        ? arg + operation + "\\,"
                        : operation + arg;
                this.pythonFormat = (arg) => `factorial${arg.at(0) === "(" ? "" : "("}${arg}${arg.at(-1) === ")" ? "" : ")"}`;
                this.mathmlFormat = (arg) => `<apply><factorial/>${arg}</apply>`;
                break;
            default:
                this.latexFormat = this.pythonFormat = this.mathmlFormat = this.mhchemFormat = (arg) => arg + this.operation;
        }

        // TODO review this docking list
        this.docksTo = ['exponent', 'operator', 'chemical_element', 'state_symbol', 'particle', 'operator_brackets', 'differential', 'top-left', 'bottom-left'];
    }

    get typeAsString(): string {
        return 'UnaryOperation';
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     * A Symbol has three docking points:
     *
     * - _right_: Binary operation (addition, subtraction), Symbol (multiplication)
     * - _superscript_: Exponent (FIXME not implemented because it could be tricky)
     * - _argument_: Argument (duh?)
     */
    generateDockingPoints() {
        let box = this.boundingBox();

        this.dockingPoints["argument"] = new DockingPoint(this, this.p.createVector(-this.s.xBox.w/3, -this.s.xBox.h/2), 1, ["symbol", "differential"], "argument");
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * this.s.mBox.w/4 + this.scale * 20, -this.s.xBox.h/2), 1, ["operator_brackets"], "right");

        //let descent = this.position.y - (box.y + box.h);
        //this.dockingPoints["superscript"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * 20, -(box.h + descent + this.scale * 20)), 2/3, ["exponent"], "superscript");
    }

    formatExpressionAs(format: string): string {
        // TODO Triple check
        let expression = "";
        if (format == "latex" || format == "mhchem") { // TODO make an actual case for mhchem?
            if (this.dockingPoints['argument'].child) {
                expression += this.dockingPoints['argument'].child.formatExpressionAs(format);
                if (this.dockingPoints['superscript'] && this.dockingPoints['superscript'].child) {
                    expression = "(" + expression + ")" + '^{' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + '}';
                }
                if (this.dockingPoints['argument'].child instanceof Brackets) {
                    expression = this.latexFormat(expression);
                } else {
                    expression = this.latexFormat("\\left(" + expression + "\\right)");
                }
            } else {
                expression += this.latexFormat("");
            }
            if (this.dockingPoints['right'].child) {
                expression += this.dockingPoints['right'].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            if (this.dockingPoints['argument'].child) {
                expression += this.dockingPoints['argument'].child.formatExpressionAs(format);
                if (this.dockingPoints['superscript'] && this.dockingPoints['superscript'].child) {
                    expression = "(" + expression + ")" + "**(" + this.dockingPoints['superscript'].child.formatExpressionAs(format) + ")";
                }
                expression = this.pythonFormat(expression);
            } else {
                expression += this.pythonFormat("");
            }
            let rightChild = this.dockingPoints["right"].child;
            if (rightChild != null) {
                if (rightChild instanceof BinaryOperation || rightChild instanceof LogicBinaryOperation || rightChild instanceof Relation) {
                    expression += rightChild.formatExpressionAs(format);
                } else {
                    expression += " * " + rightChild.formatExpressionAs(format);
                }
            }
        } else if (format == "subscript") {
            expression += "{FACTORIAL}";
        } else if (format == 'mathml') {
            if (this.dockingPoints['argument'].child) {
                expression = '<mrow>' + this.dockingPoints['argument'].child.formatExpressionAs(format) + '</mrow>';
                if (this.dockingPoints['superscript'] && this.dockingPoints['superscript'].child != null) {
                    expression = '<msup><mfenced open="(" close=")">' + expression + '</mfenced><mrow>' + this.dockingPoints['superscript'].child.formatExpressionAs(format) + '</mrow></msup>';
                }
                expression = this.mathmlFormat(expression);
            }
            if (this.dockingPoints['right'].child) {
                expression += this.dockingPoints['right'].child.formatExpressionAs(format);
            }
        }
        return expression;
    }

    properties(): Object {
        return {
            type: this.type,
            operation: this.operation
        };
    }

    token(): string {
        return this.operation;
    }

    _draw(): void {
        let box = this.boundingBox();

        this.p.fill(this.color).noStroke().strokeJoin(this.p.ROUND);

        // FIXME Consolidate this with the _drawBracketsInBox(Rect) function in Fn
        let m = Math.sqrt(Math.max(1, box.h / this.s.mBox.h));
        let a = m * this.s.baseFontSize/5;
        let b = m * (3+this.s.baseFontSize)/5;
        let c = Math.sqrt(4 * m + 1);

        const operatorBox = this.s.font_up.textBounds(this.operation, 0, 0, this.scale * this.s.baseFontSize) as Rect;
        const bracketBoxRight = box.w/2 - operatorBox.w*2;

        this.p.beginShape();
        this.p.vertex(      box.x + b, -box.h/2 + m);
        this.p.bezierVertex(box.x + c, -box.h/2 + a,
            box.x + c,  box.h/2 - a,
            box.x + b,  box.h/2 - m);
        this.p.vertex(      box.x + a,  box.h/2);
        this.p.bezierVertex(box.x - c,  box.h/2 - a,
            box.x - c, -box.h/2 + a,
            box.x + a, -box.h/2);
        this.p.endShape();

        // RHS
        this.p.beginShape();
        this.p.vertex(      bracketBoxRight - b, -box.h/2 + m);
        this.p.bezierVertex(bracketBoxRight - c, -box.h/2 + a,
            bracketBoxRight - c,  box.h/2 - a,
            bracketBoxRight - b,  box.h/2 - m);
        this.p.vertex(      bracketBoxRight - a,  box.h/2);
        this.p.bezierVertex(bracketBoxRight + c,  box.h/2 - a,
            bracketBoxRight + c, -box.h/2 + a,
            bracketBoxRight - a, -box.h/2);
        this.p.endShape();

        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.operation, box.w/2 /*+ this.s.baseDockingPointSize + operatorBox.w/2*/, box.y + box.h/2 + operatorBox.h/2 - 6); //  - box.h/2 + operatorBox.h/2

        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        // The following cast is OK because x, y, w, and h are present in the returned object...
        let box = this.s.font_up.textBounds("()!", 0, 0, this.scale * this.s.baseFontSize) as Rect;

        let width = box.w + this._argumentBox.w;
        let height = Math.max(box.h, this._argumentBox.h);

        return new Rect(-width/2, -height/2, width, height);
    }

    get _argumentBox(): Rect {
        if (this.dockingPoints["argument"] && this.dockingPoints["argument"].child) {
            return this.dockingPoints["argument"].child.subtreeDockingPointsBoundingBox;
        } else {
            return new Rect(0, 0, this.s.baseDockingPointSize, 0);
        }
    }

    _shakeIt() {
        this._shakeItDown();

        let thisBox = this.boundingBox();

        if (this.dockingPoints["argument"]) {
            let dp = this.dockingPoints["argument"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = this.boundingBox().x + child.leftBound + dp.size;
                child.position.y = -child.dockingPoint.y;
            } else {
                dp.position.x = -this.s.xBox.w/4;
                dp.position.y = 0;
            }
        }

        //let superscriptWidth = 0;
        // if (this.dockingPoints["superscript"]) {
        //     let dp = this.dockingPoints["superscript"];
        //     if (dp.child) {
        //         let child = dp.child;
        //         child.position.x = thisBox.x + thisBox.w + child.leftBound;
        //         child.position.y = -(thisBox.h + child.subtreeBoundingBox.h)/2 + dp.size;
        //         superscriptWidth = child.subtreeDockingPointsBoundingBox.w;
        //     } else {
        //         dp.position.x = (thisBox.w + dp.size)/2;
        //         dp.position.y = -thisBox.h/2;
        //         superscriptWidth = dp.size;
        //     }
        // }

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + dp.size + child.leftBound;
                child.position.y = -child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size*1.5;
                dp.position.y = 0;
            }
        }
    }

}