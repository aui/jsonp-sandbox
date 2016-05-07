(function(global) {

    'use strict';


    function JSONP() {

        // iframe sandbox @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe
        this.sandbox = document.createElement('iframe');
        this.sandbox.name = 'jsonp-sandbox';
        this.sandbox.style.display = 'none';
        this.sandbox.sandbox = 'allow-scripts';
        this._ids = [];

        (document.body || document.head).appendChild(this.sandbox);
        this._setSandboxSrcodc(this._getSandboxCode());
    }

    // 存储所有回调函数
    JSONP._callbacks = {};

    // 监听所有来自沙箱的消息
    JSONP._onmessage = function(event) {

        if (event.origin !== 'null') {
            return;
        }

        var message = event.data;
        var id = message.JSONP_ID;
        var callbacks = JSONP._callbacks;

        if (id && callbacks.hasOwnProperty(id)) {
            callbacks[id](message.data);
            // 仅执行一次
            delete callbacks[id];
        }
    };


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
         * @param   {Function}  成功的回调函数
         */
        get: function(url, options, callback) {

            if ('function' == typeof options) {
                callback = options;
                options = {};
            }

            if (!options) {
                options = {};
            }

            var id = encodeURIComponent(options.name || 'sandbox' + Date.now());
            this._onmessage(id, callback);
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
            window.removeEventListener('message', this._onmessage, false);
            this.sandbox.src = 'about:blank';
            this.sandbox.srcdoc = '';
            this.sandbox.parentNode.removeChild(this.sandbox);
            for (var i = 0; i < this._ids.length; i++) {
                delete JSONP._callbacks[this._ids[i]];
            }
        },

        // 设置沙箱预置代码
        _setSandboxSrcodc: function(srcdoc) {
            var sandbox = this.sandbox;
            var contentDocument;

            if ('sandbox' in sandbox) {
                sandbox.srcdoc = srcdoc;
            } else {
                this.sandbox.src = 'about:blank';
                contentDocument = sandbox.contentWindow.document;
                contentDocument.open();
                contentDocument.write(srcdoc);
                contentDocument.close();
            }
        },

        // 获取沙箱的预置代码 - 注意此函数不能有外部依赖
        _getSandboxCode: function() {
            return '<html>' +
                '<head>' +
                '<script>' +
                '(' + (function() {

                    // 请求外部脚本
                    function getScript(url, callback) {

                        var query = arguments[2] || '';
                        var ts = +new Date();
                        var ret = url.replace(/([?&])_=[^&]*/, "$1_=" + ts);


                        url = ret + ((ret === url) ? (/\?/.test(url) ? '&' : '?') + '_=' + ts : '');
                        url = url + query;

                        var script = document.createElement('script');
                        script.async = 'async';

                        script.onload = script.onreadystatechange = function() {

                            var isReady = !script.readyState || /loaded|complete/.test(script.readyState);

                            if (isReady) {

                                script.onload = script.onreadystatechange = null;
                                document.documentElement.removeChild(script);

                                if (callback) {
                                    callback();
                                }
                            }

                        };

                        script.src = url;
                        document.documentElement.appendChild(script);
                    }


                    // 向宿主发送消息
                    function postMessageToHost(message) {
                        window.parent.postMessage(message, '*');
                    }


                    // 接收宿主发送的消息
                    window.onmessage = function(event) {
                        var message = event.data;
                        var id = message.JSONP_ID;
                        var url = message.url;
                        var param = message.param;

                        // 写入全局函数，接受 JSONP 回调
                        window[id] = function(data) {
                            message.data = data;
                            postMessageToHost(message);
                            delete window[id];
                        };

                        getScript(url, null, '&' + param + '=' + id);
                    };


                    // 针对旧版浏览器提供 postMessage 方法
                    if (typeof window.postMessage !== 'function') {
                        window.postMessage = function(event) {
                            window.onmessage({
                                data: event
                            });
                        };
                    }


                    window.onerror = function(message) {
                        console.error('jsonp-sandbox error:', message);
                    };

                }).toString() +
                ')()' +
                '</script>' +
                '</head>' +
                '<body></body>' +
                '</html>';
        },

        // 监听来自沙箱的消息
        _onmessage: function(id, callback) {
            JSONP._callbacks[id] = callback;
            this._ids.push(id);
        },

        // 向沙箱发送消息
        _postMessage: function(message) {
            var that = this;
            if (this._isReady) {
                this.sandbox.contentWindow.postMessage(message, '*');
            } else {
                // iframe 加载完毕才可以进行 postMessage 操作
                if (!this.sandbox.onload) {
                    this._queue = [];
                    this.sandbox.onload = function() {
                        that._isReady = true;
                        for (var i = 0; i < that._queue.length; i++) {
                            that._postMessage(that._queue[i]);
                        }
                        delete this.sandbox.onload;
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
        window.postMessage = function(event) {
            JSONP._onmessage({
                origin: 'null',
                data: event
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
        global.JSONP = JSONP;
    }

})(window);