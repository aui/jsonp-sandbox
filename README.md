# jsonp-sandbox

[![NPM Version][npm-image]][npm-url]

jsonp-sandbox 是一个基于浏览器标准实现的 `JSONP` 运行沙箱，通过它可以安全的加载 `JSONP`。

> JSONP 是一个业界广为使用的跨域获取数据的解决方案，它原理是加载动态生产的 `script` 内容而实现跨域。由于实现机制，JSONP 很容产生安全问题，例如脚本被黑客或者运营商劫持等。

## 原理

现代浏览器：

1. 使用 iframe `sandbox="allow-scripts"` 属性，创建安全的脚本执行环境
2. 使用 `postMessage()` 方法 与 `message` 事件与沙箱进行通讯

老版本 IE（\<=8）：

1. 由于 iframe 不支持 `sandbox` 特性，防御会降级

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

**JSONP.get(url, success, error)**

``` javascript
var JSONP = require('jsonp-sandbox');
JSONP.get('http://api.com/user', function (data) {
    console.log(data);
});
```

**JSONP.get(options)**

**options**

* `url` 请求的 URL
* `value` JSONP 指定回调函数名，默认自动生成
* `key` JSONP 指定 KEY，默认 `callback`
* `success` 成功回调
* `error` 失败回调
* `data` URL 附加的请求数据

例如：

``` javascript
JSONP.get('http://api.com/users/35', {
    value: 'jsonp_001',
    key: 'callback'
})
```

最终请求出去的 URL 类似：

```
http://api.com/users/35?callback=jsonp_001
```

## 演示

[xss.js](xss.js) 是一段模拟的恶意 JSONP 脚本：

```javascript
jsonp_callback({
    name: '糖饼',
    weibo: 'http://weibo.com/planeart'
});

// 模拟恶意脚本修改页面
top.document.getElementById('sandbox').innerHTML = 'false';
```

使用 jsonp-sandbox 安全加载 [xss.js](xss.js)：

<https://jsbin.com/yomiduwoso/edit?html,output>

[npm-image]: https://img.shields.io/npm/v/jsonp-sandbox.svg
[npm-url]: https://npmjs.org/package/jsonp-sandbox