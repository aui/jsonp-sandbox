var code = 0;

try {
    if (document.cookie) {
        code = 1;
    }
} catch(e) {}

try {
    if (this.document.cookie) {
        code = 2;
    }
} catch(e) {}

try {
    if (window.document.cookie) {
        code = 3;
    }
} catch(e) {}

try {
    if (top.document.cookie) {
        code = 4;
    }
} catch(e) {}

try {
    if (parent.document.cookie) {
        code = 5;
    }
} catch(e) {}

try {
    if (opener.document.cookie) {
        code = 6;
    }
} catch(e) {}

try {
    if (frames[0].document.cookie) {
        code = 7;
    }
} catch(e) {}

try {
    if (self.document.cookie) {
        code = 8;
    }
} catch(e) {}

try {
    top.document.title;
    code = 9;
} catch(e) {}


try {
    localStorage.setItem('test', '1');
    if (localStorage.getItem('test') === '1') {
        code = 10;
    }
} catch(e) {}

try {
    delete top;
    if (top.document.cookie) {
        code = 11;
    }
} catch(e) {}

try {
    delete top;
    if (ActiveXObject.toString().indexOf('[native code]') !== -1) {
        code = 12;
    }
} catch(e) {}


if (code === 0) {
    jsonp_callback({
        name: '糖饼',
        weibo: 'http://weibo.com/planeart',
        date: new Date
    });
} else {
    jsonp_callback({
        sandbox: 'error',
        code: code
    });
    top.document.getElementById('code') = false;
    throw Error('沙箱失效!');
}