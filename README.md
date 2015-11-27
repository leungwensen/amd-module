
# amd-module

A little grave of my AMD loader

## usage

### nodejs

```shell
npm install amd-module
```

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

