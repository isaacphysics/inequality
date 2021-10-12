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

/* tslint:disable: no-unused-variable */
/* tslint:disable: comment-format */

import p5 from "p5";
import _intersection = require('lodash/intersection');
import { isDefined } from "./utils";

import { Widget, Rect, WidgetSpec } from './Widget'
import { Symbol } from './Symbol'
import { BinaryOperation } from './BinaryOperation';
import { Fraction } from './Fraction';
import { Brackets } from './Brackets';
import { AbsoluteValue } from './AbsoluteValue';
import { Radix } from './Radix';
import { Num } from './Num';
import { Fn } from './Fn';
import { Differential } from './Differential';
import { Derivative } from './Derivative';
import { DockingPoint } from './DockingPoint';
import { Relation } from './Relation';
import { ChemicalElement } from './ChemicalElement';
import { StateSymbol } from './StateSymbol';
import { Particle } from './Particle';
import { LogicBinaryOperation } from './LogicBinaryOperation';
import { LogicLiteral } from './LogicLiteral';
import { LogicNot } from './LogicNot';

// This is the "main" app with the update/render loop and all that jazz.
export
    class Inequality {
    symbols: Array<Widget> = [];
    movingSymbol?: Nullable<Widget>;
    potentialSymbol?: Nullable<Widget>;
    initialTouch?: Nullable<p5.Vector>;
    prevTouch?: Nullable<p5.Vector>;

    xBox?: Nullable<Rect>;
    get xBox_w(): number {
        return this.xBox?.w ?? 0;
    }
    get xBox_h(): number {
        return this.xBox?.h ?? 0;
    }
    mBox?: Nullable<Rect>;
    get mBox_w(): number {
        return this.mBox?.w ?? 0;
    }
    get mBox_h(): number {
        return this.mBox?.h ?? 0;
    }

    baseFontSize = 50;
    baseDockingPointSize = this.baseFontSize/3;

    changeBaseFontSizeBy = (amount: number) => {
        if (this.baseFontSize + amount > 0) {
            this.baseFontSize += amount;
            this.updateLetterBoxes();
        }
    };

    changeBaseDockingPointSizeBy = (amount: number) => {
        if (this.baseDockingPointSize + amount/3 > 0) {
            this.baseDockingPointSize += amount/3;
            this.updateLetterBoxes();
        }
    };

    font_it?: Nullable<p5.Font>;
    font_up?: Nullable<p5.Font>;

    visibleDockingPointTypes: Array<string> = [];
    activeDockingPoint?: Nullable<DockingPoint>;
    private _canvasDockingPoints: Array<DockingPoint> = [];

    logicSyntax?: Nullable<string> = null;

    // There are more properties, but these are the only ones required from within TS
    // TODO: Create a better specified object.
    log: Nullable<{ initialState: Array<Object>, actions: Array<Object> }>;

    public editorMode: string;
    public textEntry: boolean;
    private fontItalicPath: string;
    private fontRegularPath: string;

    constructor(
        private p: p5,
        private width: number,
        private height: number,
        private initialSymbolsToParse: Array<WidgetSpec>,
        {
            editorMode = "math",
            logicSyntax = "logic",
            textEntry = false,
            fontItalicPath = '',
            fontRegularPath = ''
        } = {}
    ) {
        this.p.preload = this.preload;
        this.p.setup = this.setup;
        this.p.draw = this.draw;
        this.p.touchStarted = this.touchStarted;
        this.p.mousePressed = this.touchStarted;
        this.p.touchMoved = this.touchMoved;
        this.p.mouseMoved = this.mouseMoved;
        this.p.touchEnded = this.touchEnded;
        this.p.mouseReleased = this.touchEnded;
        this.p.windowResized = this.windowResized;

        this.editorMode = editorMode;
        this.logicSyntax = logicSyntax;
        this.textEntry = textEntry;
        this.fontItalicPath = fontItalicPath;
        this.fontRegularPath = fontRegularPath;
    }

    preload = () => {
        this.font_it = this.p.loadFont(this.fontItalicPath);
        this.font_up = this.p.loadFont(this.fontRegularPath);
    };

    loadTestCase = (s: Array<WidgetSpec>) => {
        this.symbols = [];
        this.initialSymbolsToParse = s;
        try {
            if (!Array.isArray(this.initialSymbolsToParse)) {
                throw "Initial symbols must be an array, got " + this.initialSymbolsToParse + " instead";
            }
            for (const w of this.initialSymbolsToParse) {
                this.parseSubtreeObject(w);
            }
        } catch (e) {
            console.warn("Failed to load test case.", e);
        }

        this.centre(true);

        if (!isDefined(this.textEntry) && isDefined(this.log)) {
            this.log.initialState = [];
            
            for (let symbol of this.symbols) {
                this.log.initialState.push(symbol.subtreeObject(true, true));
            };
        }
        this.updateCanvasDockingPoints();
    };

    updateLetterBoxes = () => {
        if (!isDefined(this.font_it)) return;
        this.xBox = Rect.fromObject(this.font_it.textBounds("x", 0, 0, this.baseFontSize));
        this.mBox = Rect.fromObject(this.font_it.textBounds("M", 0, 0, this.baseFontSize));
    };

    setup = () => {
        this.p.frameRate(7);

        this.logicSyntax = this.logicSyntax;

        switch (this.editorMode) {
            case 'maths':
            case 'logic':
                this.baseFontSize = 50;
                this.baseDockingPointSize = 50/3;
                break;
            case 'chemistry':
                this.baseFontSize = 50;
                this.baseDockingPointSize = 30/3;
                break;
        }

        this.updateLetterBoxes();

        this.symbols = [];

        this.p.createCanvas(this.width, this.height);

        this.prevTouch = this.p.createVector(0, 0);

        try {
            if (!Array.isArray(this.initialSymbolsToParse)) {
                throw "Initial symbols must be an array, got " + this.initialSymbolsToParse + " instead";
            }
            for (const s of this.initialSymbolsToParse) {
                this.parseSubtreeObject(s);
            };
        } catch (e) {
            console.warn("Failed to load previous answer. Perhaps it was built with the old equation editor?", e);
        }
        this.centre(true);
        if (!isDefined(this.textEntry) && isDefined(this.log)) {
            this.log.initialState = [];

            for (let symbol of this.symbols) {
                this.log.initialState.push(symbol.subtreeObject(true, true));
            };
        }
        this.updateCanvasDockingPoints();
    }

    windowResized = () => {
        this.p.resizeCanvas(this.p.windowWidth * Math.ceil(window.devicePixelRatio), this.p.windowHeight * Math.ceil(window.devicePixelRatio));
    };

    draw = () => {
        if (!isDefined(this.p)) return;
        
        this.p.clear();
        for (const symbol of this.symbols) {
            symbol.shakeIt();
            symbol.draw(symbol === this.movingSymbol);
        };

        if (isDefined(this.potentialSymbol)) {
            this.potentialSymbol.draw(true);
        }
    };

    updateCanvasDockingPoints = () => {
        this._canvasDockingPoints = [];
        // We need a copy of this.symbols because assignment is done by reference because
        //     let a = this.symbols; a.shift();
        // destroys this.symbols.
        let q = this.symbols.filter(w => w !== this.movingSymbol);
        while (q.length > 0) {
            let widget = q.shift() as Widget;
            for (let e in widget.dockingPoints) {
                let dockingPoint = widget.dockingPoints[e];
                if (dockingPoint.child) {
                    q.push(dockingPoint.child)
                } else {
                    this._canvasDockingPoints.push(dockingPoint);
                }
            }
        }
    };

    findClosestDockingPoint = (testPoint: p5.Vector): Nullable<DockingPoint> => {
        let minDistance = Infinity;
        let candidateDockingPoint: Nullable<DockingPoint>;
        let availablePoints = this._canvasDockingPoints.filter((e: DockingPoint) => {
            return _intersection(this.visibleDockingPointTypes, e.type).length > 0;
        });
        for (let dockingPoint of availablePoints) {
            let d = testPoint.dist(dockingPoint.absolutePosition);
            if (d < minDistance) {
                minDistance = d;
                candidateDockingPoint = dockingPoint;
            }
        }
        // TODO Fiddle with this parameter to find the optimal value.
        return minDistance <= this.baseFontSize*1.5 ? candidateDockingPoint : null;
    };

    updatePotentialSymbol = (spec: Nullable<WidgetSpec> = null, x?: Nullable<number>, y?: Nullable<number>) => {
        // NB: This logic requires spec to be briefly set to null when switching between potential symbol types.
        if (isDefined(spec)) {
            if (!isDefined(this.potentialSymbol)) {
                this.potentialSymbol = this._parseSubtreeObject(spec);
                if (isDefined(this.potentialSymbol)) {
                    this.log?.actions.push({
                        event: "DRAG_POTENTIAL_SYMBOL",
                        symbol: this.potentialSymbol.subtreeObject(false, true, true),
                        timestamp: Date.now()
                    });
                }
            }
            
            if (isDefined(this.potentialSymbol)) {
                this.visibleDockingPointTypes = this.potentialSymbol.docksTo;
                this.potentialSymbol.position.x = (x ?? 0) - this.potentialSymbol.boundingBox().w * 0.5;
                this.potentialSymbol.position.y = (y ?? 0);
                this.potentialSymbol.shakeIt();

                // Decide whether we should dock immediately
                this.symbols.some((symbol: Widget) => {
                    this.activeDockingPoint = null;

                    symbol.highlight(false);
                    symbol.contractDockingPoints();
                    if (isDefined(this.potentialSymbol)) {
                        if (this.activeDockingPoint = this.findClosestDockingPoint(this.p.createVector(this.potentialSymbol.position.x, this.potentialSymbol.position.y))) {
                            this.activeDockingPoint.widget.highlight(true);
                            this.activeDockingPoint.widget.expandDockingPoints();
                            return true;
                        }
                    }
                    symbol.shakeIt();
                });
            }

        } else {
            this.potentialSymbol = null;
            this.visibleDockingPointTypes = [];
        }
    };

    commitPotentialSymbol = () => {
        // Make sure we have an active docking point, and that the moving symbol can dock to it.
        if (isDefined(this.potentialSymbol) && this.activeDockingPoint != null && _intersection(this.potentialSymbol.docksTo, this.activeDockingPoint.type).length > 0) {
            this.activeDockingPoint.child = this.potentialSymbol;
            this.log?.actions.push({
                event: "DOCK_POTENTIAL_SYMBOL",
                symbol: this.potentialSymbol.subtreeObject(false, true, true),
                parent: this.potentialSymbol.parentWidget?.subtreeObject(false, true, true),
                dockingPoint: this.activeDockingPoint.name,
                timestamp: Date.now()
            });
        } else if (isDefined(this.potentialSymbol)) {
            this.symbols.push(this.potentialSymbol);
            this.log?.actions.push({
                event: "DROP_POTENTIAL_SYMBOL",
                symbol: this.potentialSymbol.subtreeObject(false, true, true),
                timestamp: Date.now()
            });
        }
        this.updatePotentialSymbol(null);
        this.updateState();
        this.activeDockingPoint = null;
        this.updateCanvasDockingPoints();

        this.p.frameRate(7);
    };

    abortPotentialSymbol = () => {
        this.log?.actions.push({
            event: "TRASH_SYMBOL",
            symbol: this.potentialSymbol?.subtreeObject(false, true, true),
            timestamp: Date.now()
        });
        this.activeDockingPoint = null;
        this.symbols = this.symbols.filter(w => w !== this.movingSymbol)
        this.updatePotentialSymbol(null);
        this.updateCanvasDockingPoints();

        this.p.frameRate(7);
    };

    parseSubtreeObject = (root: { type: string, properties: any, position?: { x: number, y: number } }, clearExistingSymbols = false, fromTextEntry = false, withUserInput = '') => {
        if (isDefined(root)) {
            if (isDefined(clearExistingSymbols) && isDefined(this.symbols) && this.symbols.length > 0) {
                this.symbols.length = 0;
            }
            let w = this._parseSubtreeObject(root);
            if (isDefined(w)) {
                w.position.x = root.position?.x ?? 0;
                w.position.y = root.position?.y ?? 0;
                this.symbols.push(w);
                this.updateCanvasDockingPoints();
                w.shakeIt();
            }
        }
        this.updateState(fromTextEntry, withUserInput);
    };

    _parseSubtreeObject = (node: WidgetSpec, parseChildren = true): Nullable<Widget> => {
        let w: Nullable<Widget>;
        switch (node.type) {
            case "Symbol":
                w = new Symbol(this.p, this, node.properties.letter, node.properties.modifier);
                break;
            case "BinaryOperation":
                w = new BinaryOperation(this.p, this, node.properties.operation);
                break;
            case "Fraction":
                w = new Fraction(this.p, this);
                break;
            case "Brackets":
                w = new Brackets(this.p, this, node.properties.type, node.properties.mode);
                break;
            case "AbsoluteValue":
                w = new AbsoluteValue(this.p, this);
                break;
            case "Radix":
                w = new Radix(this.p, this);
                break;
            case "Num":
                w = new Num(this.p, this, node.properties.significand, node.properties.exponent);
                break;
            case "Fn":
                w = new Fn(this.p, this, node.properties.name, node.properties.custom, node.properties.allowSubscript, node.properties.innerSuperscript);
                break;
            case "Differential":
                w = new Differential(this.p, this, node.properties.letter);
                break;
            case "Derivative":
                w = new Derivative(this.p, this);
                break;
            case "Relation":
                w = new Relation(this.p, this, node.properties.relation);
                break;
            case "StateSymbol":
                w = new StateSymbol(this.p, this, node.properties.state);
                break;
            case "ChemicalElement":
                w = new ChemicalElement(this.p, this, node.properties.element);
                break;
            case "Particle":
                w = new Particle(this.p, this, node.properties.particle, node.properties.type);
                break;
            case "LogicBinaryOperation":
                w = new LogicBinaryOperation(this.p, this, node.properties.operation);
                break;
            case "LogicLiteral":
                w = new LogicLiteral(this.p, this, node.properties.value);
                break;
            case "LogicNot":
                w = new LogicNot(this.p, this);
                break;
            default: // this would be a Widget...
                break;
        }

        if (isDefined(w) && parseChildren && isDefined(node.children)) {
            for (const key in node.children) {
                const n = node.children[key];
                w.dockingPoints[key].child = this._parseSubtreeObject(n);
            }
        }

        return w;
    };

    // Executive (and possibly temporary) decision: we are moving one symbol at a time (meaning: no multi-touch)
    // Native ptouchX and ptouchY are not accurate because they are based on the "previous frame".
    touchStarted = () => {
        if (this.textEntry) return;

        this.p.frameRate(60);
        // These are used to correctly detect clicks and taps.

        // Note that touchX and touchY are incorrect when using touch. Ironically.
        let tx = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).x : this.p.mouseX;
        let ty = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).y : this.p.mouseY;

        this.initialTouch = this.p.createVector(tx, ty);

        this.movingSymbol = null;
        let index = -1;
        let movingSymbolDocksTo: Array<string> = [];
        this.symbols.some((symbol, i) => {
            // .hit() propagates down the hierarchy
            let hitSymbol = symbol.hit(this.p.createVector(tx, ty));
            if (hitSymbol != null && hitSymbol.isDetachable) {
                // If we hit that symbol, then mark it as moving
                this.movingSymbol = hitSymbol;
                this.log?.actions.push({
                    event: "DRAG_START",
                    symbol: this.movingSymbol.subtreeObject(false, true, true),
                    timestamp: Date.now()
                });
                index = i;
                this.prevTouch = this.p.createVector(tx, ty);

                // Remove symbol from the hierarchy, place it back with the roots.
                if (hitSymbol.parentWidget != null) {
                    this.symbols.push(hitSymbol);
                    // Update the list of free docking points
                    this.updateCanvasDockingPoints();

                    hitSymbol.scale = 1.0;
                    hitSymbol.position = hitSymbol.absolutePosition;
                    hitSymbol.removeFromParent();
                }

                // Get the points it docks to, we'll use them later
                movingSymbolDocksTo = this.movingSymbol.docksTo;

                // Array.some requires this to break out of the loop.
                return true;
            }
        });

        // Put the moving symbol on top (bottom?) of the list (this only works with roots,
        // and may not be necessary at all, but eye candy, right?)
        if (index > -1) {
            let e = this.symbols.splice(index, 1)[0];
            this.symbols.push(e);
            this.updateCanvasDockingPoints();
            index = -1;
        }

        // Tell the other symbols to show only these points. Achievement unlocked: Usability!
        this.visibleDockingPointTypes = movingSymbolDocksTo;

        // Trigger visibility attribute. TODO: We may want to rely on this in the future.
        for (let dp of this._canvasDockingPoints) {
            dp.isVisible = _intersection(this.visibleDockingPointTypes, dp.type).length > 0;
        }
        for (let symbol of this.symbols) {
            symbol.shakeIt();
        }

        // FIXME if you can. This is quite the hack.
        this.touchMoved();
    };

    touchMoved = () => {
        if (this.textEntry) return;

        let tx = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).x : this.p.mouseX;
        let ty = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).y : this.p.mouseY;

        if (isDefined(this.movingSymbol) && isDefined(this.prevTouch)) {
            let d = this.p.createVector(tx - this.prevTouch.x, ty - this.prevTouch.y);

            // TODO NOT DELETE the following commented section.
            // let sbox = this.movingSymbol.subtreeBoundingBox;
            // let spos = this.movingSymbol.absolutePosition;
            // let dx = this.p.touchX - this.prevTouch.x;
            // let dy = this.p.touchY - this.prevTouch.y;
            // let left =   spos.x + sbox.x;
            // let right =  spos.x + sbox.x + sbox.w;
            // let top =    spos.y + sbox.y;
            // let bottom = spos.y + sbox.y + sbox.h;
            //
            // if ((dx < 0 && left <= 0) || (dx > 0 && right >= this.width)) {
            // 	dx = 0;
            // }
            // if ((dy < 0 && top <= 0) || (dy > 0 && bottom >= this.height)) {
            // 	dy = 0;
            // }
            // let d = this.p.createVector(dx, dy);

            this.movingSymbol.position.add(d);
            // FIXME GO AHEAD PUNK, MAKE MY DAY
            this.prevTouch.x = tx;
            this.prevTouch.y = ty;

            // Check if we are moving close to a docking point, and highlight it even more.
            this.symbols.some((symbol: Widget) => {
                this.activeDockingPoint = null;

                // This is the point where the mouse/touch is.
                // let touchPoint = this.p.createVector(tx, ty);
                // This is less refined than doing the proximity detection thing, but works much better (#4)
                if (isDefined(symbol) && symbol !== this.movingSymbol) {
                    symbol.highlight(false);
                    symbol.contractDockingPoints();
                    if (this.activeDockingPoint = this.findClosestDockingPoint(this.p.createVector(this.p.mouseX, this.p.mouseY))) {
                        this.activeDockingPoint.widget.highlight(true);
                        return true;
                    }
                }
            });

            this.onNotifySymbolDrag(tx, ty);
        }
    };

    onCloseMenus = () => { /* Override this on the outside if needed */ };

    onNotifySymbolDrag = (x: number, y: number) => { /* Override this on the outside if needed */ };

    isUserPrivileged = () => { return false }; /* Override this on the outside if needed */

    isTrashActive = () => { return false }; /* Override this on the outside if needed */

    touchEnded = () => {
        if (this.textEntry) return;

        // TODO Maybe integrate something like the number of events or the timestamp? Timestamp would be neat.
        if (null != this.initialTouch && p5.Vector.dist(this.initialTouch, this.p.createVector(this.p.mouseX, this.p.mouseY)) < 2) {
            // Click
            // Close the menu when touching the canvas
            this.onCloseMenus();
        }
        if (this.movingSymbol != null) {
            // When touches end, mark the symbol as not moving.
            this.prevTouch = null;

            // Make sure we have an active docking point, and that the moving symbol can dock to it.
            if (this.activeDockingPoint != null && _intersection(this.movingSymbol.docksTo, this.activeDockingPoint.type).length > 0) {
                this.symbols = this.symbols.filter(w => w !== this.movingSymbol);
                this.updateCanvasDockingPoints();
                // Do the actual docking
                this.activeDockingPoint.child = this.movingSymbol;
                // Let the widget know to which docking point it is docked. This is starting to become ridiculous...
                this.activeDockingPoint.child.dockedTo = this.activeDockingPoint.name;

                this.log?.actions.push({
                    event: "DOCK_SYMBOL",
                    symbol: this.movingSymbol.subtreeObject(false, true, true),
                    parent: this.movingSymbol.parentWidget?.subtreeObject(false, true, true),
                    dockingPoint: this.activeDockingPoint.name,
                    timestamp: Date.now()
                });
            } else if (this.isTrashActive()) {
                this.log?.actions.push({
                    event: "TRASH_SYMBOL",
                    symbol: this.movingSymbol.subtreeObject(false, true, true),
                    timestamp: Date.now()
                });
                this.symbols = this.symbols.filter(w => w !== this.movingSymbol);
                this.updateCanvasDockingPoints();
            } else {
                this.log?.actions.push({
                    event: "DROP_SYMBOL",
                    symbol: this.movingSymbol.subtreeObject(false, true, true),
                    timestamp: Date.now()
                });
            }
            this.movingSymbol = null;    
            this.activeDockingPoint = null;
        }

        this.visibleDockingPointTypes = [];
        for (let dp of this._canvasDockingPoints) {
            dp.isVisible = false; // TODO Rely on this in the future maybe.
            dp.widget.expandDockingPoints();
        }
        // Update the list of free docking points
        this.updateCanvasDockingPoints();
        for (let symbol of this.symbols) {
            symbol.shakeIt();
        }

        this.initialTouch = null;

        let symbolWithMostChildren: Nullable<Widget> = null;
        let mostChildren = 0;
        for(const symbol of this.symbols) {
            let numChildren = symbol.totalSymbolCount;
            if (numChildren > mostChildren) {
                mostChildren = numChildren;
                symbolWithMostChildren = symbol;
            }
        }
        for (const symbol of this.symbols) {
            symbol.isMainExpression = (symbol === symbolWithMostChildren);
        }
        this.updateState();

        this.p.frameRate(7);
    };

    mouseMoved = () => {
        let p = this.p.createVector(this.p.mouseX, this.p.mouseY);
        for (const symbol of this.symbols) {
            symbol.highlight(false);
            let hitSymbol = symbol.hit(p);
            if (hitSymbol) {
                // Hey, we hit a symbol! :)
                hitSymbol.highlight(true);
            }
        }
    };

    flattenExpression = (w: Widget) => {
        let stack: Array<Widget> = [w];
        let list = [];
        while (stack.length > 0) {
            let e = stack.shift() as Widget;
            list.push(e.token());
            let children = e.children;
            stack = stack.concat(children);
        }
        return [...new Set(list)].filter(i => { return i !== ''; });
    };

    onNewEditorState = (_state: object) => {
        console.error('Unoverridden onNewEditorState called');
    }

    updateState = (fromTextEntry = false, withUserInput = '') => {
        let symbolWithMostChildren: Nullable<Widget>;
        let mostChildren = 0;
        for(const symbol of this.symbols) {
            const numChildren = symbol.totalSymbolCount;
            if (numChildren > mostChildren) {
                mostChildren = numChildren;
                symbolWithMostChildren = symbol;
            }
        };

        if (isDefined(symbolWithMostChildren)) {
            const flattenedExpression = this.flattenExpression(symbolWithMostChildren).map(e => isDefined(e) ? e.replace(/,/g, ";") : '');
            this.onNewEditorState({
                result: {
                    "tex": symbolWithMostChildren.formatExpressionAs("latex").trim(),
                    "mhchem": symbolWithMostChildren.formatExpressionAs("mhchem").trim(),
                    "python": symbolWithMostChildren.formatExpressionAs("python").trim(),
                    "mathml": '<math xmlns="http://www.w3.org/1998/Math/MathML">' + symbolWithMostChildren.formatExpressionAs("mathml").trim() + '</math>',
                    // removes everything that is not truthy, so this should avoid empty strings.
                    "uniqueSymbols": flattenedExpression.join(', '),
                },
                symbols: this.symbols.map(s => s.subtreeObject()),
                textEntry: fromTextEntry,
                userInput: withUserInput
            });
        } else {
            this.onNewEditorState({
                result: null,
                symbols: [],
                textEntry: fromTextEntry
            })
        }
    };

    centre = (init = false) => {
        let top = window.innerHeight/2;
        for (const symbol of this.symbols) {
            const sbox = symbol.subtreeDockingPointsBoundingBox;
            symbol.position = this.p.createVector(window.innerWidth/2 - sbox.center.x, top + sbox.center.y);
            top += sbox.h;
            symbol.shakeIt();
        }
        if (!init) {
            this.log?.actions.push({
                event: "CENTRE_SYMBOLS",
                timestamp: Date.now()
            });
        }
    };
}

export function makeInequality(
    element: any,
    width: number,
    height: number,
    initialSymbolsToParse: Array<{ type: string, properties: any }> = [],
    {
        editorMode = "math",
        logicSyntax = "logic",
        textEntry = false,
        fontItalicPath = '',
        fontRegularPath = ''
    } = {}) {
    let sketch: Nullable<Inequality>;
    let p = new p5((instance: p5) => {
        sketch = new Inequality(instance, width, height, initialSymbolsToParse, {
            editorMode,
            logicSyntax,
            textEntry,
            fontItalicPath,
            fontRegularPath
        });
        return sketch;
    }, element);
    return { sketch, p };
}

export { WidgetSpec } from "./Widget";