
# amd-module

A little grave of my AMD loader

## installation

```shell
npm install amd-module --save
```

## usage

### browser

#### standalone mode

```html
<script src="$path/to/this/package/dist/loader.js"></script>
```

#### using with CommonJS

```javascript
require('amd-module/loader'); // then the 'define' function is available
```

here is a [demo](https://github.com/leungwensen/amd-module/tree/master/demo)

### nodejs (no loader available for now, not recomended)

```javascript
var define = require('amd-module/define');

define('my/awesome/amd/module', [
  'amd-module/Module'
], function(
  Module
) {
  Module.on('module-meta-got', function(meta){
    console.log(meta);
  });
});
```

