jsonp_callback({
	name: '糖饼',
	weibo: 'http://weibo.com/planeart'
});

// 模拟恶意脚本修改页面
top.document.getElementById('sandbox').innerHTML = 'false';