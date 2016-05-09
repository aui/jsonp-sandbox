/*! jsonp-sandbox | https://github.com/aui/jsonp-sandbox */
(function(window) {

    'use strict';


    function JSONP() {

        this.sandbox = document.createElement('iframe');
        this.sandbox.style.display = 'none';
        (document.body || document.documentElement).appendChild(this.sandbox);
        this._setSandboxSrcodc(this._getSandboxCode());

        // iframe sandbox @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe
        this.sandbox.sandbox = 'allow-scripts';
    }

    // 存储所有回调函数
    JSONP._callbacks = {};

    // 监听所有来自沙箱的消息
    JSONP._onmessage = function(event) {

        var message = event.data;

        // IE
        if (typeof message === 'string') {
            try {
                message = JSON.parse(message);
            } catch (e) {
                message = {};
            }
        }

        var id = message.JSONP_ID;
        var callbacks = JSONP._callbacks;

        if (id && callbacks.hasOwnProperty(id)) {
            callbacks[id](message.error, message.data);
            // 仅执行一次
            delete callbacks[id];
        }
    };

    JSONP._count = 0;


    JSONP.get = function() {
        if (!JSONP._sandbox) {
            JSONP._sandbox = new JSONP();
        }
        JSONP._sandbox.get.apply(JSONP._sandbox, arguments);
    };


    JSONP.prototype = {

        constructor: JSONP,


        /**
         * 请求数据
         * @param   {String}    URL
         * @param   {Function}  回调函数-第一个参数接收错误
         */
        get: function(url, options, callback) {

            if ('function' == typeof options) {
                callback = options;
                options = {};
            }

            if (!options) {
                options = {};
            }

            JSONP._count++;

            var id = encodeURIComponent(options.name || 'jsonp' + JSONP._count);

            JSONP._callbacks[id] = callback;
            this._postMessage({
                JSONP_ID: id,
                param: options.param || 'callback',
                data: null,
                url: url
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

                        // IE
                        if (typeof message == 'object') {
                            message = JSON.stringify(message);
                        }

                        window.parent.postMessage(message, '*');
                    }


                    // 接收宿主发送的消息
                    window.onmessage = function(event) {
                        var message = event.data;

                        // IE
                        if (typeof message == 'string') {
                            message = JSON.parse(message);
                        }

                        var id = message.JSONP_ID;
                        var url = message.url;
                        var param = message.param;

                        // 写入全局函数，接受 JSONP 回调
                        window[id] = function(data) {
                            message.data = data;
                            postMessageToHost(message);
                            window[id] = null;
                        };

                        function end(errors) {
                            if (errors) {
                                message.error = errors;
                                postMessageToHost(message);
                                window[id] = null;
                            } else if (window[id]) {
                                message.error = new Error('Wrong format.');
                                postMessageToHost(message);
                            }
                        }

                        getScript(url, end, '&' + param + '=' + id);
                    };


                    // 针对旧版浏览器提供 postMessage 方法
                    if (typeof window.postMessage !== 'function') {
                        window.postMessage = function(message) {
                            // call: IE8
                            window.onmessage.call(window, {
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
                        console.error('JsonpSandboxError:', message);
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
                message = JSON.stringify(message);
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


    if ('onmessage' in window && 'addEventListener' in window) {
        // 现代浏览器
        window.addEventListener('message', JSONP._onmessage, false);
    } else {
        // IE
        window.postMessage = function(message) {
            JSONP._onmessage({
                origin: 'null',
                data: message
            });
        };
    }


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