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

import p5 from 'p5';
import _each = require('lodash/each');
import _intersection = require('lodash/intersection');
import _isEmpty = require('lodash/isEmpty');

import { DockingPoint } from './DockingPoint';
import { isDefined } from './utils';
import { Inequality } from './Inequality';

// This is a static global id generator for uniquely identifying widgets/symbols
// This may very well be a relic of my C++ multi-threaded past, but it served me well so far...
export let wId = 0;

export
    class Rect {
    x: number;
    y: number;
    w: number;
    h: number;

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    /**
     * Factory to produce a Rect from an object with the appropriate keys.
     * 
     * @param box - An object with keys `x`, `y`, `w`, and `h`.
     * @returns A Rect corresponding to the `box` parameter. null if box does not have the right parameters.
     */
    static fromObject(box: Rect): Nullable<Rect> {
        if (box.hasOwnProperty("x") && box.hasOwnProperty("y") && box.hasOwnProperty("w") && box.hasOwnProperty("h")) {
            return new Rect(box.x, box.y, box.w, box.h);
        } else {
            return null;
        }
    }

	/**
	 * Re-positions this Rect with the TL corner in the new position
	 *
	 * @param newOrigin The new TL corner's position
	 * @returns This Rect post hoc.
     */
    setOrigin(newOrigin: p5.Vector): Rect {
        this.x = this.x - newOrigin.x;
        this.y = this.y - newOrigin.y;
        return this;
    }

	/**
	 * Checks whether this Rect contains point p in canvas coordinates.
	 * @param p - The point to be tested for containment.
	 * @returns Whether the point is contained or not.
     */
    contains(p: p5.Vector): boolean {
        return (p.x >= this.x) && (p.y >= this.y) && (p.x <= this.x + this.w) && (p.y <= this.y + this.h);
    }

	/**
	 * @returns {p5.Vector} The centre of this Rect, in canvas coordinates.
     */
    get center(): p5.Vector {
        // This is painful but I can't find a way of using createVector and p5.Vector does not have a parametric constructor.
        const v = new p5.Vector();
        v.set(this.x + this.w/2, this.y + this.h/2);
        return v;
    }
}

/** A type to (de)serialize widgets */
export type WidgetSpec = {
    type: string;
    properties: any;
    children?: Array<WidgetSpec>;
    position?: { x: number, y: number };
    expression?: any;
}

