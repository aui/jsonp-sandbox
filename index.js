/*! jsonp-sandbox | https://github.com/aui/jsonp-sandbox */
(function(window, HTML5_SANDBOX) {

    'use strict';

    function Sandbox() {
        this._messageQueue = [];
        this.sandbox = this._createSandbox();
    }

    Sandbox._callbacks = {};
    Sandbox._count = 0;
    Sandbox._token = '#' + Math.random();

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
         * @param   {object}    可选项
         */
        get: function(options) {

            if (!this.sandbox) {
                throw new Error('JSONP.Sandbox has been destroyed.');
            }

            if (typeof options === 'string') {
                options = {
                    url: options,
                    success: arguments[1],
                    error: arguments[2]
                };
            }

            Sandbox._count++;

            var url = options.url;
            var key = options.key || 'callback';
            var value = options.value || 'jsonp' + Sandbox._count;
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


            var id = Sandbox._count + Sandbox._token;
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
            var that = this;
            var sandbox = document.createElement('iframe');
            var target = document.body || document.documentElement;

            sandbox.style.display = 'none';
            target.appendChild(sandbox);

            var srcdoc = this._getSandboxCode();

            // 必须在 sandbox='allow-scripts' 设置之前拿到引用，否则 IE10/Edge 会拒绝访问
            var contentDocument = sandbox.contentWindow.document;

            // iframe sandbox @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe
            // IE 调试程序模拟 IE8，sandbox 会生效，所以这里加了个判断
            if (HTML5_SANDBOX) {
                sandbox.sandbox = 'allow-scripts';
            }


            if ('srcdoc' in sandbox) {
                // chrome、firefox、safari 的 sandbox='allow-scripts' 特性只能使用 srcdoc
                sandbox.srcdoc = srcdoc;
                sandbox.onload = function() {
                    sandbox.onload = null;
                    that._onready(sandbox);
                };
            } else {
                // IE6-Edge
                contentDocument = sandbox.contentWindow.document;
                contentDocument.open();
                contentDocument.write(srcdoc);
                contentDocument.close();
                this._onready(sandbox);
            }

            return sandbox;
        },


        // 向沙箱发送消息
        _postMessage: function(message) {
            this._messageQueue.push(message);
        },


        _onready: function(sandbox) {
            var contentWindow = sandbox.contentWindow;

            var send = function(message) {
                if (HTML5_SANDBOX) {
                    contentWindow.postMessage(message, '*');
                } else {
                    contentWindow.__postMessage__(message);
                }
            };

            for (var i = 0; i < this._messageQueue.length; i++) {
                send(this._messageQueue[i]);
            }

            delete this._messageQueue;
            this._postMessage = send;
        },


        // 获取沙箱的预置代码
        _getSandboxCode: function() {

            var inject = [HTML5_SANDBOX, 'window', 'parent', 'document', 'setTimeout', 'clearTimeout'];

            /**
             * 沙箱内部控制脚本
             * 此函数会被转成字符串在沙箱内部运行，所以函数内部不能引用任何外部对象（闭包）
             */
            var script = function(HTML5_SANDBOX, window, parent, document, setTimeout, clearTimeout) {

                var execScript = window.execScript; // jshint ignore:line
                var addEventListener = window.addEventListener;
                var attachEvent = window.attachEvent;
                var createElement = document.createElement;
                var body = document.body;
                var appendChild = body.appendChild;
                var removeChild = body.removeChild;

                // 删除 DOM API
                // IE9 以及现代浏览器的 document 是常量无法删除
                // 这里通过删除 document 的原型继承属性与方法,
                // 拒绝外部脚本操作 DOM，避免不支持 sandbox 浏览器的 cookie 泄漏
                function removeDomApi() {
                    removeProto('Node');
                    removeProto('Document');
                    removeProto('HTMLDocument');

                    function removeProto(name) {
                        var controller = window[name];
                        if (controller) {
                            var proto = controller.prototype;
                            for (var key in proto) {
                                if (key !== 'close') {
                                    try {
                                        delete proto[key];
                                    } catch (e) {}
                                }
                            }
                        }
                    }
                }

                // 删除 BOM API
                // 如果删掉 BOM API，不支持 sandbox 的浏览器无法拿到父窗口引用，
                // 从而达到 sandbox 的效果
                function removeBomApi() {
                    var code = [];
                    var blackList = window;

                    // 如果发起请求，可能泄漏 cookie
                    blackList.Image = true;
                    blackList.ActiveXObject = true;
                    blackList.XMLHttpRequest = true;
                    blackList.execScript = true;


                    var whiteList = {
                        postMessage: true,
                        console: true,
                        location: true
                    };

                    for (var key in blackList) {
                        if (!whiteList[key]) {
                            try {
                                // <IE8 delete 会报错
                                delete window[key];
                            } catch (e) {}

                            // IE 的全局对象 delete 无效，只有定义同名函数才可以覆盖
                            if (key in window) {
                                code.push('function ' + key + '(){}');
                            }
                        }
                    }

                    code = code.join('');

                    if (execScript) { // jshint ignore:line
                        execScript(code); // jshint ignore:line
                    }
                }



                // 请求外部脚本
                function getScript(url, success, error) {
                    var script = createElement.call(document, 'script');
                    script.onload = script.onreadystatechange = function() {

                        var isReady = !script.readyState || /loaded|complete/.test(script.readyState);

                        if (isReady) {

                            script.onload = script.onreadystatechange = null;
                            removeChild.call(body, script);

                            success();
                        }

                    };

                    script.onerror = error;
                    script.src = url;
                    appendChild.call(body, script);
                }


                // 向宿主发送消息
                function postMessageToHost(message) {
                    if (message.error) {
                        message.error = message.error.toString();
                    }

                    if (HTML5_SANDBOX) {
                        parent.postMessage(message, '*');
                    } else {
                        parent.__postMessage__(message);
                    }
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


                removeBomApi();
                removeDomApi();


                window.onerror = function(message) {
                    console.warn('JSONP.Sandbox:', message);
                };


                if (HTML5_SANDBOX) {
                    addEventListener('message', onmessage, false);
                } else {
                    window.__postMessage__ = function(message) {
                        onmessage({
                            data: message
                        });
                    };

                    // 禁止沙箱内跳转新地址
                    // location 变量无法覆盖，新页面可以使用 top.location 来改变父页面地址
                    if (addEventListener) {
                        addEventListener('unload', killSandbox);
                    } else {
                        attachEvent('onunload', killSandbox);
                    }
                }

                function killSandbox() {
                    location.href = 'about:blank';
                }

            };

            return '<html><head></head><body><script>' +
                '(' + script.toString() + ')(' + inject.join(',') + ')' +
                '</script></body></html>';
        }
    };


    if (HTML5_SANDBOX) {
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


})(window, window.HTMLIFrameElement ? 'sandbox' in HTMLIFrameElement.prototype : false);