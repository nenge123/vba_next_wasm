
var CACHE_NAME = 'GBA-WASM';
var CACHE_PATH = self.registration.scope;
var CACHE_LIST = [
    "./",
    "./assets/images/zan.jpg",
    "./assets/css/style.css",
    "./assets/js/common.js",
    "./assets/js/NengeDisk.js",
    "./assets/js/gamepad.js",
    "./assets/js/nipplejs.js",
    "./assets/js/vbanext.js",
    "./assets/images/gba2.png",
    "./assets/images/zan.jpg"
];
var isLocal = location.host == '127.0.0.1';
var version = '2023/09/15 23:30';
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
function getMime(url) {
    var ext = getExt(url).toLowerCase();
    switch (ext) {
        case 'js':
            return 'application/javascript';
        case 'json':
            return 'application/json';
        case 'html':
        case 'xml':
        case 'css':
            return 'text/' + ext;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'avif':
        case 'apng':
        case 'heic':
            return 'image/' + ext;
        case 'icon':
            return 'image/x-' + ext;
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
function postMessage(str) {
    self.clients.matchAll().then(WindowClients => WindowClients.forEach(Clients => {
        if (Clients.visibilityState == 'visible') {
            if (str && str.constructor === Object) {
                Object.assign(str, {
                    from: ServiceWorker.name,
                    origin: CACHE_PATH,
                    scriptURL: serviceWorker.scriptURL
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
function LoadDB(name) {
    return new (class {
        constructor(name) {
            this.name = name;
        }
        async transaction(table, ReadMode) {
            return (await this.db).transaction([table], ReadMode ? undefined : "readwrite").objectStore(table);
        }
        open() {
            return new Promise(re => {
                var req = indexedDB.open(this.name);
                req.onsuccess = function (e) {
                    re(req.result);
                }
            });
        }
        get db() {
            if (!this._DB) this._DB = this.open();
            return this._DB;
        }
        tables = {}
        table(table) {
            if (this.tables[table]) return this.tables[table];
            return new (class {
                constructor(IDB, table) {
                    Object.assign(this, { IDB, table });
                    IDB.tables[table] = this;
                }
                async transaction(ReadMode) {
                    return this.IDB.transaction(table, ReadMode)
                }
                get read() {
                    return this.transaction(!0)
                }
                get write() {
                    return this.transaction(!1)
                }
                put(data, path) {
                    return new Promise(async re => {
                        (await this.write).put(data, path).onsuccess = function (e) { re(e.target.result) };
                    });
                }
                delete(path) {
                    return new Promise(async re => {
                        (await this.write).delete(data, path).onsuccess = function (e) { re(e.target.result) };
                    });
                }
                get(path) {
                    return new Promise(async re => {
                        (await this.read).get(data, path).onsuccess = function (e) { re(e.target.result) };
                    });
                }
                cursor(keyname, query, direction) {
                    return new Promise(async re => {
                        var data = {}, db = await this.read, odb;
                        if (keyname) odb = db.index(keyname).openKeyCursor(query, direction);
                        else odb = db.openCursor(query, direction);
                        odb.onsuccess = function (e) {
                            var result = e.target.result;
                            if (result) {
                                var { primaryKey, key, value } = result;
                                data[primaryKey] = value === undefined ? key : value;
                                result.continue();
                            } else {
                                re(data);
                            }
                        };
                    });
                }

            })(this, table)
        }
    })(name)
}
function saveCaches(cache_name, result) {
    caches.open(cache_name).then(DB => {
        if (result) {
            Object.entries(result).forEach(entry => {
                var filename = getName(entry[0]);
                var file = entry[1] instanceof Blob ? file : new File([entry[1].buffer || entry[1]], filename, { type: getMime(filename) });
                DB.put(CACHE_PATH + 'cache/file/' + entry[0], new Response(), { status: 200, 'Content-Length': file.size });
            })
        }
    });
}
Object.entries({
    async install(event) {
        console.log('serviceWorker install');
        if (navigator.onLine && !isLocal) {
            return event.waitUntil(new Promise(async re => {
                var myCACHE = await caches.open(CACHE_NAME);
                await Promise.all(CACHE_LIST.map(async v => {
                    var re = await fetch(v, { cache: 'no-cache', mode: 'same-origin', redirect: 'follow' });
                    myCACHE.put(re.url, re.clone());
                }));
                re(postMessage({ action: 'pwa_install' }));

            }));
            //.map(v=>new Request(v,{cache:'no-cache'}))
        }
        return self.skipWaiting(); //跳过等待
    },
    activate(event) {
        console.log('serviceWorker activate');
        !myIDB && postMessage({ action: 'GETDBNAME' });
        postMessage({ action: 'pwa_activate' });
        return self.skipWaiting(); //跳过等待
    },
    fetch(event) {
        /**
         * 返回数据
         */
        var response;
        if (!isLocal&&event.request.method == 'GET') {
            /**
             * 请求地址
             */
            var url = event.request.url;
            /**
             * 本地地址
             */
            var urlLocal = url.includes(location.host);
            /**
             * 是否缓存列表文件
             */
            var isCache = urlLocal && CACHE_LIST.includes(url.replace(CACHE_PATH, './'));
            /**
             * 是否需要前端解压的虚假地址
             */
            var isPack = urlLocal && /pack=/i.test(url);
            /**
             * 是否CDN
             */
            var isCDN = !urlLocal && /(cdn|code)/i.test(url);
            if (isCDN) {
                if (location.protocol == 'http:') url = url.replace('https:', location.protocol);
            }
            if (isCache || isPack || isCDN) {
                //拦截请求 event.request 一个请求对象
                return event.respondWith(new Promise(async resolve => {
                    var DB = await caches.open(CACHE_NAME);
                    response = await DB.match(event.request);
                    if (navigator.onLine) {
                        //联网状态
                        /***
                        if(response){
                            var headers = getHeaders(response.headers);
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
                            if (!response || response.status != 200) {
                                if (isPack) {
                                    //分析本地虚假地址 进行虚假worker缓存
                                    action = url.match(/pack=([^&]+)/);
                                    if (action) {
                                        if (await getResponse(url, action[1])) {
                                            return resolve(DB.match(event.request));
                                        }
                                    }
                                }
                            }
                            if (response && response.status == 200 && (isCache || isCDN)) {
                                DB.put(event.request, response.clone());
                            }
                        }
                    }
                    resolve(response);
                }));

            }
        }
        return response;
    },
    message(event) {
        let data = event.data;
        if (data && data.constructor === Object) {
            if (isLocal) console.log(data);
            var { action, result } = data;
            if (action == 'WOKERDBNAME') {
                !myIDB && (myIDB = LoadDB(result));
            } else if (action == 'WRITECACHE') {
                saveCaches(data.cachename || CACHE_NAME, result);
            }
        }
    }
}).forEach(
    entry => self.addEventListener(entry[0], entry[1])
);