# jsonp-sandbox

[![NPM Version][npm-image]][npm-url]

jsonp-sandbox 是一个 `JSONP` 运行沙箱，通过它可以安全的加载 `JSONP`。

> JSONP 是一个业界广为使用的跨域获取数据的解决方案，它原理是加载动态生产的 `script` 内容而实现跨域。由于实现机制，JSONP 很容产生安全问题，例如脚本被黑客或者运营商劫持等。

## 原理

构造与父页面隔离的 iframe 环境来加载 `JSONP` 脚本，这个环境不允许使用 `parent` 与 `document.cookie` 等危险属性。沙箱实现原理：

现代浏览器：

1. 使用 iframe `sandbox="allow-scripts"` 属性，创建安全的脚本执行环境
2. 使用 `postMessage()` 方法 与 `message` 事件与沙箱进行通讯

老版本 IE（\<=9）：

1. 使用**黑魔法**重写 iframe 全局对象，使得与父页面彻底隔离

[查看更多](https://github.com/aui/jsonp-sandbox/wiki)

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
* `timeout` 超时

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

```javascript
document.cookie = 'hello world';

JSONP.get({
    url: 'https://rawgit.com/aui/jsonp-sandbox/master/test/xss.js',
    value: 'jsonp_callback',
    success: function (data) {
        console.log(data);
    },
    error: function(errors) {
        console.error(errors);
    }
});
```

[在线运行](https://rawgit.com/aui/jsonp-sandbox/master/test/xss.html)

示例中的 [xss.js](https://rawgit.com/aui/jsonp-sandbox/master/test/xss.js) 是一段包含的恶意代码的 JSONP 脚本，使用 jsonp-sandbox 可以安全的加载它。

## 兼容性

IE8+（IE6、IE7 没有机器测试）、Chrome、Firefox、Safari

[npm-image]: https://img.shields.io/npm/v/jsonp-sandbox.svg
[npm-url]: https://npmjs.org/package/jsonp-sandbox