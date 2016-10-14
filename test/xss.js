var sandbox = true;

try {
    if (document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (this.document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (window.document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (top.document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (parent.document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (opener.document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (frames[0].document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    if (self.document.cookie) {
        sandbox = false;
    }
} catch(e) {}

try {
    top.document.title;
    sandbox = false;
} catch(e) {}

if (sandbox) {
    jsonp_callback({
        name: '糖饼',
        weibo: 'http://weibo.com/planeart',
        date: new Date
    });
} else {
    jsonp_callback({
        sandbox: 'error'
    });
    top.document.getElementById('sandbox') = false;
    throw Error('沙箱失效，cookie 被泄漏');
}