# Documentation

This file covers the design choices behind Inequality, a multi-modal equation editor for the web.


## Overview

> Inequality is a multi-modal, graphical, drag-and-drop, symbolic editor for entering mathematical formulæ on the web. Inequality works across all the major web browsers, and across mouse- and touch-based devices. We designed Inequality to present students with the representation of symbolic maths they use in school. We were also keen to provide considerable flexibility in the way students construct and manipulate expressions in order to reduce blind guessing. [[source](https://dl.acm.org/doi/10.1145/3330430.3333625)]

Inequality is implemented as a [p5.js](https://p5js.org/) full-viewport canvas sketch providing a palette of mathematical symbols and functions that can be dragged and dropped around the screen to compose mathematical, boolean logic, and chemical expressions.

If you are unfamiliar with [p5.js](https://p5js.org/), this is a good time to learn. Their [documentation](https://p5js.org/get-started/) is excellent, there is a lot of fun to be had, and if you are still stuck I can only recommend you [watch some of this guy here](https://www.youtube.com/watch?v=HerCR8bw_GE&list=PLRqwX-V7Uu6Zy51Q-x9tMWIv9cueOFTFA), he's just as excellent as p5.js's documentation, and he keeps his videos children-appropriate while tackling some mighty hard coding challenges.


## Expressions

### Drag-and-drop composition

Symbols can be attached to other symbols in sort of a left-to-right way using so called "docking points", little blue place-holding circles that mark the locations where symbols can be meaningfully attached. This may seem like a limitation but it is in fact a practical design choice that improves usability, by providing certainty of outcome, and reduces computational costs, by removing fragile algorithmic guessing. This left-to-right building style gives rise to the slightly unusual syntax tree that Inequality uses internally to transform expressions between formats.

### The Abstract Syntax Tree

Inequality's AST reflects the left-to-right parent-children visual structure of the expressions in that it starts at the root with the "left-most" symbol[^1] and each docked symbol to any node counts as a child to said node. The basic format of a serialized graphical object (`Widget`) is called a `WidgetSpec`:

```typescript
type WidgetSpec = {
    type: string;
    properties: any;
    children?: Array<WidgetSpec>;
    position?: { x: number, y: number };
    expression?: any;
}
```

We will see what a `Widget` is later and in the inline documentation. For now, let's look at an example: the expression `2 * x` generates the following AST, here notated as JSON.

```json
{
  "type": "Num",
  "properties": {
    "significand": "2"
  },
  "children": {
    "right": {
      "type": "Symbol",
      "properties": {
        "letter": "x",
        "modifier": ""
      }
    }
  },
  "position": {
    "x": 360,
    "y": 265
  },
  "expression": {
    "latex": "2 x",
    "python": "2*x"
  }
}
```

- `type`: a string representing the type of the symbol. There are several such types, including `Num` for integers, `Symbol` for letters, `Fn` for functions, and so on. The most comprehensive list is in [`Inequality.ts`](https://github.com/isaacphysics/inequality/blob/master/src/Inequality.ts) at the `_parseSubtreeObject(node: WidgetSpec, parseChildren) => Nullable<Widget>` function. Widgets will be discussed further down.
- `properties`: different types of symbols have different properties. For example, the `Num` type has a `significand` which is essentially the number itself. The `Symbol` object further down has `letter` which is either a Latin or Greek letter, and `modifier` in case a modifier such as `prime` (') needs to be added. For more information on each symbol's properties, please see the source code.
- `children`: this is a collection of symbols attached as descendants, or "to the right", of the current symbol. The keys represent the docking points, and the values are the specs of the corresponding objects. If this object is empty, or some of its keys are missing, the missing values are considered as empty docking points.
- `position` and `expression` are specific to the root object, and thus are optional.
  - `position`: this is the location of the root object on the canvas, only useful when de-serializing and, even then, often ignored.
  - `expression`: this is the representation of the AST as a LaTeX and Python SymPy expression. The SymPy expression is what is sent to the [backend checker](https://github.com/isaacphysics/equality-checker) that evaluates the attempted answer and provides feedback.

This serialized format is only used internally by Inequality. [`inequality-grammar`](https://github.com/isaacphysics/inequality-grammar) parses symbolic expressions and outputs Inequality's AST so that it can be parsed and processed by Inequality in headless mode to generate the various normalized forms of LaTeX, SymPy, and so on, and for interoperability in case a user wants to edit the same expression in two different ways.[^2]


## `Widget`s

In Inequality, everything is a [`Widget`](https://github.com/isaacphysics/inequality/blob/master/src/Widget.ts). More or less. A `Widget` is the graphical and logical representation of the components of Inequality expressions. Widgets can be of many different types -- see [`Inequality.ts`](https://github.com/isaacphysics/inequality/blob/master/src/Inequality.ts) for a comprehensive list -- but they all perform the same basic functions: draw themselves on the canvas (including calculating their own bounding boxes), provide docking points, accept or reject other widgets for docking, shake their own subtree to make sure nothing overlaps, and provide their own serialized form in the requested format. Some of these operations are recursive on the children, and the acyclic graph structure makes sure that recursion always terminates at the leaves -- or at least it should, if you avoid cycles. Some specific widgets may perform some more intricate business logic but these are rare cases.

The most significant and sizeable pieces of code found in widgets are the `draw` function and the bounding boxes calculations. These are tediously long but fairly straightforward, and more or less every widget does the same thing -- though watch out for asymmetrical or oddly-shaped widgets such as functions and radices. `Widget` is the worst offender because it implements base code that is inherited and reused as is by every other widget, so don't be scared.[^3]

There is very little point in going over each type of widget in Inequality so you will find inline documentation wherever relevant. If you think some pieces of docs are missing, check if they are in `Widget.ts` or `Inequality.ts`, and if not just shout. No, really, just go outside and shout, that's what I normally do in these cases. Make sure you do that thoroughly before sending an email to me, I find it usually helps :)

## `Inequality`

This is the object that handles initialization, (de)serialization, GUI events, canvas drawing, state updates, communication with the application that integrates Inequality, and a few other bits.

### Input handling

In every drag-and-drop interface, everything starts with input events in the form of touch down, touch move, touch up -- and equivalent mouse events -- associated with a stream of coordinates corresponding to where these events happen on the canvas. Keeping track of these events, and invoking the relevant hit-testing methods to see if any happen on top of widgets, is the main responsibility of `Inequality`.

Because the web is a horrible platform, multi-touch did not quite work very well across browsers, so we are only dealing with one cursor at a time -- a "cursor" is a generic term for any pointer, be it mouse pointer or fingertip.

You may find the following functions worth exploring: `touchStarted`, `touchMoved`, and `touchEnded`. These work across mouse and touch-based cursor. `mouseMoved` handles a simplified case.

### Docking points

The logic behind docking points is entirely handled here as it is simpler than any recursive alternative. As a symbol is dragged around the canvas, the system calculates the distance between the symbol's "centre" and each empty docking point on the canvas, within a certain threshold.

The closest docking point within the threshold is the candidate for docking if the symbol is dropped where it is, and becomes highlighted to mark its special status. If the currently moving symbol is indeed dropped while a candidate docking point is active, the symbol is docked, which means it is added to the docking point's owner's list of children in the appropriate spot, and relocated to the correct position relative to its newly-found parent to be drawn accordingly.

A symbol can be undocked at any time -- minus very specific exceptions -- and dropped on the canvas, or moved to another docking point.

If desired -- and most of the time you do desire this -- the application surrounding Inequality will want to provide a palette of symbols that can be dragged onto the canvas. Such a palette is not part of Inequality to give you control of its appearance. Inequality provides the concept of "potential symbol" for when a symbol is dragged onto the canvas from the outside, and this is where you can make the connection. It may be a little overwhelming, but [this](https://github.com/isaacphysics/isaac-react-app/blob/master/src/app/components/pages/Equality.tsx) is how we do it on the Isaac platform.

## Demo

A [demo](https://isaacphysics.org/equality) is available.



[^1]: This root may not always actually be the left-most symbol graphically speaking.

[^2]: This is sometimes useful when certain expressions are easy to implement graphically but hard to write in linear text form.

[^3]: As I write this, I realize I'm saying this more for myself than for anyone else reading this because the amount and the complexity of the code I wrote are indeed scary.