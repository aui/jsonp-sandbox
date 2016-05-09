# jsonp-sandbox

[![NPM Version][npm-image]][npm-url]

这是一个基于浏览器标准实现的 JSONP 运行沙箱，可以在沙箱环境中加载跨站 JSONP 脚本，杜绝恶意脚本攻击。

## 原理

现代浏览器：

1. 使用 iframe `sandbox="allow-scripts"` 属性，创建安全的脚本执行环境
2. 使用 `postMessage()` 方法 与 `message` 事件与沙箱进行通讯

老版本 IE（\<=8）：

1. 不支持 `sandbox` 特性，使用降级方案，仅保证数据获取功能

## 安装

直接引入：

``` html
<script src="dest/jsonp-sandbox.min.js"></script>
```

或通过 Npm 安装：

``` shell
npm install --save jsonp-sandbox
```

## API

**JSONP.get(url, options, callback)**

``` javascript
var JSONP = require('jsonp-sandbox');
JSONP.get('http://api.com/user', function (error, data) {
    if (!error) {
        console.log(data); 
    }
});
```

**options**

* options.name JSONP 指定回调函数名，默认自动生成
* options.param JSONP 指定 KEY，默认 `callback`

例如：

``` javascript
JSONP.get('http://api.com/users/35', {
    name: 'jsonp_001',
    param: 'jsonp_callback'
})
```

最终请求出去的 URL 类似：

```
http://api.com/users/35?jsonp_callback=jsonp_001
```


[npm-image]: https://img.shields.io/npm/v/jsonp-sandbox.svg
[npm-url]: https://npmjs.org/package/jsonp-sandbox