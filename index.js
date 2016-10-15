/*! jsonp-sandbox | https://github.com/aui/jsonp-sandbox */
(function(window) {

    'use strict';

    // 标识通讯 token，避免安全漏洞
    // target="_blank" 弹出的页面可以拿到 opener，从而有机会伪造消息
    // @see http://www.zcfy.cc/article/1178
    var _token = '#' + Math.random();
    var _count = 0;
    var _hasPostMessage = window.postMessage && window.JSON;


    function Sandbox() {
        this.sandbox = this._createSandbox();
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

            _count++;

            var url = options.url;
            var key = options.key || 'callback';
            var value = options.value || 'jsonp' + _count;
            var success = options.success || noop;
            var error = options.error || noop;
            var data = options.data || {};
            var cache = options.cache !== false;

            var encode = window.encodeURIComponent;
            var params= [];

            for (var k in data) {
                params.push(encode(k) + '=' + encode(data[k]));
            }

            if (cache) {
                params.push('_=' + (+ new Date()));
            }

            params.push(encode(key) + '=' + encode(value));

            params = params.join('&');
            url = /\?/.test(url) ? url + '&' + params : url + '?' + params;


            var id = _count + _token;
            Sandbox._callbacks[id] = [success, error];

            function noop() {}

            this._postMessage({
                id: id,
                url: url,
                value: value
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


        // 创建沙箱
        _createSandbox: function() {
            var sandbox = document.createElement('iframe');
            var target = document.body || document.documentElement;

            sandbox.style.display = 'none';
            target.appendChild(sandbox);

            var srcdoc = this._getSandboxCode();

            // 必须在 sandbox='allow-scripts' 设置之前拿到引用，否则 IE10/Edge 会拒绝访问
            var contentDocument = sandbox.contentWindow.document;

            // iframe sandbox @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe
            sandbox.sandbox = 'allow-scripts';

            if ('srcdoc' in sandbox) {
                // chrome、firefox、safari 的 sandbox='allow-scripts' 特性只能使用 srcdoc
                sandbox.srcdoc = srcdoc;
            } else {
                // IE6-Edge
                contentDocument = sandbox.contentWindow.document;
                contentDocument.open();
                contentDocument.write(srcdoc);
                contentDocument.close();
            }

            return sandbox;
        },


        // 向沙箱发送消息
        _postMessage: function(message) {
            var that = this;
            var sandbox = this.sandbox;

            if (this._sandboxReady || !('srcdoc' in sandbox)) {
                if (window.JSON) {
                    // IE8、IE9 只支持传递字符串
                    message = JSON.stringify(message);
                }
                sandbox.contentWindow.postMessage(message, '*');
            } else {
                // 使用 iframe.srcdoc 需要等待加载完毕才可以进行 postMessage 操作
                if (!sandbox.onload) {
                    this._queue = [];
                    sandbox.onload = function() {
                        that._sandboxReady = true;
                        for (var i = 0; i < that._queue.length; i++) {
                            that._postMessage(that._queue[i]);
                        }
                        delete sandbox.onload;
                        delete that._queue;
                    };
                }

                this._queue.push(message);
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
                '(' + (function(window, parent, execScript, postMessage, JSON, Document, document, body, createElement) {

                    var hasPostMessage = postMessage && JSON;

                    // IE6-IE9 不支持 sandbox
                    // 采用改写全局对象的方式来来模拟：避免拿到父窗口句柄
                    if (execScript) {
                        var code = [];
                        var blackList = window;
                        var whiteList = {
                            console: true,
                            onmessage: true,
                            postMessage: true,
                            event: true
                        };
                        for (var key in blackList) {
                            if (!whiteList[key]) {
                                code.push('function ' + key + '(){}');
                            }
                        }
                        code = code.join('');
                        execScript(code); // jshint ignore:line
                    }

                    // IE9 不支持 sandbox 且 document 是常量，这里避免 cookie 等敏感信息被泄漏
                    if (Document) {
                        Object.keys(Document.prototype).forEach(function(key) {
                            if (key !== 'close') {
                                delete Document.prototype[key];
                            }
                        });
                    }


                    // 向宿主发送消息
                    function postMessageToHost(message) {
                        if (message.error) {
                            message.error = message.error.toString();
                        }

                        if (JSON) {
                            // IE8、IE9 只支持传递字符串
                            message = JSON.stringify(message);
                        }

                        if (hasPostMessage) {
                            parent.postMessage(message, '*');
                        } else {
                            parent.__postMessage__(message, '*');
                        }
                    }


                    // 接收来自宿主的消息
                    window.onmessage = function(event) {

                        // IE8
                        event = event || window.event;
                        var message = event.data;

                        if (JSON) {
                            // IE8、IE9 只支持传递字符串
                            message = JSON.parse(message);
                        }

                        var value = message.value;
                        var url = message.url;

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

                        getScript(url, end);
                    };


                    // 针对旧版浏览器提供 postMessage 方法
                    // IE8: typeof window.postMessage === 'object'
                    if (!hasPostMessage) {
                        window.postMessage = function(message) {
                            window.onmessage({
                                data: message
                            });
                        };
                    }


                    // 请求外部脚本
                    function getScript(url, callback) {
                        var script = createElement.call(document, 'script');

                        //script.crossOrigin = true;
                        script.onload = script.onreadystatechange = function() {

                            var isReady = !script.readyState || /loaded|complete/.test(script.readyState);

                            if (isReady) {

                                script.onload = script.onreadystatechange = null;
                                body.removeChild(script);

                                if (callback) {
                                    callback(null);
                                }
                            }

                        };

                        script.onerror = function() {
                            callback(new Error('Failed to load: ' + script.src));
                        };

                        script.src = url;
                        body.appendChild(script);
                    }


                    window.onerror = function(message) {
                        console.warn('JSONP.Sandbox:', message);
                    };

                }).toString() +
                ')(' + ['window', 'parent', 'window.execScript', 'window.postMessage', 'window.JSON', 'window.Document',
                    'document', 'document.body', 'document.createElement'
                ].join(',') + ')' +
                '</script>' +
                '</body>' +
                '</html>';
        }
    };


    if (_hasPostMessage) {
        // 现代浏览器
        if (window.addEventListener) {
            window.addEventListener('message', Sandbox._onmessage, false);
            // IE8
        } else {
            window.attachEvent('onmessage', Sandbox._onmessage);
        }
    } else {
        // <IE8
        window.__postMessage__ = function(message) {
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