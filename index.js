/*! jsonp-sandbox | https://github.com/aui/jsonp-sandbox */
(function(window) {

    'use strict';

    // 标识通讯 token，避免安全漏洞
    // target="_blank" 弹出的页面可以拿到 opener，从而有机会伪造消息
    // @see http://www.zcfy.cc/article/1178
    var _token = '#' + Math.random();
    var _count = 0;


    function noop() {}



    function Sandbox() {

        this.sandbox = document.createElement('iframe');
        this.sandbox.style.display = 'none';
        this._setSandboxSrcodc(this._getSandboxCode());
        (document.body || document.documentElement).appendChild(this.sandbox);


        // iframe sandbox @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe
        this.sandbox.sandbox = 'allow-scripts';
    }

    // 存储所有回调函数
    Sandbox._callbacks = {};

    // 处理消息
    Sandbox._onmessage = function(event) {
        // IE8
        event = event || window.event;

        var message = event.data;

        // IE
        if (window.JSON && typeof message === 'string') {
            try {
                // IE8、IE9 只支持传递字符串
                message = JSON.parse(message);
            } catch (e) {
                message = {};
            }
        }

        var id = message.id;
        var callbacks = Sandbox._callbacks;

        if (callbacks.hasOwnProperty(id)) {
            callbacks = callbacks[id];
            if (message.error) {
                callbacks[1](message.error);
            } else {
                callbacks[0](message.response);
            }
            // 仅执行一次
            delete callbacks[id];
        }
    };


    Sandbox.prototype = {

        constructor: Sandbox,


        /**
         * 请求数据
         */
        get: function(options) {

            if (typeof options === 'string') {
                options = {
                    url: options,
                    success: arguments[1],
                    error: arguments[2]
                };
            }

            var url = options.url;
            var key = options.key || 'callback';
            var value = options.value || 'jsonp' + _count;
            var success = options.success || noop;
            var error = options.error || noop;
            var data = options.data || {};

            var encode = window.encodeURIComponent;

            var param = [];
            for (var k in data) {
                param.push(encode(k) + '=' + encode(data[k]));
            }
            param = param.join('&');
            url = /\?/.test(url) ? url + param : url + '?' + param;

            _count++;
            var id = _count + _token;
            Sandbox._callbacks[id] = [success, error];

            this._postMessage({
                id: id,
                url: url,
                value: value,
                key: key
            });
        },


        /**
         * 销毁沙箱
         */
        destroy: function() {
            this.sandbox.src = 'about:blank';
            this.sandbox.srcdoc = '';
            this.sandbox.parentNode.removeChild(this.sandbox);
            this.sandbox = null;
        },


        // 设置沙箱预置代码
        _setSandboxSrcodc: function(srcdoc) {
            var sandbox = this.sandbox;
            var contentDocument;

            if ('srcdoc' in sandbox) {
                sandbox.srcdoc = srcdoc;
            } else {
                this.sandbox.src = 'about:blank';
                contentDocument = sandbox.contentWindow.document;
                contentDocument.open();
                contentDocument.write(srcdoc);
                contentDocument.close();
            }
        },

        // 获取沙箱的预置代码
        // 注意：此函数不能有外部依赖
        _getSandboxCode: function() {
            return '<html>' +
                '<head>' +
                '</head>' +
                '<body>' +
                '<script>' +
                '(' + (function(window) {


                    // 向宿主发送消息
                    function postMessageToHost(message) {
                        if (message.error) {
                            message.error = message.error.toString();
                        }

                        if (window.JSON) {
                            // IE8、IE9 只支持传递字符串
                            message = JSON.stringify(message);
                        }

                        window.parent.postMessage(message, '*');
                    }


                    // 接收来自宿主的消息
                    window.onmessage = function(event) {
                        // IE8
                        event = event || window.event;

                        var message = event.data;

                        if (window.JSON) {
                            // IE8、IE9 只支持传递字符串
                            message = JSON.parse(message);
                        }

                        var value = message.value;
                        var url = message.url;
                        var key = message.key;

                        // 写入全局函数，跨站脚本将会运行此函数
                        window[value] = function(data) {
                            message.response = data;
                            // IE delete 会报“SCRIPT445: 对象不支持此操作”
                            window[value] = null;
                        };


                        // 处理错误
                        function end(errors) {
                            if (!errors && typeof message.response === 'undefined') {
                                errors = new Error('Wrong format.');
                            }

                            if (errors) {
                                message.error = errors;
                            }

                            postMessageToHost(message);
                        }

                        getScript(url, end, '&' + encodeURIComponent(key) + '=' + encodeURIComponent(value));
                    };


                    // 针对旧版浏览器提供 postMessage 方法
                    // IE8: typeof window.postMessage === 'object'
                    if (!window.postMessage) {
                        window.postMessage = function(message) {
                            window.onmessage({
                                data: message
                            });
                        };
                    }


                    // 请求外部脚本
                    function getScript(url, callback) {

                        var query = arguments[2] || '';
                        var ts = +new Date();
                        var ret = url.replace(/([?&])_=[^&]*/, '$1_=' + ts);


                        url = ret + ((ret === url) ? (/\?/.test(url) ? '&' : '?') + '_=' + ts : '');
                        url = url + query;

                        var script = document.createElement('script');

                        //script.crossOrigin = true;
                        script.onload = script.onreadystatechange = function() {

                            var isReady = !script.readyState || /loaded|complete/.test(script.readyState);

                            if (isReady) {

                                script.onload = script.onreadystatechange = null;
                                document.body.removeChild(script);

                                if (callback) {
                                    callback(null);
                                }
                            }

                        };

                        script.onerror = function() {
                            callback(new Error('Failed to load: ' + script.src));
                        };

                        script.src = url;
                        document.body.appendChild(script);
                    }


                    window.onerror = function(message) {
                        console.warn('JSONP.Sandbox:', message);
                    };


                }).toString() +
                ')(window)' +
                '</script>' +
                '</body>' +
                '</html>';
        },

        // 向沙箱发送消息
        _postMessage: function(message) {
            var that = this;

            if (this._sandboxReady || !('srcdoc' in this.sandbox)) {
                if (window.JSON) {
                    // IE8、IE9 只支持传递字符串
                    message = JSON.stringify(message);
                }
                this.sandbox.contentWindow.postMessage(message, '*');
            } else {
                // 使用 iframe.srcdoc 需要等待加载完毕才可以进行 postMessage 操作
                if (!this.sandbox.onload) {
                    this._queue = [];
                    this.sandbox.onload = function() {
                        that._sandboxReady = true;
                        for (var i = 0; i < that._queue.length; i++) {
                            that._postMessage(that._queue[i]);
                        }
                        delete that.sandbox.onload;
                        delete that._queue;
                    };
                }

                this._queue.push(message);
            }
        }
    };


    if (window.postMessage) {
        // 现代浏览器
        if (window.addEventListener) {
            window.addEventListener('message', Sandbox._onmessage, false);
            // IE8
        } else {
            window.attachEvent('onmessage', Sandbox._onmessage);
        }
    } else if (!window.postMessage) {
        // <IE8
        window.postMessage = function(message) {
            Sandbox._onmessage({
                data: message
            });
        };
    }


    var JSONP = {
        get: function() {
            if (!JSONP._sandbox) {
                JSONP._sandbox = new Sandbox();
            }
            JSONP._sandbox.get.apply(JSONP._sandbox, arguments);
        },
        Sandbox: Sandbox
    };


    if (typeof define === 'function') {
        define(function() {
            return JSONP;
        });
    } else if (typeof module === 'object') {
        module.exports = JSONP;
    } else {
        window.JSONP = JSONP;
    }


})(window);