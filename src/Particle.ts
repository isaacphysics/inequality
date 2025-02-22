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

import { Widget, Rect } from './Widget'
import { BinaryOperation } from "./BinaryOperation";
import { DockingPoint } from "./DockingPoint";
import { Relation } from "./Relation";
import { isDefined } from "./utils";
import { Inequality } from "./Inequality";

/** A class for representing particles. */
export
    class Particle extends Widget {

    protected type: string;
    protected pythonSymbol: string;
    protected latexSymbol: string;
    protected particle: string;
    protected mhchemSymbol: string;

    properties(): Object {
        return {
            particle: this.particle,
            type: this.type
        };
    }

    token(): string {
        return this.type;
    }

    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, -this.scale*this.s.xBox.h/2);
    }

    constructor(p: p5, s: Inequality, particle: string, type: string) {
        super(p, s);
        this.type = type;

        switch (type) {
            case 'alpha':
                this.particle = 'α';
                this.pythonSymbol = '\\alpha';
                this.mhchemSymbol = '\\alphaparticle';
                this.latexSymbol = '\\alpha';
                break;
            case 'beta':
                this.particle = 'β';
                this.pythonSymbol = '\\beta';
                this.mhchemSymbol = '\\betaparticle';
                this.latexSymbol = '\\beta';
                break;
            case 'gamma':
                this.particle = 'γ';
                this.pythonSymbol = '\\gamma';
                this.mhchemSymbol = '\\gammaray';
                this.latexSymbol = '\\gamma';
                break;
            case 'neutrino':
                this.particle = 'ν';
                this.pythonSymbol = '\\neutrino';
                this.mhchemSymbol = '\\neutrino';
                this.latexSymbol = '\\nu';
                break;
            case 'antineutrino':
                // It's better to use the Unicode escape sequence
                this.particle = 'ν\u0305';
                this.pythonSymbol = '\\antineutrino';
                this.mhchemSymbol = '\\antineutrino';
                this.latexSymbol = '\\bar{\\nu}';
                break;
            case 'p':
            case 'proton':
                this.particle = 'p';
                this.pythonSymbol = '\\proton';
                this.mhchemSymbol = '\\proton';
                this.latexSymbol = '\\text{p}';
                break;
            case 'n':
            case 'neutron':
                this.particle = 'n';
                this.pythonSymbol = '\\neutron';
                this.mhchemSymbol = '\\neutron';
                this.latexSymbol = '\\text{n}';
                break;
            case 'e':
            case 'electron':
                this.particle = 'e';
                this.pythonSymbol = '\\electron';
                this.mhchemSymbol = 'e';
                this.latexSymbol = '\\text{e}';
                break;
            default:
                this.particle = particle;
                this.pythonSymbol = particle;
                this.latexSymbol = particle;
                this.mhchemSymbol = particle;
        }
        this.docksTo = ['operator', 'relation', 'symbol'];
    }

    get typeAsString(): string {
        return 'Particle';
    }

    generateDockingPoints() {
        let box = this.boundingBox();
        let descent = this.position.y - (box.y + box.h);

        // Create the docking points - added mass number and proton number
        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.s.mBox.w/4, -this.s.xBox.h/2), 1, ["particle"], "right");
        this.dockingPoints["superscript"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * 20, -this.scale * this.s.mBox.h), 2/3, ["exponent"], "superscript");
        this.dockingPoints["subscript"] = new DockingPoint(this, this.p.createVector(box.w/2 + this.scale * 20, descent), 2/3, ["subscript"], "subscript");
        if (this.s.editorMode === "nuclear") {
            this.dockingPoints["mass_number"] = new DockingPoint(this, this.p.createVector(0, 0), 2/3, ["top-left"], "mass_number");
            this.dockingPoints["proton_number"] = new DockingPoint(this, this.p.createVector(0, 0), 2/3, ["bottom-left"], "proton_number");
        }
    }

    formatExpressionAs(format: string): string {
        let expression = "";
        if (format == "latex") {
            expression = this.latexSymbol;
            //  KaTeX doesn't support the mhchem package so padding is used to align proton number correctly.
            if (this.s.editorMode === "nuclear") {
                if (this.dockingPoints["mass_number"].child != null && this.dockingPoints["proton_number"].child != null) {
                    expression = "";
                    let mass_number_length = this.dockingPoints["mass_number"].child.formatExpressionAs(format).length;
                    let proton_number_length = this.dockingPoints["proton_number"].child.formatExpressionAs(format).length;
                    let number_of_spaces = Math.abs(proton_number_length - mass_number_length);
                    let padding = "";
                    // Temporary hack to align mass number and proton number correctly.
                    for (let _i = 0; _i < number_of_spaces; _i++) {
                        padding += "\\enspace";
                    }
                    expression += (mass_number_length <= proton_number_length) ? "{}^{" + padding + this.dockingPoints["mass_number"].child.formatExpressionAs(format) + "}_{" + this.dockingPoints["proton_number"].child.formatExpressionAs(format) + "}" + this.latexSymbol : 
                                                                                 "{}^{" + this.dockingPoints["mass_number"].child.formatExpressionAs(format) + "}_{" + padding + this.dockingPoints["proton_number"].child.formatExpressionAs(format) + "}" + this.latexSymbol;
                } else if (this.dockingPoints["mass_number"].child != null) {
                    expression = "";
                    expression += "{}^{" + this.dockingPoints["mass_number"].child.formatExpressionAs(format) + "}_{}" + this.latexSymbol;
                } else if (this.dockingPoints["proton_number"].child != null) {
                    expression = "";
                    expression += "{}^{}_{" + this.dockingPoints["proton_number"].child.formatExpressionAs(format) + "}" + this.latexSymbol;
                }
            }

            if (this.dockingPoints["subscript"].child != null) {
                expression += "_{" + this.dockingPoints["subscript"].child.formatExpressionAs(format) + "}";
            }
            if (this.dockingPoints["superscript"].child != null) {
                expression += "^{" + this.dockingPoints["superscript"].child.formatExpressionAs(format) + "}";
            }
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof BinaryOperation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                }
                else if (this.dockingPoints["right"].child instanceof Relation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    // WARNING This assumes it's a ChemicalElement, hence produces a "multiplication"
                    expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        } else if (format == "subscript") {
            if (this.dockingPoints["subscript"].child != null) {
                expression += this.dockingPoints["subscript"].child.formatExpressionAs(format);
            }
            if (this.dockingPoints["superscript"].child != null) {
                expression += this.dockingPoints["superscript"].child.formatExpressionAs(format);
            }
            if (this.dockingPoints["right"].child != null) {
                expression += this.dockingPoints["right"].child.formatExpressionAs(format);
            }
        } else if (format == "python") {
            expression = "";
        } else if (format == "mathml") {
            expression = '';
        } else if (format == "mhchem") {
            expression = this.mhchemSymbol;
            if (this.s.editorMode === "nuclear") {
                if (this.dockingPoints["mass_number"].child != null && this.dockingPoints["proton_number"].child != null) {
                    expression = "";
                    expression += "{}^{" + this.dockingPoints["mass_number"].child.formatExpressionAs(format) + "}_{" + this.dockingPoints["proton_number"].child.formatExpressionAs(format) + "}" + this.mhchemSymbol;
                } else if (this.dockingPoints["mass_number"].child != null) {
                    expression = "";
                    expression += "{}^{" + this.dockingPoints["mass_number"].child.formatExpressionAs(format) + "}_{}" + this.mhchemSymbol;
                } else if (this.dockingPoints["proton_number"].child != null) {
                    expression = "";
                    expression += "{}^{}_{" + this.dockingPoints["proton_number"].child.formatExpressionAs(format) + "}" + this.mhchemSymbol;
                }
            }
            if (this.dockingPoints["subscript"].child != null) {
                expression += this.dockingPoints["subscript"].child.formatExpressionAs(format);
            }
            if (this.dockingPoints["superscript"].child != null) {
                expression += "^{" + this.dockingPoints["superscript"].child.formatExpressionAs(format) + "}";
            }
            if (this.dockingPoints["right"].child != null) {
                if (this.dockingPoints["right"].child instanceof BinaryOperation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                }
                else if (this.dockingPoints["right"].child instanceof Relation) {
                    expression += this.dockingPoints["right"].child.formatExpressionAs(format);
                } else {
                    // WARNING This assumes it's a ChemicalElement, hence produces a multiplication
                    expression += " " + this.dockingPoints["right"].child.formatExpressionAs(format);
                }
            }
        }
        return expression;
    }

    _draw(): void {
        this.p.fill(this.color).strokeWeight(0).noStroke();

        this.p.textFont(this.s.font_up)
            .textSize(this.s.baseFontSize * this.scale)
            .textAlign(this.p.CENTER, this.p.BASELINE)
            .text(this.particle, 0, 0);
        this.p.strokeWeight(1);
    }

    boundingBox(): Rect {
        // The following casts are OK because x, y, w, and h are present in the returned object...
        if (this.mhchemSymbol == '\\antineutrino') {
            // FIXME The unicode combining overline makes things a bit weird here. This approximation is good enough, though.
            const box = this.s.font_it.textBounds("h", 0, 0, this.s.baseFontSize) as Rect;
            return new Rect(-box.w/2, box.y, box.w, box.h);
        } else {
            const box = this.s.font_it.textBounds(this.particle || "x", 0, 0, this.s.baseFontSize) as Rect;
            return new Rect(-box.w/2, box.y, box.w, box.h);
        }
    }

    _shakeIt(): void {
        // This is how Chemistry/(Nuclear Physics) works:
        // ----------------------------------------------
        //   (mass_number)       superscript
        //                Element            right
        // (proton_number)       subscript

        this._shakeItDown();
        let thisBox = this.boundingBox();

        if (this.dockingPoints["mass_number"]) {
            let dp = this.dockingPoints["mass_number"];
            if (dp.child) {
                let child = dp.child;
                // FIXME The commented variant is horrible with regard to spacing.
                // FIXME The issue is likely to go away once I rewrite the docking code, if I can make the flexible spacing thing work.
                // FIXME I'm keeping it like this for now because it's easier on the eyes.
                // child.position.x = thisBox.x + child.rightBound;
                child.position.x = thisBox.x + child.rightBound + child.subtreeDockingPointsBoundingBox.w - child.subtreeBoundingBox.w;
                child.position.y = -this.scale*this.s.xBox.h - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
            } else {
                dp.position.x = thisBox.x - dp.size/2;
                dp.position.y = (-this.scale * this.s.mBox.h);
            }
        }

        if (this.dockingPoints["proton_number"]) {
            let dp = this.dockingPoints["proton_number"];
            if (dp.child) {
                let child = dp.child;
                // FIXME The commented variant is horrible with regard to spacing.
                // FIXME The issue is likely to go away once I rewrite the docking code, if I can make the flexible spacing thing work.
                // FIXME I'm keeping it like this for now because it's easier on the eyes.
                // child.position.x = thisBox.x + child.rightBound;
                child.position.x = thisBox.x + child.rightBound + child.subtreeDockingPointsBoundingBox.w - child.subtreeBoundingBox.w;
                child.position.y = child.topBound;
            } else {
                dp.position.x = thisBox.x - dp.size/2;
                dp.position.y = 0;
            }
        }

        let superscriptWidth = 0;
        if (this.dockingPoints["superscript"]) {
            let dp = this.dockingPoints["superscript"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + child.scale*dp.size/2;
                child.position.y = -this.scale*this.s.xBox.h - (child.subtreeDockingPointsBoundingBox.y + child.subtreeDockingPointsBoundingBox.h);
                superscriptWidth = Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size/2;
                dp.position.y = -this.scale * this.s.mBox.h;
                superscriptWidth = dp.size;
            }
        }

        let subscriptWidth = 0;
        if (this.dockingPoints["subscript"]) {
            let dp = this.dockingPoints["subscript"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + child.scale*dp.size/2;
                child.position.y = child.topBound;
                subscriptWidth = Math.max(dp.size, child.subtreeDockingPointsBoundingBox.w);
            } else {
                dp.position.x = thisBox.x + thisBox.w + dp.size/2;
                dp.position.y = 0;
                subscriptWidth = dp.size;
            }
        }

        if (this.dockingPoints["right"]) {
            let dp = this.dockingPoints["right"];
            if (dp.child) {
                let child = dp.child;
                child.position.x = thisBox.x + thisBox.w + child.leftBound + Math.max(superscriptWidth, subscriptWidth) + dp.size/2;
                child.position.y = this.dockingPoint.y - child.dockingPoint.y;
            } else {
                dp.position.x = thisBox.x + thisBox.w + Math.max(superscriptWidth, subscriptWidth) + dp.size;
                dp.position.y = -this.scale*this.s.xBox.h/2;
            }
        }
    }

    get children(): Array<Widget> {
        return Object.entries(this.dockingPoints).filter(e => e[0] !== 'subscript' && isDefined(e[1])).map(e => e[1].child).filter(w => isDefined(w)) as Array<Widget>;
    }
}