/** A base class for anything visible, draggable, and dockable. */
export
    /**
    Methods to be implemented:
        - draw()
        - boundingBox()
        - token()
        - properties()
        - _shakeIt()
    */

    abstract class Widget {
    /** p5 instance, I guess? */
    protected p: p5;
    /** Sketch instance for some app-wide reference values */
    readonly s: Inequality;
    /** Unique ID */
    readonly id: number = -1;

    /** Scaling factor for this widget (affected by where a widget is docked, typically) */
    scale: number = 1.0;

    /** Position of this widget */
    position: p5.Vector;

    /** Points to which other widgets can dock. See getter below. */
    private _dockingPoints: { [key: string]: DockingPoint; } = {};

    /** Base size of docking points, scaled according to this widget's scale factor. */
    get dockingPointSize(): number {
        return this.scale * this.s.baseDockingPointSize;
    }

    /** An array of the types of docking points that this widget can dock to */
    docksTo: Array<string> = [];

    /** A string holding the name of the docking point this widget is docked to, if it is. */
    dockedTo: string = "";

    mode: string;

    /** Convenience pointer to this widget's parent */
    parentWidget?: Nullable<Widget> = null;

    isHighlighted = false;
    mustExpand = false;

    /** @experimental Instructs widgets to draw their docking points a bit further away */
    expandDockingPoints() {
        this.mustExpand = true;
    }

    /** @experimental Instructs widgets to draw their docking points a bit closer */
    contractDockingPoints() {
        this.mustExpand = false;
        for (let w of this.children) {
            w.contractDockingPoints();
        }
    }

    /** The color used to draw this Widget */
    private _color?: Nullable<p5.Color> = null;
    get color(): p5.Color { return this._color ?? this.p.color(0) }
    isMainExpression = false;
    currentPlacement = "";

    /**
     * Marks a widget as detachable from its parent, or not. This is useful in
     * cases like with derivatives in which the derivative widget looks just
     * like a fraction sign, and so one could be tempted to use it as such, and
     * vice versa to use a fraction sign as a derivative object. By providing a
     * pre-made derivatives with differentials above and below, and marking
     * these as non-detachable (override and return false) we reduce confusion.
     * 
     * @returns True if this widget can be detached from its parent, false otherwise.
     *
     * @see Differential, Derivative
     */
    get isDetachable(): boolean {
        return true;
    }

    /**
     * A reference point that other widgets can use to dock this widget to
     * themselves with the correct alignment.
     * 
     * Different symbols have different "centres", especially when dealing with
     * text and baselines.  Most of the time, this "centre" not move around once
     * it's set, but it can be useful to be able to do so anyway.
     * 
     * @returns The position to which a Symbol is meant to be docked from.
     */
    get dockingPoint(): p5.Vector {
        return this.p.createVector(0, 0);
    }

    /**
     * A list of this widget's docking points.
     * 
     * This is a key-value object where the keys are the identifiers of the
     * docking points, and the values are of type DockingPoint.
     * 
     * @see DockingPoint
     */
    get dockingPoints(): { [key: string]: DockingPoint; } {
        return this._dockingPoints;
    }

    set dockingPoints(a) {
        this._dockingPoints = a;
    }

    /**
     * This widget's type as a string. Must be overridden by subclasses.
     * 
     * This is necessary because of name mangling during the transpilation
     * process. Type names get twisted and become useless when it comes to
     * serializing and de-serializing.
     * 
     * We *could* use decorators, but they may add dependencies and it all gets
     * ugly very fast. We'll stick to this for now, until the magical world of
     * front-end web development pulls its head out of its collective back-end
     * and adopts a sensible language like, I don't know, Swift? Dart? Kotlin?
     *
     * @returns {string}
     */
    get typeAsString(): string {
        return 'Widget';
    }

    constructor(p: p5, s: Inequality, mode: string = 'maths') {
        // Take a new unique id for this symbol
        this.id = ++wId;
        // This is weird but necessary: this.p will be the sketch function
        this.p = p;
        this.s = s;
        // Default position is [0, 0]
        this.position = p.createVector(0, 0);

        this._color = this.p.color(0);
        this.mode = mode;
        this.generateDockingPoints();
    }

    /**
     * Generates all the docking points in one go and stores them in this.dockingPoints.
     */
    generateDockingPoints() { };

	/**
	 * Generates the expression corresponding to this widget and its subtree.
     * **This function is a stub and will not traverse the subtree.**
     * 
     * The `subscript` format is a special one for generating symbols that will
     * work with the SymPy checker. It squashes everything together, ignoring
     * operations and all that jazz.
	 *
	 * @param format - A string to specify the output format. Supports: latex, python, mhchem, maybe others...
	 * @returns The expression in the specified format.
     */
    formatExpressionAs(_format: string): string {
        return "";
    }

    /**
     * Paints the widget on the canvas, and recurs down to its children.
     * 
     * @param hideDockingPoints - Whether to draw docking points or not.
     *                            It's nice to only show the docking points when
     *                            there is a dockable widget on the move.
     */
    draw(hideDockingPoints = false) {
        this.p.translate(this.position.x, this.position.y);
        let alpha = 255;
        if (this.s.movingSymbol != null && this.id === this.s.movingSymbol.id) {
            alpha = 127;
        }
        for(let k in this.dockingPoints) {
            // Go through the docking points and draw them as circles if they are
            // empty, or call the corresponding widget's draw method otherwise.
            const dockingPoint = this.dockingPoints[k];
            if (dockingPoint.child) {
                dockingPoint.child.draw(hideDockingPoints);
            } else {
                if (hideDockingPoints) continue;
                // There is no child to paint, let's paint an empty docking point
                //if (this.depth < 2) { // This stops docking points from being shown, but not from being used.
                let drawThisOne = _intersection(this.s.visibleDockingPointTypes, dockingPoint.type).length > 0;
                let highlightThisOne = this.s.activeDockingPoint === dockingPoint;

                // Pro tip: append #debug to your URL for extra sparkles.
                if (drawThisOne || window.location.hash === "#debug") {
                    let ptAlpha = window.location.hash === "#debug" && !drawThisOne ? alpha * 0.5 : alpha;// * 0.5;
                    this.p.stroke(51, 153, 255, ptAlpha);
                    this.p.strokeWeight(1);
                    if (highlightThisOne && drawThisOne) {
                        this.p.fill(51, 153, 255);
                    } else {
                        this.p.noFill();
                    }
                    let dps = this.s.editorMode === 'chemistry' ? this.dockingPointSize*(50/30) : this.dockingPointSize;
                    this.p.ellipse(dockingPoint.position.x, dockingPoint.position.y, dps, dps);
                }
            }
        }
        this._draw();
        this.p.noFill();
        
        // Pro tip: append #debug to your URL to show all the bounding boxes.
        if (window.location.hash === "#debug") {
            // +++ REFERENCE POINTS +++
            this.p.stroke(0, 0, 255, 128).strokeWeight(2);
            this.p.point(this.dockingPoint.x, this.dockingPoint.y);
            this.p.strokeWeight(1).ellipse(this.dockingPoint.x, this.dockingPoint.y, this.dockingPointSize/2, this.dockingPointSize/2);

            this.p.stroke(255, 0, 0, 128).strokeWeight(2);
            this.p.point(0, 0);
            this.p.strokeWeight(1).ellipse(0, 0, this.dockingPointSize/2, this.dockingPointSize/2);

            // +++ SUBTREE BOUNDING BOX +++
            // +++ Also draws local boxes because recursion.
            let subtreeBox = this.subtreeBoundingBox;
            this.p.stroke(0, 0, 255, 128);
            this.p.rect(subtreeBox.x, subtreeBox.y, subtreeBox.w, subtreeBox.h);

            // +++ SUBTREE BOUNDING BOX INCLUDING DOCKING POINTS +++
            let sdpB = this.subtreeDockingPointsBoundingBox;
            this.p.stroke(128,64,0,128).strokeWeight(2);
            this.p.rect(sdpB.x, sdpB.y, sdpB.w, sdpB.h);

        }

        this.p.translate(-this.position.x, -this.position.y);
    }

    /**
     * Helper method to draw the widgets on screen. Widgets must draw
     * themselves. Override this and plug your drawing code in here.
     */
    abstract _draw(): void;

    /**
     * This is a string representation of this widget that makes mathematical
     * sense. This is used to compose the LaTeX and SymPy expressions.
     * 
     * On Isaac, we use these to show our lovely content editors a list of
     * symbols that they can provide as "available symbols" that will get parsed
     * to produced a reduced version of the menu, showing only relevant symbols.
     */
    abstract token(): string;

    // ************ //

	/**
	 * Retrieves the abstract tree representation having this widget as root.
	 *
	 * @param processChildren This stops it from traversing children.
	 * @param includeIds Include symbol IDs
	 * @param minimal Only include essential information
	 * @returns {{type: string}}
	 */
    subtreeObject(processChildren = true, includeIds = false, minimal = false): Object {
        let p = this.absolutePosition;
        let o: {
            type?: string,
            id?: number,
            position?: { x: number, y: number },
            expression?: { latex?: string, python?: string },
            properties?: Object,
            children?: { [key: string]: DockingPoint },
        } = {
            type: this.typeAsString
        };
        if (includeIds) {
            o.id = this.id;
        }
        if (!this.parentWidget && !minimal) {
            o.position = { x: p.x, y: p.y };
            o.expression = {
                latex: this.formatExpressionAs("latex"),
                python: this.formatExpressionAs("python")
            };
        }
        if (processChildren) {
            let dockingPoints: any = {};
            _each(this.dockingPoints, (dockingPoint, key) => {
                if (dockingPoint.child != null) {
                    dockingPoints[key] = dockingPoint.child.subtreeObject(processChildren, includeIds, minimal);
                }
            });
            if (!_isEmpty(dockingPoints)) {
                o.children = dockingPoints;
            }
        }
        let properties = this._properties();
        if (properties) {
            o.properties = properties;
        }
        return o;
    }

    /** Specific widgets have their own properties */
    // FIXME Could turn this into a `properties` getter maybe?
    abstract properties(): Nullable<Object>;

    // I am not sure why we have this one but my advice is be prepared for
    // mayhem if you decide to remove it.
    _properties(): Nullable<Object> {
        return this.properties();
    }

    /** Removes this widget from its parent. Also, shakes it. */
    removeFromParent() {
        if (!isDefined(this.parentWidget)) return;

        let oldParent = this.parentWidget;
        this.currentPlacement = "";
        this.dockedTo = "";
        for(let k in this.parentWidget.dockingPoints) {
            let dockingPoint = this.parentWidget?.dockingPoints[k];
            if (dockingPoint?.child == this) {
                this.s.log?.actions.push({
                    event: "UNDOCK_SYMBOL",
                    symbol: this.subtreeObject(false, true, true),
                    parent: this.parentWidget?.subtreeObject(false, true, true),
                    dockingPoint: dockingPoint.name,
                    timestamp: Date.now()
                });
                dockingPoint.child = null;
                this.parentWidget = null;
            }
        };
        this.shakeIt(); // Our size may have changed. Shake it.
        oldParent.shakeIt(); // Our old parent should update. Shake it.
    }

	/**
	 * Hit test. Detects whether a point is hitting the tight bounding box of
     * this widget. This is used to test whether we can initiate mouse/touch
     * interaction, and it propagates down to children just in case.
	 *
	 * @param p The hit point
	 * @returns {Widget} This widget, if hit; null if not.
     */
    hit(p: p5.Vector): Nullable<Widget> {
        let w: Nullable<Widget> = null;
        Object.entries(this.dockingPoints).some(entry => {
            const dockingPoint = entry[1];
            if (dockingPoint.child != null) {
                w = dockingPoint.child.hit(p5.Vector.sub(p, this.position));
                return w != null;
            }
            return false;
        });
        if (w != null) {
            return w;
        } else if (this.boundingBox().contains(p5.Vector.sub(p, this.position))) {
            return this;
        } else {
            return null;
        }
    }

	/**
	 * Turns on and off highlight recursively.
	 */
    highlight(on = true) {
        let mainColor = this.isMainExpression ? this.p.color(0) : this.p.color(0, 0, 0, 127);
        this.isHighlighted = on;
        this._color = on ? this.p.color(51, 153, 255) : mainColor;
        _each(this.dockingPoints, dockingPoint => {
            // Only recurse for turning off. This seems to improve usability.
            if (dockingPoint.child != null && !on) {
                dockingPoint.child.highlight(on);
                dockingPoint.child.isMainExpression = this.isMainExpression;
            }
        });
    }

	/**
	 * @returns A flat array of the children of this widget, as widget objects
     */
    get children(): Array<Widget> {
        return Object.entries(this.dockingPoints).map(e => e[1].child).filter(w => isDefined(w)) as Array<Widget>;
    }

    /**
     * Counts how many widgets are in this subtree. This is useful when trying
     * to decide what single expression to select for output.
     * 
     * @returns How many widgets this subtree is made of.
     */
    get totalSymbolCount(): number {
        let total = 1;
        for (let i in this.dockingPoints) {
            let c = this.dockingPoints[i].child;
            if (c != null) {
                total += c.totalSymbolCount;
            }
        }
        return total;
    }

    /**
     * Computes this widget's depth in the tree.
     */
    get depth(): number {
        let depth = 0;
        let n: Widget = this;
        while (n.parentWidget) {
            if (this.currentPlacement == "subscript" || this.currentPlacement == "superscript") {
                depth += 1;
                n = n.parentWidget;
            }
            else {
                n = n.parentWidget;
            }
        }
        return depth;
    }

	/**
	 * Shakes up the subtree to make everything look nicer.
	 * (*The only way this could be better is if I was writing this in Swift.*)
	 */
    shakeIt() {
        if (this.parentWidget == null) {
            this._shakeIt();
        } else {
            this.parentWidget.shakeIt();
        }
    }

	/**
	 * Internal companion method to shakeIt(). This is the one that actually
     * does the work, and the one that should be overridden by children of this
     * class.
     * 
     * This is quite an important method to get right.
	 *
	 * @private
     */
    abstract _shakeIt(): void;

    /**
     * Shake it down...
     *
     * @private
     */
    _shakeItDown() {
        for (let name in this.dockingPoints) {
            let child = this.dockingPoints[name].child;
            if (child) {
                child.scale = this.scale * this.dockingPoints[name].scale;
                child._shakeIt();
            }
        }
    }

    // ********* SIZING AND PLACING AND STUFF *********//

    /**
     * This widget's tight bounding box. This is used for the cursor hit testing.
     *
     * @returns The bounding box
     */
    // FIXME Upgrade TypeScript to get abstract getters and setters
    abstract boundingBox(): Rect;

    /**
     * @returns The absolute position of this widget relative to the canvas.
     */
    get absolutePosition(): p5.Vector {
        if (null != this.parentWidget) {
            return p5.Vector.add(this.parentWidget.absolutePosition, this.position);
        } else {
            return this.position;
        }
    }

    /**
     * @returns The absolute bounding box of this widget relative to the canvas.
     */
    get absoluteBoundingBox(): Rect {
        let box = this.boundingBox();
        let pos = this.absolutePosition;
        return new Rect(box.x + pos.x, box.y + pos.y, box.w, box.h);
    }

    /**
     * @returns The bounding box including this widget's whole subtree.
     */
    get subtreeBoundingBox(): Rect {
        let thisAbsPosition = this.absolutePosition;
        let thisAbsBox = this.absoluteBoundingBox;

        let left = thisAbsBox.x;
        let top = thisAbsBox.y;
        let right = left + thisAbsBox.w;
        let bottom = top + thisAbsBox.h;

        for (let name in this.dockingPoints) {
            let child = this.dockingPoints[name].child;
            if (child) {
                let childAbsPosition = child.absolutePosition;
                let childSubBox = child.subtreeBoundingBox;
                let childAbsBox = new Rect(childSubBox.x + childAbsPosition.x, childSubBox.y + child.absolutePosition.y, childSubBox.w, childSubBox.h);
                let childLeft = childAbsBox.x;
                let childTop = childAbsBox.y;
                let childRight = childLeft + childAbsBox.w;
                let childBottom = childTop + childAbsBox.h;

                left = Math.min(left, childLeft);
                top = Math.min(top, childTop);
                right = Math.max(right, childRight);
                bottom = Math.max(bottom, childBottom);
            }
        }

        return new Rect(left - thisAbsPosition.x, top - thisAbsPosition.y, right-left, bottom-top);
    }

    /**
     * @returns The bounding boxes corresponding to this widget's docking points.
     */
    get dockingPointsBoxes(): Array<Rect> {
        let dpBoxes: Array<Rect> = [];
        for (let k in this.dockingPoints) {
            let dp = this.dockingPoints[k];
            if (null == dp.child || undefined == dp.child) {
                dpBoxes.push(new Rect(dp.position.x-this.dockingPointSize/2, dp.position.y-this.dockingPointSize/2, this.dockingPointSize, this.dockingPointSize));
            }
        }
        return dpBoxes;
    }

    /**
     * @returns The bounding box of this widget AND its empty docking points.
     *
     * @see dockingPointsBoxes()
     */
    get dockingPointsBoundingBox(): Rect {
        let ax = this.position.x;
        let ay = this.position.y;
        let thisBox = Rect.fromObject(this.boundingBox());
        let dpBoxes = [thisBox, ...this.dockingPointsBoxes].filter(b => isDefined(b)) as Array<Rect>;

        let x = Math.min(...dpBoxes.map(b => { return b.x+ax }));
        let y = Math.min(...dpBoxes.map(b => { return b.y+ay }));
        let w = Math.max(...dpBoxes.map(b => { return b.x+ax+b.w }));
        let h = Math.max(...dpBoxes.map(b => { return b.y+ay+b.h }));

        return new Rect(x-ax,y-ay,w-x,h-y);
    }

    /**
     * @returns The absolute bounding box of this widget AND docking points, relative to the canvas.
     *
     * @see dockingPointsBoundingBox()
     */
    get absoluteDockingPointsBoundingBox(): Rect {
        let box = this.dockingPointsBoundingBox;
        let pos = this.absolutePosition;

        return new Rect(box.x + pos.x, box.y + pos.y, box.w, box.h);
    }

    /**
     * @returns The (relative?) bounding box of the sub tree AND docking points.
     */
    get subtreeDockingPointsBoundingBox(): Rect {
        let thisAbsPosition = this.absolutePosition;
        let thisAbsBox = this.absoluteDockingPointsBoundingBox;

        let left = thisAbsBox.x;
        let top = thisAbsBox.y;
        let right = left + thisAbsBox.w;
        let bottom = top + thisAbsBox.h;

        for (let name in this.dockingPoints) {
            let child = this.dockingPoints[name].child;
            if (child) {
                let childAbsPosition = child.absolutePosition;
                let childSubBox = child.subtreeDockingPointsBoundingBox;
                let childAbsBox = new Rect(childSubBox.x + childAbsPosition.x, childSubBox.y + child.absolutePosition.y, childSubBox.w, childSubBox.h);
                let childLeft = childAbsBox.x;
                let childTop = childAbsBox.y;
                let childRight = childLeft + childAbsBox.w;
                let childBottom = childTop + childAbsBox.h;

                left = Math.min(left, childLeft);
                top = Math.min(top, childTop);
                right = Math.max(right, childRight);
                bottom = Math.max(bottom, childBottom);
            }
        }

        return new Rect(left - thisAbsPosition.x, top - thisAbsPosition.y, right-left, bottom-top);
    }

    get leftBound(): number {
        return this.dockingPoint.x - this.subtreeDockingPointsBoundingBox.x;
    }

    get rightBound(): number {
        return this.dockingPoint.x - (this.subtreeDockingPointsBoundingBox.x + this.subtreeDockingPointsBoundingBox.w);
    }

    get topBound(): number {
        return this.dockingPoint.y - this.subtreeDockingPointsBoundingBox.y;
    }

    get bottomBound(): number {
        return this.dockingPoint.y - (this.subtreeDockingPointsBoundingBox.y + this.subtreeDockingPointsBoundingBox.h);
    }
}
