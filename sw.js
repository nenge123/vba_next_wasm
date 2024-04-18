"use strict";
let CACHE_NAME = 'GBA-WASM';
let version = '2023 09/23 19:40';
let CACHE_PATH = self.registration.scope;
Object.assign(EventTarget.prototype, {
    /**
     * 绑定事件
     * @param {*} evt 
     * @param {*} fun 
     * @param {*} opt 
     * @returns 
     */
    on(evt, fun, opt) {
        return this.addEventListener(evt, fun, opt);
    },
    /**
     * 解绑事件
     * @param {*} evt 
     * @param {*} fun 
     * @param {*} opt 
     * @returns 
     */
    un(evt, fun, opt) {
        return this.removeEventListener(evt, fun, opt);
    },
    /**
     * 绑定一次事件
     * @param {*} evt 
     * @param {*} fun 
     * @param {*} opt 
     * @returns 
     */
    once(evt, fun, opt) {
        return this.on(evt, fun, Object.assign({
            passive: !1,
            once: !0,
        }, opt === true ? { passive: !0 } : opt || {}));
    },
    /**
     * 触发自定义事件
     * @param {*} evt 
     * @param {*} detail 
     */
    toEvent(evt, detail) {
        this.dispatchEvent(new CustomEvent(evt, { detail }))
    }
});
Object.entries({
    install(event) {
        console.log('serviceWorker install');
        T.postAction('pwa_install');
        return self.skipWaiting(); //跳过等待
    },
    activate(event) {
        return self.skipWaiting(); //跳过等待
    },
    fetch(event) {
        //if(T.isLocal) return;
        /**
         * 返回数据
         */
        //headers.set('ajax-pwa',1);
        const request = event.request;
        if (request.method == 'GET') {
            let {url,headers} = request;
            //拦截请求 event.request 一个请求对象
            return event.respondWith(new Promise(async resolve => {
                let DB = await caches.open(CACHE_NAME);
                if(url.indexOf('update-cache/')!=-1){
                    let DB = await caches.open('GBA-WASM');
                    let list = await DB.keys();
                    await Promise.all(list.map(async request=>{
                        let response = await DB.match(request);
                        let cachetime = response&&Date.parse(response.headers.get('last-modified'));
                        if(!cachetime)return;
                        let response2 = await fetch(request.url+'?v='+Date.parse(version),{method:'HEAD',headers:{'pragema':'no-cache','cache-control':'no-cache'}}).catch(e=>undefined);
                        let cachetime2 = response2&&Date.parse(response2.headers.get('last-modified'));
                        if(response2&&cachetime!=cachetime2){
                            response = await fetch(request.url+'?v='+Date.parse(version),{headers:{'pragema':'no-cache','cache-control':'no-cache'}});
                            await DB.put(request,response);
                        }
                        return true;
                    }));
                    return resolve(new Response('ok',{headers:{state:404}}));
                }
                let response = await DB.match(request);
                if(response) return resolve(response);
                if (navigator.onLine) {
                    if (url.includes(location.host)) {
                        headers = T.getHeaders(headers);
                        let isPack = url.match(/(?<=[\?\&]pack=)[^&]+/);
                        if (isPack) {
                            isPack = isPack && isPack[0] || !1;
                            if (isPack == 'loader') return await T.packLoader(url,headers,resolve);
                            let result = await T.getPack(url, isPack);
                            if (result) {
                                return resolve(await DB.match(request));
                            }
                        }
                    }
                    if (!response) {
                        response = await fetch(request);
                        if (response.status == 200) {
                            DB.put(request, response.clone());
                        }
                    }
                }
                resolve(response);
                response = null;
            }));
        }
        return false;
    },
    notificationclick(event) {
        console.log("On notification click: ", event.notification.tag);
    },
    push(event) {
        console.log("On notification click: ", event.data);
    },
    async message(event) {
        let data = event.data;
        T.Client = event.source;
        if (data && data.constructor === Object) {
            let action = data.action;
            if (T.action[action]) return T.action[action](data);
        }
    }
}).forEach(
    entry => self.addEventListener(entry[0], entry[1])
);
const T = new class {
    JSpath = CACHE_PATH + 'assets/js/';
    DB_NAME = CACHE_NAME;
    isLocal = location.host == '127.0.0.1';
    action = {
        CLIENT(data) {
            let { DB_NAME, JSpath, DB_STORE_MAP } = data;
            if (DB_NAME) {
                T.DB_NAME = DB_NAME;
                if (!T.DBLIST[DB_NAME] && DB_STORE_MAP) new CustomStore(DB_NAME, DB_STORE_MAP);
            }
            if (JSpath) T.JSpath = JSpath;
            T.postMessage({
                action: data.action,
                CACHE_NAME
            });
        },
        async LOADZIP() {
            if ('zip' in self) return T.postMessage({ action: 'pwa_zip_ready', result: !0 });
            await T.loadZip();
            T.postMessage({ action: 'pwa_zip_ready', result: !0 });
        },
        async UNPACK(data) {
            let { callback, url, password, isu8 } = data;
            T.postMessage({
                action: callback,
                state: !1,
                contents: await T.getZip(await T.getFetch(url, callback), callback, password, isu8)
            });
        },
        async UNLOADER(data) {
            let { callback,zip, url} = data;
            await T.packLoader(url,{'content-action':callback,'content-zip':zip})
            T.postMessage({ action: callback, result: !0 });
        }
    };
    Client = undefined;
    DBLIST = {};
    DB(name, opt) {
        name = name || T.DB_NAME;
        if (T.DBLIST[name]) return T.DBLIST[name];
        return new CustomStore(name, opt);
    }
    async loadZip() {
        if (!self.zip) {
            let filename = 'zip.min.js';
            let contents = await T.DB().table('libjs').data(filename);
            if (!contents) {
                contents = await T.getFetch(T.JSpath + 'lib/' + filename, 'pwa_zip_ready', filename, 'application/javascript');
                T.DB().table('libjs').put({
                    contents,
                    filename,
                    filesize: contents.size,
                    filetype: contents.type,
                    timestamp: new Date,
                    type: "File",
                    version: 1
                }, filename);
            }
            eval(await contents.text());
        }
        return self.zip;
    }
    async getFetch(url, action, filename, filetype) {
        const response = await fetch(url);
        const headers = response.headers;
        filename = filename || T.getName(url);
        filetype = (headers.get('content-type') || '').split(';')[0] || T.getMime(filename);
        let total = 0;
        let reader = response.body.getReader();
        let current = 0;
        let chunks = [];
        total = parseInt(headers.get('content-length') || 0);
        while (true) {
            const {
                done, value
            } = await reader.read();
            if (done) {
                break;
            } else {
                current += value.length;
            }
            /* 下载进度*/
            T.postMessage({ action, state: { current, total, filename, type: 'fetch' }});
            chunks.push(value);
        }
        return new File(chunks, filename, { type: filetype });
    }
    async getZip(data, action, password, isu8) {
        await this.loadZip();
        return Object.fromEntries(await Promise.all((await new zip.ZipReader(new zip.BlobReader(data)).getEntries()).map(async v => {
            let data = await v.getData(new (isu8 ? zip.Uint8ArrayWriter : zip.BlobWriter), {
                password,
                onprogress: (current, total) => T.postMessage({ action, state: { current, total, filename: v.filename, type: 'unpack'  }})
            });
            return [v.filename, data instanceof Blob?new File([data], T.getName(v.filename), { type: T.getMime(v.filename) }):data]
        })))
    }
    getName(url) {
        return (url || '').split('/').pop().split('?')[0].split('#')[0];
    }
    getExt(url) {
        return this.getName(url).split('.').pop().toLowerCase();
    }
    getMime(url) {
        let ext = this.getExt(url);
        return T.mimeList[ext] || T.mimeList[0];
    }
    getPath(url) {
        let p = '/';
        return url && url.split(p).slice(0, -1).join(p) + p || CACHE_PATH;
    }
    getPack(url, action) {
        let id = crypto.randomUUID();
        this.postMessage({ url, action: 'pack_' + action, id, cache: CACHE_NAME });
        return new Promise(back => {
            this.action[id] = data => {
                delete this.action[id];
                back(data.result || data);
            }
        });
    }
    async packLoader(url,headers,resolve) {
        let path = T.getPath(url);
        let urlname = T.getName(url);
        let name = urlname.replace(/\.\w+$/, '');
        let action = 'pwa_down_' + name.split('.')[0];
        let src = path + name + '.zip';
        if(headers){
            if(headers['content-zip']){
                src = headers['content-zip'];
            }
            if(headers['content-action']){
                action = headers['content-action'];
            }
        }
        await this.loadZip();
        let CACHE = await caches.open(CACHE_NAME);
        await Promise.all(Object.entries(await T.getZip(await T.getFetch(src,action), action)).map(async entry => {
            let dir = entry[0];
            await CACHE.put(dir == urlname ? url : path + dir, new Response(
                entry[1],
                {
                    statusText: 'ok',
                    headers: {
                        'Content-Length': entry[1].size || entry[1].length||0,
                        'Content-Type': entry[1].type || T.getMime(dir),
                        'Date': new Date().toGMTString(),
                    }
                }));
                entry=null;
        }));
        resolve&&resolve(CACHE.match(url));
    }
    async getResponse(url,cachename){
        cachename = cachename||CACHE_NAME;
        let CACHE = await caches.open(cachename);
        let response = await CACHE.match(url);
        if(!response){
            response = await fetch(url);
            CACHE.put(url,response.clone());
        }
        return response;
    }
    getHeaders(headers) {
        let objs = {};
        headers.forEach((a, b) => objs[b] = a);
        return objs;
    }
    isVisible(client) {
        return client.visibilityState == 'visible';
    }
    async getClient() {
        let { Client, isVisible } = this;
        if (Client && isVisible(Client)) {
            return Client;
        }
        let clients = await self.clients.matchAll();
        return clients.filter(v => isVisible(v))[0] || Client || clients[0];
    }
    postMessage(str,bool) {
        if(bool)return clients.matchAll().then(client=>client.postMessage(str));
        this.getClient().then(client => client && client.postMessage(str));
    }
    postAction(action) {
        return this.postMessage({ action })
    }
    constructor() {
        const T = this;
        T.mimeList = Object.fromEntries([].concat(...(
            "text;css,scs,sass,html,xml,vml,style:css,htm:html,php:html,txt:plain\n" +
            "image;jpg,jpeg,png,gif,webp,avif,apng,heic,svg:svg+xml\n" +
            "font;woff,woff2,ttf,otf\n" +
            "application;pdf,json,js:javascript,0:octet-stream,zip:x-zip-compressed,rar:x-rar-compressed,7z:x-7z-compressed,wasm").split(/\n/).map(a => {
                a = a.split(/;/);
                return [].concat(a[1].split(/,/).map(c => {
                    c = c.split(/:/);
                    let d = a[0] + '/' + (c[1] || c[0]);
                    return [c[0], d];
                }))
            })));
    }
};
/**
 * 本地数据 库操作
 */
