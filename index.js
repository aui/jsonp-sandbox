/*! jsonp-sandbox | https://github.com/aui/jsonp-sandbox */
(function(window) {

    'use strict';

    // 标识通讯 token，避免安全漏洞
    // target="_blank" 弹出的页面可以拿到 opener，从而有机会伪造消息
    // @see http://www.zcfy.cc/article/1178
    var _token = '#' + Math.random();
    var _count = 0;
    var _hasSandbox = window.HTMLIFrameElement ? 'sandbox' in HTMLIFrameElement.prototype : false;

    function Sandbox() {
        this.sandbox = this._createSandbox();
    }

    // 存储所有回调函数
    Sandbox._callbacks = {};

    // 处理消息
    // 这里可能会接收到其他程序发送过来的消息
    Sandbox._onmessage = function(event) {
        var message = event.data;

        if (typeof message !== 'object' || message === null) {
            return;
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
            var timeout = options.timeout || 0;

            var encode = window.encodeURIComponent;
            var params = [];

            for (var k in data) {
                params.push(encode(k) + '=' + encode(data[k]));
            }

            if (cache) {
                params.push('_=' + (+new Date()));
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
                value: value,
                timeout: timeout
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

            var srcdoc = this._getSandboxCode(_hasSandbox);

            // 必须在 sandbox='allow-scripts' 设置之前拿到引用，否则 IE10/Edge 会拒绝访问
            var contentDocument = sandbox.contentWindow.document;

            // iframe sandbox @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe
            // IE 调试程序模拟 IE8，sandbox 会生效，所以这里加了个判断
            if (_hasSandbox) {
                sandbox.sandbox = 'allow-scripts';
            }


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
            var contentWindow = sandbox.contentWindow;
            var sendMessage = _hasSandbox ? 'postMessage' : '__postMessage__';

            if (this._sandboxReady || !('srcdoc' in sandbox)) {
                contentWindow[sendMessage](message, '*');
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
        _getSandboxCode: function(hasSandbox) {

            var inject = [hasSandbox, 'window', 'parent', 'window.execScript',
                'window.Document', 'setTimeout', 'clearTimeout',
                'document', 'document.body', 'document.createElement'
            ];

            /**
             * 沙箱内部控制脚本
             * 此函数会被转成字符串在沙箱内部运行，所以函数内部不能引用任何外部对象（闭包）
             */
            var script = function(hasSandbox, window, parent, execScript,
                Document, setTimeout, clearTimeout,
                document, body, createElement) {

                // IE6-IE9 不支持 sandbox
                // 采用改写全局对象的方式来来模拟：避免拿到父窗口句柄
                if (!hasSandbox && execScript) {
                    var code = [];
                    var blackList = window;

                    var whiteList = {
                        console: true
                    };

                    for (var key in blackList) {
                        if (!whiteList[key]) {
                            code.push('function ' + key + '(){}');
                        }
                    }
                    code = code.join('');
                    execScript(code); // jshint ignore:line
                }

                // IE9 不支持 sandbox 且 document 是常量无法改写
                // 删除 document 成员，避免 cookie 等敏感信息被泄漏
                if (Document) {
                    Object.keys(Document.prototype).forEach(function(key) {
                        if (key !== 'close') {
                            delete Document.prototype[key];
                        }
                    });
                }


                // 请求外部脚本
                function getScript(url, success, error) {
                    var script = createElement.call(document, 'script');

                    //script.crossOrigin = true;
                    script.onload = script.onreadystatechange = function() {

                        var isReady = !script.readyState || /loaded|complete/.test(script.readyState);

                        if (isReady) {

                            script.onload = script.onreadystatechange = null;
                            body.removeChild(script);

                            success();
                        }

                    };

                    script.onerror = error;
                    script.src = url;
                    body.appendChild(script);
                }


                window.onerror = function(message) {
                    console.warn('JSONP.Sandbox:', message);
                };


                // 向宿主发送消息
                function postMessageToHost(message) {
                    var sendMessage = hasSandbox ? 'postMessage' : '__postMessage__';
                    if (message.error) {
                        message.error = message.error.toString();
                    }

                    parent[sendMessage](message, '*');
                }


                // 接收来自宿主的消息
                function onmessage(event) {

                    var message = event.data;
                    var timer, loaded;

                    var value = message.value;
                    var url = message.url;
                    var timeout = message.timeout;

                    // 写入全局函数，跨站脚本将会运行此函数
                    window[value] = function(data) {
                        message.response = data;
                        // IE delete 会报“SCRIPT445: 对象不支持此操作”
                        window[value] = null;
                    };


                    function end() {
                        if (!loaded) {
                            if (timeout) {
                                clearTimeout(timer);
                            }
                            postMessageToHost(message);
                            loaded = true;
                        }
                    }


                    if (timeout) {
                        timer = setTimeout(function() {
                            message.error = new Error('Timeout.');
                            end();
                        }, timeout);
                    }

                    getScript(url, function() {
                        if (typeof message.response === 'undefined') {
                            message.error = new Error('Wrong format.');
                        }

                        end();
                    }, function() {
                        message.error = new Error('Failed to load: ' + url);
                        end();
                    });
                }


                if (hasSandbox) {
                    window.addEventListener('message', onmessage, false);
                } else {
                    window.__postMessage__ = function(message) {
                        onmessage({
                            data: message
                        });
                    };
                }

            };

            return '<html><head></head><body><script>' +
                '(' + script.toString() + ')(' + inject.join(',') + ')' +
                '</script></body></html>';
        }
    };


    if (_hasSandbox) {
        window.addEventListener('message', Sandbox._onmessage, false);
    } else {
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