# Inequality

Multi-modal equation entry on the web.

Inequality is the drag-and-drop, symbolic entry system developed for [Isaac Physics](https://isaacphysics.org) for users to enter symbolic maths (and chemistry, and boolean logic) in a way familiar to a high school student who does not know any other specialist syntax.

This package is currently a little hard to integrate but worry not for instructions will eventually appear.

Somewhere.

Maybe.

Meanwhile, a [demo](https://isaacphysics.org/equality) is available -- and yes, we are aware of the naming irony here, that's what happens when you rewrite a legacy project.

## Usage

> npm i --save inequality

```javascript
import { makeInequality } from 'inequality';

let eqnEditorElement = document.querySelector('.equation-editor')[0];

let { sketch, p } = makeInequality(
    eqnEditorElement,
    eqnEditorElement.width() * Math.ceil(window.devicePixelRatio),
    eqnEditorElement.height() * Math.ceil(window.devicePixelRatio),
    [], // place your initial symbols here
    {
        fontItalicPath: 'assets/STIXGeneral-Italic.ttf', // Yes, this is a little awkward but p5 wants to load fonts from paths...
        fontRegularPath: 'assets/STIXGeneral-Regular.ttf',
    }
);
sketch.log = { initialState: [], actions: [] };
sketch.onNewEditorState = (s) => { /* Do something with the new state */ };
sketch.onCloseMenus = () => { /* You can use this to close menus if you have hiding menus */ };
sketch.isUserPrivileged = () => { /* Just return true here :) */ };
sketch.onNotifySymbolDrag = (x, y) => { /* This is useful with external menus */ };
sketch.isTrashActive = () => { /* This is useful when some menu elements or buttons are DOM elements */ };
```