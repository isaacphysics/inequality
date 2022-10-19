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

/** This is the "main" app with the update/render loop and all. */
export
    class Inequality {
    /** Top-level symbols on the canvas. */
    private _symbols: Array<Widget> = [];

    private _movingSymbol?: Nullable<Widget>;
    /** The currently moving symbol, if any. This could also be a potential symbol if dragged from a menu. */
    get movingSymbol(): Nullable<Widget> { return this._movingSymbol }

    /** The currently moving symbol when dragged from a menu */
    private _potentialSymbol?: Nullable<Widget>;

    /** Coordinates of the first cursor point, useful to detect drags and clicks/taps. */
    private _initialTouch?: Nullable<p5.Vector>;

    /** Coordinates of the second-last cursor point during a click/touch interaction.. */
    private _prevTouch?: Nullable<p5.Vector>;

    private _xBox?: Nullable<Rect>;
    /** The bounding box of a lower-case "x" in the current font. Sorry, not a gaming console. */
    get xBox(): Rect { return this._xBox as Rect }

    private _mBox?: Nullable<Rect>;
    /** The bounding box of a lower-case "m" in the current font. */
    get mBox(): Rect { return this._mBox as Rect }

    private _baseFontSize = 50;
    /** Base font size used to draw the top-level widgets. It helps keep the sizing consistent down the AST. */
    get baseFontSize(): number { return this._baseFontSize }

    private _baseDockingPointSize = this._baseFontSize/3;
    /** Base size of the empty docking points circles. */
    get baseDockingPointSize(): number { return this._baseDockingPointSize }

    /** @experimental Helper method to implement zooming, except I don't think it ever worked... */
    changeBaseFontSizeBy = (amount: number) => {
        if (this._baseFontSize + amount > 0) {
            this._baseFontSize += amount;
            this.updateLetterBoxes();
        }
    };

    /** @experimental Helper method to implement zooming, except I don't think it ever worked... */
    changeBaseDockingPointSizeBy = (amount: number) => {
        if (this._baseDockingPointSize + amount/3 > 0) {
            this._baseDockingPointSize += amount/3;
            this.updateLetterBoxes();
        }
    };

    private _font_it?: Nullable<p5.Font>;
    /** The italic variant of the chosen font. */
    get font_it(): p5.Font { return this._font_it as p5.Font }
    
    private _font_up?: Nullable<p5.Font>;
    /** The regular upright variant of the chosen font. */
    get font_up(): p5.Font { return this._font_up as p5.Font }

    private _visibleDockingPointTypes: Array<string> = [];
    /** List of docking points to draw, based on the type and compatibility of the currently moving widget. */
    get visibleDockingPointTypes(): Array<string> { return this._visibleDockingPointTypes }

    private _activeDockingPoint?: Nullable<DockingPoint>;
    /** The candidate docking point for docking. Used to draw the circle in a different style. */
    get activeDockingPoint(): Nullable<DockingPoint> { return this._activeDockingPoint }

    /** All the docking points currently on the canvas. TODO: Check that this is true. */
    private _canvasDockingPoints: Array<DockingPoint> = [];

    /**
     * Are we using Boolean Algebra or Digital Electronics syntax for boolean expressions?
     * 
     * This should be set from the outside.
     */
    logicSyntax?: Nullable<string>;

    /**
     * Object used for logging actions. Useful for research and undo/redo.
     * 
     * There are more properties, but these are the only ones required from within TS
     */
    log: Nullable<{ initialState: Array<Object>, actions: Array<Object> }>;

    /**
     * Inequality supports three modes:
     * - math
     * - logic (for Boolean Algebra)
     * - chemistry
     * 
     * This should be set from the outside. */
    public editorMode: string;

    /** Sets whether Inequality is being used in headless mode to ingest and process the AST produced by inequality-grammar. */
    public textEntry: boolean;
    
    /** Path to the italic variant of the chosen font. */
    private fontItalicPath: string;
    /** Path to the regular upright variant of the chosen font. */
    private fontRegularPath: string;

    private IDLE_FPS = 7;

    /**
     * The constructor for Inequalty does a lot of work but it should be pretty
     * self-explanatory. In any case, you are not supposed to use this directly
     * but rather use makeInequality() -- see below.
     * 
     * @param p - Instance of p5.js running this sketch
     * @param width - Initial width of the canvas
     * @param height - Initial height of the canvas
     * @param initialSymbolsToParse - An array of widget specs to be placed on
     *                                the canvas from the beginning. Useful to
     *                                restore a previous state, or to provide an
     *                                initial expression to work with.
     * @param options - Used to assign various sketch properties. See above.
     */
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

    /**
     * p5.js method to ensure all the resources that need to be available on
     * startup are indeed available on startup.
     * 
     * @see https://p5js.org/reference/#/p5/preload
     * @override
     */
    preload = () => {
        this._font_it = this.p.loadFont(this.fontItalicPath);
        this._font_up = this.p.loadFont(this.fontRegularPath);

        if (!isDefined(this._font_it) || !isDefined(this._font_up)) {
            throw new Error("Inequality could not load fonts. " + this.fontItalicPath + " " + this.fontRegularPath);
        }
    };

    /** @experimental This was supposed to be used in regression testing but never quite made it. */
    loadTestCase = (s: Array<WidgetSpec>) => {
        this._symbols = [];
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
            
            for (let symbol of this._symbols) {
                this.log.initialState.push(symbol.subtreeObject(true, true));
            };
        }
        this.updateCanvasDockingPoints();
        for (let symbol of this._symbols) {
            symbol.shakeIt();
        }
    };

    /** Sometimes it may be necessary to update some basic bounding boxes. */
    updateLetterBoxes = () => {
        this._xBox = Rect.fromObject(this.font_it.textBounds("x", 0, 0, this._baseFontSize) as Rect);
        this._mBox = Rect.fromObject(this.font_it.textBounds("M", 0, 0, this._baseFontSize) as Rect);
    };

    /** 
     * This is p5.js's setup(), the sketch's main setup function.
     * 
     * @see https://p5js.org/reference/#/p5/setup
     * @override
     */
    setup = () => {
        // To conserve energy and CPU cycles, we set a low framerate when idling.
        this.p.frameRate(this.IDLE_FPS);

        this.logicSyntax = this.logicSyntax;

        switch (this.editorMode) {
            case 'maths':
            case 'logic':
                this._baseFontSize = 50;
                this._baseDockingPointSize = 50/3;
                break;
            case 'chemistry':
                this._baseFontSize = 50;
                // I am not sure why we decided to make the docking points smaller for chemistry...
                this._baseDockingPointSize = 30/3;
                break;
        }

        this.updateLetterBoxes();

        // Make sure the list of symbols on the canvas is empty initially,
        // just in case there are leftovers that haven't been cleaned up.
        this._symbols = [];
        // Set a sensible initial value for this that will be overwritten anyway.
        this._prevTouch = this.p.createVector(0, 0);
        // p5.js needs to create a canvas before it can draw anything.
        this.p.createCanvas(this.width, this.height);

        // Parse initial symbols if any are available, whether as a seed to work from, or as a previous object to be restored.
        try {
            if (!Array.isArray(this.initialSymbolsToParse)) {
                throw "Initial symbols must be an array, got " + this.initialSymbolsToParse + " instead";
            }
            for (const s of this.initialSymbolsToParse) {
                this.parseSubtreeObject(s);
            };
        } catch (e) {
            // There was an "old" equation editor, called Equality, that was very briefly used on Isaac.
            // These days, especially if starting afresh, this should never be a problem, but other issues may still happen.
            console.warn("Failed to load previous answer. Perhaps it was built with the old equation editor?", e);
        }
        // Attempt to centre objects on the canvas.
        // We may be restoring objects saved using another screen size so the
        // position attribute may even be off-screen.
        this.centre(true);
        if (!isDefined(this.textEntry) && isDefined(this.log)) {
            // If we are not running in headless mode, we want to log the initial state.
            this.log.initialState = [];
            for (let symbol of this._symbols) {
                this.log.initialState.push(symbol.subtreeObject(true, true));
            };
        }
        this.updateCanvasDockingPoints();
        for (let symbol of this._symbols) {
            symbol.shakeIt();
        }
    }

    /**
     * p5.js callback when the browser's window/viewport is resized.
     * 
     * @see https://p5js.org/reference/#/p5/windowResized
     * @override
     */
    windowResized = () => {
        this.p.resizeCanvas(this.p.windowWidth * Math.ceil(window.devicePixelRatio), this.p.windowHeight * Math.ceil(window.devicePixelRatio));
    };

    /**
     * This is how you draw things in a p5 sketch. This function is called in
     * continuously and pretty much every frame. All the drawing code should
     * only happen within a draw() call, otherwise bad things may happen.
     * But of course this is JavaScript after all...
     * 
     * @see https://p5js.org/reference/#/p5/draw
     * @override
     */
    draw = () => {
        if (!isDefined(this.p)) return;
        if (!isDefined(this.textEntry) || (isDefined(this.textEntry) && this.textEntry)) return;
        
        this.p.clear(255, 255, 255, 255);

        for (const symbol of this._symbols) {
            // Recursively call the draw() function of each widget.
            symbol.draw(symbol === this._movingSymbol);
        };

        // And let's not forget that the potential symbol being dragged from
        // the menu is still not in our _symbols array, so we need to draw it
        // separately. There's no need to draw its docking points, though.
        if (isDefined(this._potentialSymbol)) {
            this._potentialSymbol.draw(true);
        }
    };

    /** Keeps the list of available docking points available and up to date. */
    updateCanvasDockingPoints = () => {
        this._canvasDockingPoints = [];
        // We need a copy of this._symbols because assignment is done by
        // reference and so
        //     let a = this._symbols; a.shift();
        // destroys this._symbols, which may be a problem.
        // It's also a good idea to filter out any moving symbol as we wouldn't
        // be able to dock anything to their docking points.
        //
        // NOTE: If anyone ever manages to implement multi-cursor support, being
        //       able to dock a moving symbol to another moving symbol may not
        //       be the worst idea in the world -- though still a bit tricky.
        for (const symbol of this._symbols) {
            // Make sure every widget is correctly placed relatively to their parents
            symbol.shakeIt();
        };

        let q = [...this._symbols.filter(w => w !== this._movingSymbol)];
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

    /**
     * Selects the closest docking point to the given point, within a maximum
     * threshold. This is effectively kind of a Voronoi diagram which makes the
     * search zones of different sizes depending on the density of the docking
     * points, so that it is not only easier to pick one in code, but also
     * quite lenient on the user to navigate around.
     * 
     * @param testPoint - The point to which we want to find the nearest docking point.
     * @returns 
     */
    findClosestDockingPoint = (testPoint: p5.Vector): Nullable<DockingPoint> => {
        let minDistance = Infinity;
        let candidateDockingPoint: Nullable<DockingPoint>;
        let availablePoints = this._canvasDockingPoints.filter((e: DockingPoint) => {
            return _intersection(this._visibleDockingPointTypes, e.type).length > 0;
        });
        for (let dockingPoint of availablePoints) {
            let d = testPoint.dist(dockingPoint.absolutePosition);
            if (d < minDistance) {
                minDistance = d;
                candidateDockingPoint = dockingPoint;
            }
        }
        // 1.5x the base font size seems good enough as a maximum distance for detection.
        return minDistance <= this._baseFontSize*1.5 ? candidateDockingPoint : null;
    };

    /**
     * Used while dragging a widget from an external menu.
     * 
     * @param spec - A WidgetSpec of the desired widget
     * @param x - x coordinate where to draw the widget
     * @param y - y coordinate where to draw the widget
     */
    updatePotentialSymbol = (spec: Nullable<WidgetSpec> = null, x?: Nullable<number>, y?: Nullable<number>) => {
        // NOTE: This logic requires spec to be briefly set to null when
        //       switching between potential symbol types.
        //       The reasoning is lost in the sands of time but I think it's to
        //       deal with leftovers from the previous potential symbol. Maybe.
        //       I'm sure this can be improved (TODO).
        if (isDefined(spec)) {
            if (!isDefined(this._potentialSymbol)) {
                this._potentialSymbol = this._parseSubtreeObject(spec);
                if (isDefined(this._potentialSymbol)) {
                    this.log?.actions.push({
                        event: "DRAG_POTENTIAL_SYMBOL",
                        symbol: this._potentialSymbol.subtreeObject(false, true, true),
                        timestamp: Date.now()
                    });
                }
            }
            
            if (isDefined(this._potentialSymbol)) {
                this._visibleDockingPointTypes = this._potentialSymbol.docksTo;
                this._potentialSymbol.position.x = (x ?? 0) - this._potentialSymbol.boundingBox().w * 0.5;
                this._potentialSymbol.position.y = (y ?? 0);
                this._potentialSymbol.shakeIt();

                // Decide whether we should dock immediately
                this._symbols.some((symbol: Widget) => {
                    this._activeDockingPoint = null;

                    symbol.highlight(false);
                    symbol.contractDockingPoints();
                    if (isDefined(this._potentialSymbol)) {
                        if (this._activeDockingPoint = this.findClosestDockingPoint(this.p.createVector(this._potentialSymbol.position.x, this._potentialSymbol.position.y))) {
                            this._activeDockingPoint.widget.highlight(true);
                            this._activeDockingPoint.widget.expandDockingPoints();
                            return true;
                        }
                    }
                    symbol.shakeIt();

                    return false;
                });
            }

        } else {
            this._potentialSymbol = null;
            this._visibleDockingPointTypes = [];
        }
    };

    /**
     * When a potential symbol is dropped onto the canvas, we then take it in
     * and make it a first-class widget by adding it to _symbols.
     * 
     * This method covers both the case of dropping the symbol onto the canvas
     * or directly docking it to a pre-existing symbol.
     */
    commitPotentialSymbol = () => {
        // Make sure we have an active docking point, and that the moving symbol can dock to it.
        if (isDefined(this._potentialSymbol) && this._activeDockingPoint != null && _intersection(this._potentialSymbol.docksTo, this._activeDockingPoint.type).length > 0) {
            this._activeDockingPoint.child = this._potentialSymbol;
            this.log?.actions.push({
                event: "DOCK_POTENTIAL_SYMBOL",
                symbol: this._potentialSymbol.subtreeObject(false, true, true),
                parent: this._potentialSymbol.parentWidget?.subtreeObject(false, true, true),
                dockingPoint: this._activeDockingPoint.name,
                timestamp: Date.now()
            });
        } else if (isDefined(this._potentialSymbol)) {
            this._symbols.push(this._potentialSymbol);
            this.log?.actions.push({
                event: "DROP_POTENTIAL_SYMBOL",
                symbol: this._potentialSymbol.subtreeObject(false, true, true),
                timestamp: Date.now()
            });
        }
        this.updatePotentialSymbol(null);
        this.updateState();
        this._activeDockingPoint = null;
        this.updateCanvasDockingPoints();
        for (let symbol of this._symbols) {
            symbol.shakeIt();
        }

        // Remember to set the framerate back to idle.
        this.p.frameRate(this.IDLE_FPS);
    };

    /**
     * This is the case when we drag a symbol from the menu but immediately
     * decide to trash it or drop it back onto the menu.
     */
    abortPotentialSymbol = () => {
        this.log?.actions.push({
            event: "TRASH_SYMBOL",
            symbol: this._potentialSymbol?.subtreeObject(false, true, true),
            timestamp: Date.now()
        });
        this._activeDockingPoint = null;
        this._symbols = this._symbols.filter(w => w !== this._movingSymbol)
        this.updatePotentialSymbol(null);
        this.updateCanvasDockingPoints();
        for (let symbol of this._symbols) {
            symbol.shakeIt();
        }

        this.p.frameRate(this.IDLE_FPS);
    };

    /**
     * De-serializes a serialized AST.
     * 
     * @param root - Root of the subtree to parse
     * @param clearExistingSymbols - Whether to clear _symbols or not
     * @param fromTextEntry - Does this come from text entry? I.e., are we running in headless mode?
     * @param withUserInput - If so, what did the user type?
     */
    parseSubtreeObject = (root: WidgetSpec, clearExistingSymbols = false, fromTextEntry = false, withUserInput = '') => {
        if (isDefined(root)) {
            if (isDefined(clearExistingSymbols) && clearExistingSymbols && isDefined(this._symbols) && this._symbols.length > 0) {
                this._symbols = [];
            }
            let w = this._parseSubtreeObject(root);
            if (isDefined(w)) {
                // Setting the position is a bit pointless since we centre everything on startup.
                w.position.x = root.position?.x ?? 0;
                w.position.y = root.position?.y ?? 0;
                this._symbols.push(w);
                this.updateCanvasDockingPoints();
                w.shakeIt();
            }
        }
        this.updateState(fromTextEntry, withUserInput);
    };

    /**
     * Helper method to (recursively) deserialize a serialized AST.
     * 
     * @param node - Node of the AST to deserialize.
     * @param parseChildren - Deserialize recursively or not.
     * @returns The corresponding Widget of the right type.
     */
    private _parseSubtreeObject = (node: WidgetSpec, parseChildren = true): Nullable<Widget> => {
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
            default: // this would be a Widget and should really never happen...
                break;
        }

        // By default, this method recursively parses the children of the given node.
        if (isDefined(w) && parseChildren && isDefined(node.children)) {
            for (const key in node.children) {
                const n = node.children[key];
                w.dockingPoints[key].child = this._parseSubtreeObject(n);
            }
        }

        return w;
    };

    /**
     * This sets everything up to track cursor motion, and handles hit-testing
     * in case we happen to initiate dragging on a Widget. Don't get fooled by
     * the "touch" name, this one also handles mouse events.
     * 
     * Executive (and possibly temporary) decision: we are moving one symbol at
     * a time (meaning: no multi-touch).
     * 
     * Native ptouchX and ptouchY are not accurate because they are based on the
     * "previous frame" so we keep track of the coordinates ourselves.
     */
    touchStarted = () => {
        // No need for cursors if we are headless.
        if (this.textEntry) return;
        // Make sure we keep track this every time it should go back to idling.
        this.p.frameRate(60);
        // These are used to correctly detect clicks and taps.

        // Note that touchX and touchY are incorrect when using touch. Ironically.
        let tx = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).x : this.p.mouseX;
        let ty = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).y : this.p.mouseY;

        this._initialTouch = this.p.createVector(tx, ty);

        this._movingSymbol = null;
        let index = -1;
        let movingSymbolDocksTo: Array<string> = [];
        this._symbols.some((symbol, i) => {
            // .hit() propagates down the hierarchy
            let hitSymbol = symbol.hit(this.p.createVector(tx, ty));
            if (hitSymbol != null && hitSymbol.isDetachable) {
                // If we hit that symbol, then mark it as moving
                this._movingSymbol = hitSymbol;
                this.log?.actions.push({
                    event: "DRAG_START",
                    symbol: this._movingSymbol.subtreeObject(false, true, true),
                    timestamp: Date.now()
                });
                index = i;
                this._prevTouch = this.p.createVector(tx, ty);

                // Remove symbol from the hierarchy, place it back with the roots.
                if (hitSymbol.parentWidget != null) {
                    this._symbols.push(hitSymbol);
                    // Update the list of free docking points
                    this.updateCanvasDockingPoints();

                    hitSymbol.scale = 1.0;
                    hitSymbol.position = hitSymbol.absolutePosition;
                    hitSymbol.removeFromParent();
                }

                // Get the points it docks to, we'll use them later
                movingSymbolDocksTo = this._movingSymbol.docksTo;

                // Array.some requires this to break out of the loop.
                return true;
            }
            for (let symbol of this._symbols) {
                symbol.shakeIt();
            }    

            return false;
        });

        // Put the moving symbol on top (bottom?) of the list (this only works with roots,
        // and may not be necessary at all, but eye candy, right?)
        if (index > -1) {
            let e = this._symbols.splice(index, 1)[0];
            this._symbols.push(e);
            this.updateCanvasDockingPoints();
            index = -1;
        }

        // Tell the other symbols to show only these points. Achievement unlocked: Usability!
        this._visibleDockingPointTypes = movingSymbolDocksTo;

        // Trigger visibility attribute. TODO: We may want to rely on this in the future.
        for (let dp of this._canvasDockingPoints) {
            dp.isVisible = _intersection(this._visibleDockingPointTypes, dp.type).length > 0;
        }
        for (let symbol of this._symbols) {
            symbol.shakeIt();
        }

        // FIXME if you can. This is quite the hack.
        this.touchMoved();
    };

    /** Keeps track of a moving cursor and drags widgets around if necessary. */
    touchMoved = () => {
        // No need for cursors if we are headless.
        if (this.textEntry) return;

        let tx = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).x : this.p.mouseX;
        let ty = this.p.touches.length > 0 ? (<p5.Vector>this.p.touches[0]).y : this.p.mouseY;

        if (isDefined(this._movingSymbol) && isDefined(this._prevTouch)) {
            let d = this.p.createVector(tx - this._prevTouch.x, ty - this._prevTouch.y);

            // TODO (NOT?): DELETE the following commented section.
            // I'm not sure why, but if I commented like this it may be
            // reference code... although, upon careful review, I don't see what
            // purpose this section serves so I guess it can be deleted...

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

            this._movingSymbol.position.add(d);
            // As remarked in touchStarted
            this._prevTouch.x = tx;
            this._prevTouch.y = ty;

            // Check if we are moving close to a docking point, and highlight it even more.
            this._symbols.some((symbol: Widget) => {
                this._activeDockingPoint = null;
                // This is the point where the mouse/touch is.
                // let touchPoint = this.p.createVector(tx, ty);
                // This is less refined than doing the proximity detection thing, but works much better (#4)
                if (isDefined(symbol) && symbol !== this._movingSymbol) {
                    symbol.highlight(false);
                    symbol.contractDockingPoints();
                    if (this._activeDockingPoint = this.findClosestDockingPoint(this.p.createVector(this.p.mouseX, this.p.mouseY))) {
                        this._activeDockingPoint.widget.highlight(true);
                        return true;
                    }
                }

                return false;
            });

            this.onNotifySymbolDrag(tx, ty);
        }
    };

    /**
     * Called when we think the surrounding application should close or hide
     * the menu. If it has any.
     * 
     * Override this from the outside if needed.
     */
    onCloseMenus = () => {};

    /**
     * The surrounding application can override this if it needs to know when
     * and where a widget is being dragged.
     * 
     * @param _x 
     * @param _y 
     */
    onNotifySymbolDrag = (_x: number, _y: number) => {};

    /**
     * Sometimes it's useful to know whether the user is privileged, like in
     * the case of disassembling derivatives. We assume users are unprivileged
     * by default.
     * 
     * @returns Whether the user is privileged (default: false).
     */
    isUserPrivileged = () => { return false };

    /**
     * Inequality doesn't provide a trash bin, but the surrounding application
     * can. This is to notify Inequality whether a widget is being dragged onto
     * the trash bin icon. If this is true and the widget is dropped, we get rid
     * of the widget.
     * 
     * @returns Whether the trash icon is active (default: false).
     */
    isTrashActive = () => { return false };

    /**
     * Handles the lifting of fingers from screen or mouse button. This can
     * result in many actions, including dopping the currently moving widget
     * (if any) onto the canvas, or docking it to another widget, or binning it.
     */
    touchEnded = () => {
        // No need for cursors if we are headless.
        if (this.textEntry) return;

        // TODO Maybe integrate something like the number of events or the
        // timestamp? Timestamp would be neat to implement a long tap gesture.
        if (null != this._initialTouch && p5.Vector.dist(this._initialTouch, this.p.createVector(this.p.mouseX, this.p.mouseY)) < 2) {
            // Click or short tap.
            // Close the menu when touching the canvas
            this.onCloseMenus();
        }
        if (this._movingSymbol != null) {
            // When touches end, mark the symbol as not moving.
            this._prevTouch = null;

            // Make sure we have an active docking point, and that the moving symbol can dock to it.
            if (this._activeDockingPoint != null && _intersection(this._movingSymbol.docksTo, this._activeDockingPoint.type).length > 0) {
                this._symbols = this._symbols.filter(w => w !== this._movingSymbol);
                this.updateCanvasDockingPoints();
                // Do the actual docking
                this._activeDockingPoint.child = this._movingSymbol;
                // Let the widget know to which docking point it is docked. This is starting to become ridiculous...
                this._activeDockingPoint.child.dockedTo = this._activeDockingPoint.name;

                this.log?.actions.push({
                    event: "DOCK_SYMBOL",
                    symbol: this._movingSymbol.subtreeObject(false, true, true),
                    parent: this._movingSymbol.parentWidget?.subtreeObject(false, true, true),
                    dockingPoint: this._activeDockingPoint.name,
                    timestamp: Date.now()
                });
            } else if (this.isTrashActive()) {
                this.log?.actions.push({
                    event: "TRASH_SYMBOL",
                    symbol: this._movingSymbol.subtreeObject(false, true, true),
                    timestamp: Date.now()
                });
                this._symbols = this._symbols.filter(w => w !== this._movingSymbol);
                this.updateCanvasDockingPoints();
            } else {
                this.log?.actions.push({
                    event: "DROP_SYMBOL",
                    symbol: this._movingSymbol.subtreeObject(false, true, true),
                    timestamp: Date.now()
                });
            }
            this._movingSymbol = null;    
            this._activeDockingPoint = null;
        }

        this._visibleDockingPointTypes = [];
        for (let dp of this._canvasDockingPoints) {
            // TODO Rely on this in the future maybe.
            // In principle, only compatible docking points should be visible
            // while a widget is moving, so we could rely on this information
            // to do various things we currently do in other ways. Just a thought.
            dp.isVisible = false;
            dp.widget.expandDockingPoints();
        }
        // Update the list of free docking points
        this.updateCanvasDockingPoints();
        for (let symbol of this._symbols) {
            symbol.shakeIt();
        }

        this._initialTouch = null;

        // Try to select a good candidate to send as "current output" to the outside.
        let symbolWithMostChildren: Nullable<Widget> = null;
        let mostChildren = 0;
        for(const symbol of this._symbols) {
            let numChildren = symbol.totalSymbolCount;
            if (numChildren > mostChildren) {
                mostChildren = numChildren;
                symbolWithMostChildren = symbol;
            }
        }
        for (const symbol of this._symbols) {
            symbol.isMainExpression = (symbol === symbolWithMostChildren);
        }
        this.updateState();

        this.p.frameRate(this.IDLE_FPS);
    };

    // Handles a simplified moved workflow if we are using a mouse.
    mouseMoved = () => {
        let p = this.p.createVector(this.p.mouseX, this.p.mouseY);
        for (const symbol of this._symbols) {
            symbol.highlight(false);
            let hitSymbol = symbol.hit(p);
            if (hitSymbol) {
                // Hey, we hit a symbol! :)
                hitSymbol.highlight(true);
            }
        }
    };

    /**
     * Returns a flattened list of all the tokens corresponding to the widgets
     * present in the given subtree. Useful to provide a list of available
     * symbols to be used to build a reduced menu.
     * 
     * @param w - A widget with its associated subtree.
     * @return A list of string tokens for each widget in the given subtree.
     */
    flattenExpression = (w: Widget): string[] => {
        let stack: Widget[] = [w];
        let list: string[] = [];
        while (stack.length > 0) {
            let e = stack.shift() as Widget;
            list.push(e.token());
            let children = [] as Widget[];
            if (e.typeAsString === 'Derivative') {
                list = [...list, ...this._flattenDerivative(e as Derivative)];
            } else {
                children = e.children;
            }
            stack = stack.concat(children);
        }
        return [...new Set(list)].filter(i => { return i !== ''; });
    };

    /** Helper method to flatten derivates. Derivatives are weird... */
    private _flattenDerivative = (w: Derivative): string[] => {
        let stack: Array<Widget> = [w];
        let list = [];
        while (stack.length > 0) {
            let e = stack.shift() as Widget;
            if (e.typeAsString !== 'Differential') list.push(e.token());
            let children = e.children;
            stack = stack.concat(children);
        }
        return [...new Set(list)].filter(i => { return i !== ''; });
    }

    /**
     * We call this every time we update our internal state and the surrounding
     * application may be interested in knowing about it. It needs to be
     * overridden from the outside.
     */
    onNewEditorState = (_state: object) => {
        console.error('Unoverridden onNewEditorState called');
    }

    /**
     * Update the current editor state ready to be consumed by the Equality Checker.
     * 
     * @see https://github.com/isaacphysics/equality-checker
     */
    updateState = (fromTextEntry = false, withUserInput = '') => {
        let symbolWithMostChildren: Nullable<Widget>;
        let mostChildren = 0;
        for(const symbol of this._symbols) {
            const numChildren = symbol.totalSymbolCount;
            if (numChildren > mostChildren) {
                mostChildren = numChildren;
                symbolWithMostChildren = symbol;
            }
        };

        if (isDefined(symbolWithMostChildren)) {
            const flattenedExpression = this.flattenExpression(symbolWithMostChildren).map(e => isDefined(e) ? e.replace(/,/g, ";") : null).filter(isDefined);
            this.onNewEditorState({
                result: {
                    "tex": symbolWithMostChildren.formatExpressionAs("latex").trim(),
                    "mhchem": symbolWithMostChildren.formatExpressionAs("mhchem").trim(),
                    "python": symbolWithMostChildren.formatExpressionAs("python").trim(),
                    "mathml": '<math xmlns="http://www.w3.org/1998/Math/MathML">' + symbolWithMostChildren.formatExpressionAs("mathml").trim() + '</math>',
                    // removes everything that is not truthy, so this should avoid empty strings.
                    "uniqueSymbols": flattenedExpression.join(', '),
                },
                symbols: this._symbols.map(s => s.subtreeObject()),
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
        for (const symbol of this._symbols) {
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

/**
 * This is how Inequality is instanced instead of through its constructor.
 * This way, p5.js is happy, we are happy, the user is happy, everyone wins!
 */
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