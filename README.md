# jsonp-sandbox

这是一个 JSONP 沙箱，可以在浏览器中安全的加载跨站 JSONP 脚本。

## 原理

现代浏览器：

1. 使用 iframe `sandbox="allow-scripts"` 属性，创建安全的脚本执行环境
2. 使用 `postMessage()` 方法 与 `onmessage` 事件与沙箱进行通讯

老版本 IE：

1. IE 不支持 `sandbox` 属性，使用降级方案

## 安装

```
npm install --save jsonp-sandbox
```

## API

`#get(url, options, callback)`

``` javascript
var JSONP = require('jsonp-sandbox');
new JSONP().get('http://api.com/user', function (data) {
    console.log(data);
});
```

## options

* options.name JSONP 指定回调函数名，默认自动生成
* options.param JSONP 指定 KEY，默认 `callback`

例如：

``` javascript
new JSONP().get('http://api.com/users/35', {
    name: 'jsonp_001',
    param: 'jsonp_callback'
})
```

最终请求出去的 URL 类似：

```
http://api.com/users/35?jsonp_callback=jsonp_001
```
