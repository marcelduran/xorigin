# XORIGIN

Image Cross-Origin Resource Sharing

## Example

http://xorigin.aws.af.cm/http://t.co/static/images/bird.png

```html
<body>
  <canvas id="canvas"></canvas>
  <div id="data"></div>
</body>
```

```javascript
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'),
img = new Image();

img.onload = function() {
  ctx.drawImage(img, 0, 0, img.width, img.height);
  document.getElementById('data').innerHTML = canvas.toDataURL();
};

// CORS
img.crossOrigin = 'anonymous';
img.src = 'http://xorigin.aws.af.cm/http://t.co/static/images/bird.png';
```

[demo](http://jsbin.com/uyukux/2)
