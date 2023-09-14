
var CACHE_NAME =  'GBA-WASM';
var CACHE_PATH = self.registration.scope;
var PASS_REGEX =  /^(?!assets|cache|plugin).*/;//跳过缓存
var PASS_REGEX2 =  /^assets\/js\/common\w*\.js/;//跳过缓存2
var PUT_REGEX =  /(static\/)[^\s]+\.\w+$/; //存储缓存正则,save caches regex;
var CDN =  ['cdn.staticfile.org', 's1.hdslb.com'];//储存缓存CDN save caches cdn
var myIDB;
function Check(obj, k) {
    for (let a in k) if (obj[a] != k[a]) return !1;
    return !0;
}
function getName(url) {
    return url.split('/').pop().split('?').split('#')[0];
}
function getExt(url) {
    return getName(url).split('.').pop();
}
function getMime(url){
    var ext = getExt(url).toLowerCase();
    switch(ext){
        case 'js':
        return 'application/javascript';
        case 'json':
        return 'application/json';
        case 'html':
        case 'xml':
        case 'css':
        return 'text/'+ext;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'avif':
        case 'apng':
        case 'heic':
        return 'image/'+ext;
        case 'icon':
        return 'image/x-'+ext;
        case 'svg':
        return 'svg+xml';
        default:
        return 'application/octet-stream';
    }
}
function getHeaders(headers) {
    var objs = {};
    headers.forEach((a, b) => objs[b] = a);
    return objs;
}
function checkCDN(url) {
    if (self.CDN) {
        for (var i = 0; i < CDN.length; i++) {
            if (url.search(CDN[i]) !== -1) return !0;
        }
    }
    return !1;
}
function postMessage(str) {
    self.clients.matchAll().then(WindowClients => WindowClients.forEach(Clients => {
        if (Clients.visibilityState == 'visible') {            
            if(str&&str.constructor === Object){
                Object.assign(str,{
                    from:ServiceWorker.name,
                    origin : CACHE_PATH,
                    scriptURL:serviceWorker.scriptURL
                });
            }
            Clients.postMessage(str);
        }
    }))
}
function getResponse(url, action) {
    let id = (Math.random() * Math.random() + '').slice(2);
    let message = { url, action, id };
    return new Promise(back => {
        var func = e => {
            console.log(e);
            var data = e.data;
            if (Check(data, message)) {
                removeEventListener('message', func);
                return back(data.result);
            }
        };
        addEventListener('message', func);
        postMessage(message);
    });
}
class IDB{
    constructor(name){
        this.name = name;
    }
    open(){
        return new Promise(resolve=>{
            var req = indexedDB.open(this.name);
            req.addEventListener("success",e=>{
                resolve(req.result);
            });
        });
    }
    get db(){
        if(!this.ready)this.ready = this.open();
        return this.ready;
    }
    table(table){
        var I = this;
        return {
            table,
            async transaction(ReadMode) {
                let db = await I.db;
                return db&&db.transaction([table], ReadMode ? undefined : "readwrite").objectStore(table);
            },
            async get(name){
                let db = await this.transaction(!0);
                if(db)return new Promise(resolve=>{
                    db.get(name).onsuccess(e=>resolve(e.result));
                })
            },
            async put(name,data){
                let db = await this.transaction(!1);
                if(db)return new Promise(resolve=>{
                    db.put(data,name).onsuccess(e=>resolve(e.result));
                })
            }
        }
    }
}
function saveCaches(cache_name,result){
    caches.open(cache_name).then(DB=>{
        if(result){
            Object.entries(result).forEach(entry=>{
                var filename = getName(entry[0]);
                var file = entry[1] instanceof Blob ? file:new File([entry[1].buffer||entry[1]],filename,{type:getMime(filename)});
                DB.put(CACHE_PATH+'cache/file/'+entry[0],new Response(),{status: 200,'Content-Length': file.size});
            })
        }
    });
}
Object.entries({
    async install(event) {
        console.log('serviceWorker install');
        caches.delete(CACHE_NAME);
        return self.skipWaiting(); //跳过等待
    },
    activate(event) {
        console.log('serviceWorker activate');
        !myIDB&&postMessage({action:ServiceWorker.name,result:'activate'});
        return self.skipWaiting(); //跳过等待
    },
    fetch(event) {
        if (event.request.method == 'GET') {
            //拦截请求 event.request 一个请求对象
            return event.respondWith(new Promise(async resolve => {
                var url = event.request.url;
                //if (location.protocol == 'http:') url = url.replace('https:', location.protocol);
                var DB = await caches.open(CACHE_NAME);
                var headers, response = await DB.match(event.request);
                if (navigator.onLine) {
                    //联网状态

                    /***
                    if(response){
                        response = getHeaders(response.headers);
                        var time = headers['date'];
                        if(time&&Date.now() - Date.parse(time)>24*3600){
                            var response =  await fetch(event.request);
                            if(response){
                                DB.put(event.request, response.clone());
                            }
                        }
                    }
                    */
                    if (!response) {
                        response = await fetch(event.request);
                        if(!response||response.status!=200){
                            if (url.search(location.hostname) !== -1&&/pack=/.test(url)) {
                                //分析本地虚假地址 进行虚假worker缓存
                                action = url.match(/pack=([^&]+)/);
                                if (action) {
                                    if (await getResponse(url, action[1])) {
                                        return resolve(DB.match(event.request));
                                    }
                                }
                            }
                        }
                        if (response&&response.status==200) {
                            //DB.put(event.request, response.clone());
                        }
                    }
                }
                resolve(response);
            }));
        }
    },
    message(event) {
        let data = event.data;
        if(data&&data.constructor === Object){
            if(location.host=='127.0.0.1')console.log(data);
            var {action,result} = data;
            if(action==IDBDatabase.name){
                !myIDB&&(myIDB = new IDB(data.result));
            }else if(action==Cache.name){
                saveCaches(data.cachename||CACHE_NAME,result);
            }
        }
    }
}).forEach(
    entry => self.addEventListener(entry[0], entry[1])
);