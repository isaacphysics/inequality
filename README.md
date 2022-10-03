# Inequality

Multi-modal equation entry on the web.

Inequality is the drag-and-drop, symbolic entry system developed for [Isaac Physics](https://isaacphysics.org) for users to enter symbolic maths (and chemistry, and boolean logic) in a way familiar to a high school student who does not know any other specialist syntax.

A [demo](https://isaacphysics.org/equality) is available -- and yes, we are aware of the naming irony here, that's what happens when you rewrite a legacy project.

For information on how to integrate Inequality into your project, please see https://github.com/isaacphysics/isaac-react-app/blob/master/src/app/components/pages/Equality.tsx

## Documentation

Please see [DOCS.md](DOCS.md) and inline code comments.

## Usage

> npm i --save inequality

or

> yarn add inequality

```javascript
import { makeInequality } from 'inequality';

let eqnEditorElement = document.querySelector('.equation-editor')[0];

let { sketch, p } = makeInequality(
    eqnEditorElement,
    eqnEditorElement.width(),
    eqnEditorElement.height(),
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