class CustomStore {
    tables = [];
    Store = {};
    config = {};
    name = '';
    constructor(name, config={}) {
        Object.assign(this, {name,config});
        T.DBLIST[name] = this;
    }
    open(upgrad) {
        let IDB = this;
        return new Promise(resolve => {
            let req = indexedDB.open(IDB.name, IDB.version);
            req.once("error", async (err) => {
                throw err;
            });
            req.once("upgradeneeded", upgrad || (e => {
                let db = e.target.result;
                Object.entries(IDB.config).forEach((entry) => {
                    let [table, opt] = entry;
                    if (!db.objectStoreNames.contains(table)) {
                        let store = db.createObjectStore(table);
                        Object.entries(opt).forEach(opts => {
                            if (opts[1] && opts[1].options) {
                                store.createIndex(opts[0], opts[1].keyPath || opts[0], opts[1].options);
                            } else {
                                store.createIndex(opts[0], opts[0], opts[1] || { unique: false });
                            }
                        });
                    }
                });
            }));
            req.once('success', async (e) => {
                let db = e.target.result;
                let t = Object.keys(IDB.config);
                IDB.tables = Array.from(db.objectStoreNames);
                t = Object.keys(IDB.config).filter(v => !IDB.tables.includes(v));
                IDB.version = db.version + 1;
                if (t.length > 0) {
                    db.close();
                    return resolve(IDB.open(upgrad));
                }
                IDB.Store = {};
                return resolve(db);
            });
        });
    }
    table(table,opt) {
        let IDB = this;
        if (!IDB.Store[table]) {
            IDB.Store[table] = new CustomTable(table, IDB,opt);
        }
        return IDB.Store[table];
    }
    async getTable(table, opt) {
        let IDB = this;
        if (!IDB.config[table]) {
            IDB.config[table] = opt || {};
        }
        if (!IDB.db) {
            IDB.db = IDB.open();
        }
        let db = await IDB.db;
        if (!IDB.tables.includes(table)) {
            IDB.version += 1;
            db.close();
            IDB.db = IDB.open();
            db = await IDB.db;
        }
        return db;
    }
    transaction(table, ReadMode, db) {
        if (!db) {
            return new Promise(async (re) => re(this.transaction(table, ReadMode, await this.getTable(table))));
        }
        return db.transaction([table], ReadMode ? undefined : "readwrite").objectStore(table);
    }
    async clear() {
        let IDB = this;
        if (IDB.db) {
            (await IDB.db).close();
        }
        IDB.db = undefined;
        delete T.DBLIST[IDB.name];
        return indexedDB.deleteDatabase(IDB.name);
    }
}
/**
 * 本地数据 表操作
 */
class CustomTable {
    constructor(table, IDB, opt) {
        let DB = this;
        Object.assign(DB, {
            transaction: async ReadMode => IDB.transaction(table, ReadMode, await IDB.getTable(table, opt)),
            read: () => DB.transaction(!0),
            write: () => DB.transaction(!1),
            clear: async () => DB.toSuccess((await DB.write()).clear()),
            count: async query => DB.toSuccess((await DB.read()).count(query)),
            all: async (query, count) => DB.toSuccess((await DB.read()).getAll(query, count)),
            keys: async (query, count) => DB.toSuccess((await DB.read()).getAllKeys(query, count)),
            key: async (range) => DB.toSuccess((await DB.read()).getKey(range)),
            load: (request, name) => DB.toSuccess(request.get(name)),
            save: (request, data, name) => DB.toSuccess(request.put(data, name)),
            get:async (name, read)=>await DB.load(read || await DB.read(), name),
            put: async (data, name) => DB.save(await DB.write(), data, name),
            putdata: async (name, data, opt) => DB.put(Object.assign({
                contents: data,
                timestamp: new Date
            }, opt), name)
            ,
            async data(name) {
                let result = await DB.get(name);
                return result && result.contents || result;
            },
            delete: async (name) => DB.toSuccess(await DB.write().delete(name)),
            cursor: async (fn, query, direction, request) => {
                if (!request) request = await DB.read();
                else if (request instanceof Promise) request = await request;
                return DB.getCursor(request.openCursor(query, direction), fn);
            },
            keyCursor: async (fn, query, direction, request) => {
                if (!request) request = await DB.read();
                else if (request instanceof Promise) request = await request;
                return DB.getCursor(request.openKeyCursor(query, direction), fn);
            },
            index: (index, range) => {
                return new class {
                    constructor(index, range) {
                        Object.assign(this, {
                            async transaction() {
                                let read = await DB.read();
                                return read.indexNames.contains(index) ? read.index(index) : read;
                            },
                            async cursor(key, direction) {
                                return DB.cursor(key, range, direction, await this.transaction());
                            },
                            async keys(key, direction) {
                                return DB.keyCursor(key, range, direction, await this.transaction());
                            },
                            async get(key, version, bool) {
                                return DB.get(key, version, bool, await this.transaction());
                            }
                        });
                    }
                }(index, range);
            }
        });
    }
    toSuccess(request, fn) {
        return new Promise((resolve) => request.on('success', (e) => {
            let result = request.result;
            fn ? fn(resolve, result) : resolve(result);
        }));
    }
    getCursor(request, fn) {
        let data = {};
        return this.toSuccess(request, (resolve, result) => {
            if (result) {
                let {
                    primaryKey,
                    key,
                    value
                } = result;
                if (value) {
                    if (fn)
                        value && value[fn] && (data[primaryKey] = value[fn]);
                    else
                        data[primaryKey] = value;

                } else {
                    data[primaryKey] = key;
                }
                result.continue();
            } else {
                resolve(data);
            }
        });
    }
}
