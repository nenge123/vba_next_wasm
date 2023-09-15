(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : ((global = typeof globalThis !== "undefined" ? globalThis : global || self), factory((global.T = {})));
})(this, function (exports) {
    "use strict";
    const T = exports;
    const win = typeof globalThis !== "undefined" ? globalThis : this || self;
    const {
        Array,
        Object,
        String,
        Number,
        Blob,
        File,
        ArrayBuffer,
        Uint8Array,
        Function,
        Boolean,
        Promise,
        FormData,
        URL,
        URLSearchParams,
        Text,
        TextDecoder,
        TextEncoder,
        document,
        RegExp,
        HTMLElement,
        customElements,
        Symbol,
        parseInt,
        addEventListener,
        removeEventListener,
        CSSStyleDeclaration,
        Date,
        Event,
        CustomEvent,
        ErrorEvent,
        JSON,
        indexedDB,
        IDBRequest,
        undefined,
        DOMParser,
        prompt,
        alert,
        fetch,
        XMLHttpRequest,
        location,
        matchMedia,
        styleMedia,
        Document,
        Node,
        NodeList,
        KeyboardEvent,
        StyleSheet,
        console
    } = win;
    var Nenge = {
        version: 1,
        DB_NAME: "XIUNOBBS",
        DB_STORE_MAP: {
            libjs: {},
            myfile: {
                timestamp: false
            }
        },
        LibStore: "libjs",
        LibPad: "script-",
        maxsize: 0x6400000,
        part: "-part-",
        lang: {},
        action: {},
        StoreList: {},
        isLocal: /^(127|localhost|172)/.test(location.host),
        zipsrc: "zip.min.js",
        un7zsrc: "extract7z.zip",
        unrarsrc: "libunrar.min.zip",
        serviceActive: !1,
        mime: document.contentType,
        readyState: document.readyState,
        onLine: navigator.onLine,
        getStore(dbName, opt) {
            if (!dbName || dbName == T.DB_NAME) {
                dbName = T.DB_NAME;
                opt = opt || T.DB_STORE_MAP;
            }
            return T.StoreList[dbName] || new CustomStore(dbName, opt);
        },
        getTable(table, dbName, opt) {
            if (!table) return undefined;
            return T.getStore(dbName, opt).table(table);
        },
        async FetchItem(ARG) {
            return I.Async(async re => {
                var FI = new CustomFetch(ARG);
                if (!ARG.success) FI.done(re);
                else re();
            });
        },
        ajax(ARG) {
            ARG = I.assign({
                url: location.href
            }, ARG || {});
            return I.Async((resolve) => {
                const request = new XMLHttpRequest(ARG.paramsDictionary);
                const texts = T.ts;
                let evt = ["progress", "readystatechange", "error"];
                let ResHeaders,
                    ReType,
                    success = (...a) => {
                        ARG.success && ARG.success.apply(request, a);
                        resolve(a[0]);
                    },
                    error = (...a) => {
                        ARG.error && ARG.error.apply(request, a);
                        resolve(null);
                    },
                    heads = I.NN(document.head);
                T.on(request, evt[1], (event) => {
                    let readyState = request.readyState;
                    if (readyState === 2) {
                        ResHeaders = F.ajaxHeader(request);
                        ReType = ResHeaders.type;
                        if (!ARG.type) {
                            if (ReType == F.getMime(texts[1])) {
                                request.responseType = texts[1];
                            } else if (ReType == F.getMime("xml")) {
                                request.responseType = "xml";
                            } else if (ResHeaders.filename || !/(text|html|javascript|css)/.test(ReType)) {
                                request.responseType = I.L(Blob);
                            }
                        } else if (ARG.type == heads) {
                            request.abort();
                        }
                    } else if (readyState === 4) {
                        if (ARG.type == heads)
                            return success(ResHeaders);

                        let result = request.response;
                        if (I.blob(result)) {
                            result = I.File([result], ResHeaders.filename || F.getname(ARG.url), ReType, ResHeaders["last-modified"]);
                        }
                        if (request.status == 200) {
                            return success(result, ResHeaders);
                        } else {
                            return error(request.statusText || "net::ERR_FAILED", ResHeaders, result);
                        }
                    }
                });
                I.func(ARG[evt[0]]) && T.on(request, evt[0], (e) => I.progress(ARG[evt[0]], "", e.loaded, e.total, e));
                I.func(ARG.postProgress) && T.on(request.upload, evt[0], (e) => I.progress(ARG.postProgress, "", e.loaded, e.total, e));
                ARG.upload && I.toArr(ARG.upload, (v) => T.on(request.upload, v[0], v[1]));
                let formData,
                    headers = ARG.headers || {};
                if (ARG.overType)
                    request.overrideMimeType(ARG.overType);

                if (ARG.json) {
                    formData = I.toJson(ARG.json);
                    I.assign(headers, {
                        Accept: [
                            F.getMime(texts[1]),
                            F.getMime(texts[0]),
                            "*/*"
                        ].join()
                    });
                } else if (ARG.post) {
                    formData = I.post(ARG.post);
                }
                if (ARG.type && ARG.type != heads)
                    request.responseType = ARG.type;

                request.open(!formData ? "GET" : "POST", I.get(ARG.url, {
                    inajax: T.time
                }, ARG.get));
                I.toArr(headers, (entry) => request.setRequestHeader(entry[0], entry[1]));
                request.send(formData);
            });
        },
        async FetchCache(url, type, exp, dbName) {
            type = type || I.L(Blob);
            let cache = await caches.open(dbName || T.DB_NAME);
            let response = await cache.match(url);
            if (!response || (exp && T.date - Date.parse(response.headers.get("date")) > exp)) {
                response = await fetch(url);
                if (response) {
                    cache.put(response.url, response.clone());
                }
            }
            if (response)
                return response[type]();

        },
        addJS(buf, cb, iscss, id) {
            if (I.blob(buf)) {
                id = F.getKeyName(buf.name);
                if (/css/i.test(buf.type))
                    iscss = true;

            }
            var s = I.LC(document.scripts[0].nodeName);
            id && (id += s + id);
            if (id && T.$("#" + id))
                return;

            let script = T.$ce(!iscss ? s : "link"),
                func = (callback) => {
                    var type = !iscss ? "js" : "css";
                    buf = F.URL(buf, type);
                    Object.assign(script, {
                        type: F.getMime(type),
                        href: buf,
                        src: buf,
                        rel: I.NC(StyleSheet),
                        id: id || s + T.time,
                        crossorigin: "anonymous",
                        onload(e) {
                            callback && callback(e);
                            if (!iscss && /^blob:/.test(buf))
                                F.reURL(buf);

                            buf = null;
                        }
                    });
                    T.$append(!iscss ? document.body : document.head, script);
                };
            if (!cb)
                return I.Async(func);
            else
                return func(cb),
                    script;

        },
        async loadScript(js, ARG, bool) {
            ARG = ARG || {};
            ARG.url = F.getpath(js);
            if (bool) {
                ARG.type = T.ts[0];
            } else {
                if (!ARG.store)
                    ARG.store = T.LibStore;

                if (!ARG.key)
                    ARG.key = T.LibPad;

            }
            ARG.version = ARG.version || T.version;
            let data = await T.FetchItem(ARG);
            if (!bool) {
                return await T.addJS(data);
            }
            return data;
        },
        async addScript(js, ARG) {
            return await T.addJS(await T.loadScript(js, ARG, !0), null, F.getExt(js) == "css");
        },
        async loadLibjs(name, progress, version, decode, Filter) {
            return await T.addJS(await F.getLibjs(name, progress, version, decode, Filter), null, F.getExt(name) == "css");
        },
        async unFile(u8, fn, ARG) {
            return I.Async(re => {
                new Decompress(Object.assign(ARG || {}, {
                    contents: u8,
                    onprogress: fn
                })).done(re);

            });
        },
        customElement(myelement) {
            !customElements.get(myelement) && customElements.define(myelement, CustomElement);
        },
        Err(msg) {
            return new Error(msg);
        },
        async download(name, buf, type) {
            let href;
            if (!buf && name) {
                buf = name;
                name = null;
            }
            if (/^(http|blob:|data:)/.test(buf)) {
                href = buf;
                if (!name && /^(http|blob:)/.test(buf))
                    name = F.getname(buf);

            } else if (buf) {
                href = F.URL(buf, type);
                if (!name)
                    name = buf.name || T.ts[3] + "." + (
                        (await F.CheckExt(buf)) || T.ts[3]
                    );

            }
            let a = T.$ce("a");
            a.href = href;
            a.download = name || "test.txt";
            a.click();
            a.remove();
        },
        triger(target, type, data) {
            target = T.$(target);
            if (!data)
                data = {
                    detail: target
                };

            return (I.evt(type) ? T.dispatch(target, type) : T.dispatch(target, new CustomEvent(type, data)), target);
        },
        dispatch(obj, evt) {
            return obj.dispatchEvent(evt),
                obj;
        },
        Set: o => {
            if (!o.action)
                o.action = {};

            return (I.defines(o, {
                I: {
                    get: () => I
                },
                T: {
                    get: () => T
                },
                RF: {
                    get: () => T.RF
                },
                CF: {
                    get: () => T.CF
                },
                BF: {
                    get: () => T.BF
                }
            }), I);
        },
        on(elm, evt, fun, opt, cap) {
            elm = T.$(elm);
            evt.split(/\s+/).forEach((v) => I.on(elm, v, fun, opt === false ? {
                passive: false
            } : opt, cap));
            return elm;
        },
        un(elm, evt, fun, opt, cap) {
            elm = T.$(elm);
            evt.split(/\s+/).forEach((v) => I.un(elm, v, fun, opt === false ? {
                passive: false
            } : opt, cap));
            return elm;
        },
        once: (elm, evt, fun, cap) => T.on(elm, evt, fun, {
            passive: false,
            once: true
        }, cap),
        docload(f) {
            if (document.readyState != T.readyState)
                return f && f.call(T);

            T.once(document, "DOMContentLoaded", f);
        },
        $: (e, f) => e ? (I.str(e) ? I.$(e, f) : I.func(e) ? T.docload(e) : e) : undefined,
        $$: (e, f) => I.$$(e, f),
        $ce: (e) => I.$c(e),
        $ct(e, txt, c) {
            let elm = T.$ce(e);
            if (txt)
                elm.innerHTML = I.str(txt) ? txt : txt();

            I.Attr(elm, !c ? undefined : I.str(c) ? {
                class: c
            } : c);
            return elm;
        },
        $append(a, b) {
            if (I.str(b))
                b = T.$ce(b);

            return a.appendChild(b),
                b;
        },
        $add: (e, c) => (e.classList.add(c) && !1) || e,
        async getItemAppend(name, result, ARG) {
            let part = T.part,
                keySplit = name.split(part),
                keyName = keySplit[0],
                names = I.toArr(result.filesize / T.maxsize + 1).map(async (v, k) => {
                    let newkey = keyName;
                    if (k > 0)
                        newkey += part + k;

                    if (name == newkey)
                        return result.contents;

                    let data = await D.GET_ITEM(newkey, ARG);
                    return data.contents;
                });
            let file = I.File(await I.Async(names), keyName, result.filetype);
            result.contents = null;
            return file;
        },
        docElm(str, mime) {
            return I.dElm(str, mime || document.contentType);
        },
        RF(action, data) {
            const R = this,
                A = R.action;
            if (A[action])
                return I.func(A[action]) ? I.Apply(A[action], data || [], R) : A[action];

        },
        CF(action, ...args) {
            return this.RF(action, args);
        },
        BF(action, ...a) {
            const R = this,
                A = R.action;
            return I.func(A[action]) ? a.length ? R.RF(action, a) : A[action].bind(R) : A[action];
        },
        getLang(name, arg) {
            return T.GL(name, arg);
        },
        GL(name, arg) {
            if (!I.none(T.lang[name]))
                name = T.lang[name];

            return I.obj(arg) ? I.RegRe(name, arg) : name;
        },
        MediaQuery(query, fn) {
            if (matchMedia) {
                let m = matchMedia(query);
                T.on(m, "change", (e) => fn(e.matches, e));
                fn(m.matches);
            }
        },
        MediaMath(str) {
            return styleMedia.matchMedium(str);
        },
        async toZip(files, progress, password) {
            if (typeof zip === I.TP()) {
                await T.loadLibjs(T.zipsrc, progress);
            }
            const zipFileWriter = new zip.BlobWriter();
            const zipWriter = new zip.ZipWriter(zipFileWriter, {
                password
            });
            if (!files)
                return zipWriter;

            if (!I.none(files.length)) {
                I.toArr(files).map((file) => zipWriter.add(file.name, new zip.BlobReader(file), {
                    onprogress: (current, total) => I.progress(progress, file.name, current, total)
                }));
            } else if (I.obj(files)) {
                I.toArr(files).map((file) => zipWriter.add(file[0], new zip.Uint8ArrayReader(file[1]), {
                    onprogress: (current, total) => I.progress(progress, file[0], current, total)
                }));
            } else {
                return zipWriter;
            }
            await zipWriter.close({
                onprogress: (current, total) => I.progress(progress, "enZip", current, total)
            });
            return await zipFileWriter.getData();
        },
        setServiceWorker() {
            var {
                serviceWorker
            } = navigator;
            if (!serviceWorker.controller) return;
            T.sw_install = !0;
            T.on(T.sw, 'statechange', e => {
                console.log(e);
            });
            T.on(T.sw, 'error', e => {
                console.log(e);
            });
            var actionName = 'GETDBNAME';
            T.on(navigator.serviceWorker, "message", async (event) => {
                let data = event.data;
                if (I.obj(data)) {
                    if (location.host == '127.0.0.1') console.log(data);
                    let action = data.action;
                    if (action) {
                        if (I.str(action)) {
                            if (action == 'GETDBNAME') {
                                return T.docload(()=>{
                                    console.load(T.action);
                                    T.PostMessage({
                                    set: actionName,
                                    result: T.DB_NAME
                                })})
                            }
                            let result = await T.CF(action, data);
                            if (data.id) {
                                data.result = result;
                                T.PostMessage(data);
                            } else {
                                T.PostMessage(result);
                            }
                        } else if (I.array(action)) {
                            I.FM(action, (v) => [
                                v, T[v] || win[v]
                            ]);
                        }
                    }
                }
            });

        },
        PostMessage(str){
            var sw = this.sw;
            return sw&&sw.postMessage(str);
        },
        async openServiceWorker(file) {
            navigator.serviceWorker.register(file).then(e => !T.sw_install && T.setServiceWorker())
        },
        clearWorker(js) {
            navigator.serviceWorker.getRegistrations().then(sws => sws.forEach(sw => {
                if (sw.active) {
                    if (js && sw.active.scriptURL.includes(js))
                        sw.unregister();
                    else if (!js)
                        sw.unregister();
                }
            }));
        }
    };
    const evtname = ["success"];
    class CustomElement extends HTMLElement {
        /* 警告 如果文档处于加载中,自定义元素实际上并不能读取子元素(innerHTML等) */
        /*因此 如果仅仅操作属性(Attribute),可以比元素出现前提前定义.否则最好文档加载完毕再定义,并不会影响事件触发 */
        constructor() {
            super();
            const C = this;
            C.ElmName = I.UC("TAG_" + C.tagName.replace(/-/g, "_"));
            C.getFunc("INIT");
        }
        getFunc(name, o) {
            let key = name ? "_" + name : "",
                func = T.action[this.ElmName + key];
            if (func)
                func.apply(this, o || []);

        }
        connectedCallback(...a) {
            /*文档中出现时触发*/
            this.getFunc(null, a);
            T.docload(() => this.getFunc("READY", a));
        }
        attributeChangedCallback(...a) {
            /*attribute增加、删除或者修改某个属性时被调用。*/
            this.getFunc("ATTR", a);
        }
        disconnectedCallback(...a) {
            /*custom element 文档 DOM 节点上移除时被调用*/
            this.getFunc("REMOVE", a);
        }
    }
    class CustomStore {
        constructor(name, config) {
            config = config || {};
            Object.assign(this, {
                name,
                config,
                tables: [],
                Store: {}
            });
            T.StoreList[name] = this;
        }
        open(upgrad) {
            var IDB = this;
            return I.Async((resolve, reject) => {
                let req = indexedDB.open(IDB.name, IDB.version);
                T.once(req, "error", async (err) => {
                    throw err;
                });
                T.once(req, "upgradeneeded", upgrad || (e => {
                    let db = e.target.result;
                    I.toArr(IDB.config, (entry) => {
                        var [table, opt] = entry;
                        if (!db.objectStoreNames.contains(table)) {
                            var store = db.createObjectStore(table);
                            console.log(entry);
                            I.toArr(opt, opts => {
                                if (opts[1] && opts[1].options) {
                                    store.createIndex(opts[0], opts[1].keyPath || opts[0], opts[1].options);
                                } else {
                                    store.createIndex(opts[0], opts[0], opts[1] || { unique: false });
                                }
                            });
                        }
                    });
                }));
                T.once(req, evtname[0], async (e) => {
                    let db = e.target.result;
                    IDB.tables = I.toArr(db.objectStoreNames);
                    IDB.version = db.version + 1;
                    let tables = IDB.check(IDB.config, IDB.tables);
                    if (tables.length > 0) {
                        db.close();
                        return resolve(IDB.open(upgrad));
                    }
                    IDB.Store = {};
                    return resolve(db);
                });
            });
        }
        check(a, b) {
            a = I.toArr(a);
            b = I.toArr(b);
            return a.filter((v) => !b.includes(v[0]));
        }
        table(table) {
            var IDB = this;
            if (!IDB.Store[table]) {
                IDB.Store[table] = new CustomTable(table, IDB);
            }
            return IDB.Store[table];
        }
        async getTable(table, opt) {
            var IDB = this;
            if (!IDB.config[table]) {
                IDB.config[table] = opt || {};
            }
            if (!IDB.db) {
                IDB.db = IDB.open();
            }
            var db = await IDB.db;
            let tables = IDB.check(IDB.config, IDB.tables);
            if (tables.length > 0) {
                IDB.version += 1;
                db.close();
                IDB.db = IDB.open();
                db = await IDB.db;
            }
            return db;
        }
        transaction(table, ReadMode, db) {
            if (!db) {
                return I.Async(async (re) => re(this.transaction(table, ReadMode, await this.getTable(table))));
            }

            return db.transaction([table], ReadMode ? undefined : "readwrite").objectStore(table);
        }
        async clear() {
            var IDB = this;
            if (IDB.db) {
                (await IDB.db).close();
            }
            IDB.db = undefined;
            return indexedDB.deleteDatabase(IDB.name);
        }
        async delete(table) {
            var IDB = this;
            if (!IDB.db) {
                I.toArr(await indexedDB.databases(), entry => {
                    if (IDB.name === entry.name) IDB.version = entry.version + 1;
                });
            }
            IDB.db = IDB.open((e) => {
                let db = e.target.result;
                if (I.str(table)) {
                    table = [table];
                }
                I.toArr(table, (v) => db.objectStoreNames.contains(v) && db.deleteObjectStore(v));
            });
        }
    }
    class CustomTable {
        constructor(table, IDB, opt) {
            Object.assign(this, {
                table,
                IDB,
                opt,
                getDB() {
                    return IDB.getTable(table, opt);
                }
            });
        }
        async load(request, name) {
            return this.success(request.get(name));
        }
        async save(request, data, name) {
            return this.success(request.put(data, name));
        }
        success(request, fn) {
            return I.Async((resolve) => T.on(request, evtname[0], (e) => {
                var result = request.result;
                fn ? fn(resolve, result) : resolve(result);
            }));
        }
        async transaction(ReadMode) {
            var DB = this;
            return DB.IDB.transaction(DB.table, ReadMode, await DB.getDB());
        }
        get read() {
            return this.transaction(!0);
        }
        get write() {
            return this.transaction(!1);
        }
        getCursor(request, fn) {
            var DB = this;
            var data = {};
            return DB.success(request, (resolve, result) => {
                if (result) {
                    if (I.func(fn)) {
                        return fn(resolve, result);
                    } else {
                        var {
                            primaryKey,
                            key,
                            value
                        } = result;
                        if (value) {
                            if (I.str(fn))
                                value && value[fn] && (data[primaryKey] = value[fn]);
                            else
                                data[primaryKey] = value;

                        } else {
                            data[primaryKey] = key;
                        }
                    }
                    result.continue();
                } else {
                    resolve(data);
                }
            });
        }
        async get(name, _version, bool) {
            var DB = this;
            var read = await DB.read;
            if (I.str(name)) {
                let result = await DB.load(read, name);
                if (I.obj(result) && result.contents) {
                    var {
                        contents,
                        type,
                        tag,
                        filesize,
                        filetype,
                        filename,
                        version
                    } = result;
                    if (_version && version && _version != version) {
                        return;
                    }
                    if (type == HTMLElement.name) {
                        contents = T.docElm(contents);
                        if (tag) {
                            contents = T.$(tag, contents);
                        }
                    } else if (!I.str(contents)) {
                        if (filesize > T.maxsize && contents.length > 0 && contents.length != filesize) {
                            if (I.blob(contents)) {
                                contents.name && (filename = contents.name);
                                contents.type && (filetype = contents.type);
                            }
                            var keyname = name.split(T.part)[0];
                            contents = await I.Async(I.toArr(filesize / T.maxsize + 1).map(async (v, k) => {
                                let newkey = keyname;
                                if (k > 0)
                                    newkey += T.part + k;

                                if (name == newkey)
                                    return contents;

                                let newresult = await DB.load(read, newkey);
                                return newresult.contents;
                            }));
                            contents = I.File(contents, filename || name, filetype, result.timestamp);
                            if (type != File.name) {
                                contents = await I.U8(contents);
                            }
                        }
                    }
                    if (bool)
                        return contents;
                    else
                        result.contents = contents;

                }
                return result;
            } else if (I.array(name)) {
                return I.toObj(I.Async(name.map(async (keyname) => [
                    keyname, await DB.load(read, keyname)
                ])));
            }
        }
        async put(data, name) {
            var DB = this;
            var write = await DB.write;
            if (!name) {
                I.toArr(write.indexNames, (key) => {
                    if (!name && data[key])
                        name = data[key];

                });
            }
            if (I.obj(data) && data.contents) {
                var {
                    contents,
                    filesize,
                    filetype,
                } = data;
                if (contents) {
                    if (!filesize) {
                        filesize = contents.size || contents.length;
                    }
                    if (!filetype) {
                        filetype = contents.type || F.getMime("*");
                    }
                    if (filesize && filesize > T.maxsize) {
                        delete data.contents;
                        return I.Async(I.toArr(filesize / T.maxsize + 1).map(async (v, k) => {
                            let newkey = name;
                            if (k > 0)
                                newkey += T.part + k;

                            var pos = k * T.maxsize;
                            var newcontens = await I.U8(contents.slice(pos, filesize - pos >= T.maxsize ? pos + T.maxsize : filesize));
                            return DB.save(write, Object.assign({
                                contents: newcontens,
                                filesize,
                                filetype,
                                timestamp: T.date
                            }, data)), newkey;
                        }));
                    }
                }
            }
            return DB.save(write, data, name);
        }
        async putdata(name, data, ver, opt) {
            let result = Object.assign({
                contents: data,
                timestamp: T.date
            }, opt);
            if (ver)
                result.version = ver;

            return this.put(result, name);
        }
        async getdata(name, version) {
            return this.get(name, version, !0);
        }
        async delete(name) {
            var DB = this;
            var write = await DB.write;
            if (I.str(name)) {
                return DB.success(write.delete(name));
            } else if (I.array(name)) {
                return I.Async(I.toArr(name).map((v) => DB.success(write.delete(v), (e) => v)));
            }
        }
        async remove(name) {
            let DB = this;
            let result = await DB.load(DB.read, name);
            if (I.obj(result)) {
                var {
                    filesize
                } = result;
                if (filesize && filesize > T.maxsize) {
                    return DB.delete(I.toArr(filesize / T.maxsize + 1).map((v, k) => {
                        let newkey = name.split(T.part)[0];
                        if (k > 0)
                            newkey += T.part + k;

                        return newkey;
                    }));
                }
            }
            return DB.delete(name);
        }
        async clear() {
            var DB = this;
            return DB.success((await DB.write).clear());
        }
        async count(query) {
            var DB = this;
            return DB.success((await DB.read).count(query));
        }
        async all(query, count) {
            let DB = this;
            return DB.success((await DB.read).getAll(query, count));
        }
        async keys(query, count) {
            let DB = this;
            return DB.success((await DB.read).getAllKeys(query, count));
        }
        async key(range) {
            var DB = this;
            return DB.success((await DB.read).getKey(range));
        }
        index(name) {
            var DB = this;
            return new (class {
                get request() {
                    return I.Async(async (re) => re((await DB.read).index(name)));
                }
                async cursor(fn, query, direction) {
                    return DB.cursor(fn, query, direction, await this.request);
                }
                async keys(fn, query, direction) {
                    return DB.keyCursor(fn, query, direction, await this.request);
                }
                get(name) {
                    return DB.load(this.request, name);
                }
            })();
        }
        async cursor(fn, query, direction, request) {
            if (!request) request = await this.read;
            else if (I.await(request)) request = await request;
            return this.getCursor(request.openCursor(query, direction), fn);
        }
        async keyCursor(fn, query, direction, request) {
            if (!request) request = await this.read;
            else if (I.await(request)) request = await request;
            return this.getCursor(request.openKeyCursor(query, direction), fn);
        }
    }
    class CustomFetch {
        ispack = /(zip|rar|7z)$/;
        constructor(ARG) {
            if (I.str(ARG))
                this.url = ARG;
            else
                Object.assign(this, ARG);
            if (this.success) this.done(this.success);
        }
        async done(fn) {
            var CT = this,
                contents,
                headers, {
                    url,
                    type,
                    libjs,
                    store,
                    key,
                    unpack,
                    filename,
                    cancel,
                    onLine,
                    option,
                    version,
                    error,
                    ispack
                } = CT;
            var urlname = F.getname(url) || "index.html";
            var callback = result => {
                return I.func(fn) ? fn(result, headers) : result;
            };
            var callresult = async () => {
                if (result && result.contents) {
                    var {
                        filename,
                        fileext,
                        contents,
                        type,
                        password
                    } = result;
                    if (type == "unpack") {
                        var opt = {
                            contents: contents,
                            Name: filename,
                            ext: fileext,
                            onprogress: this.progress
                        };
                        if (password) opt.password = password;
                        result = await (new Decompress(opt)).done();

                    } else
                        result = contents;

                }
                return callback(result);
            };
            var onerror = (message) => {
                error && error(message, headers);
                return I.func(fn) ? fn() : undefined;
            };
            key = key || urlname;
            filename = filename || urlname;
            if (libjs) {
                if (ispack.test(key)) {
                    key = T.LibPad + key.replace(ispack, "js");
                    unpack = !0;
                }
                store = T.LibStore;
            }
            var Store = I.IF(store, CustomStore) ? store : T.getTable(store);
            var result = Store && (await Store.get(key, version));
            if (result && (!onLine || !T.onLine)) {
                return callresult(result);
            }
            var response = await CT.response;
            if (I.nil(response) == undefined)
                return callresult(result);

            headers = F.FilterHeader(I.toObj(response.headers) || {});
            if (!headers.filename)
                headers.filename = filename;

            var {
                url,
                status,
                statusText
            } = response;
            var {
                filetype,
                filesize,
                password
            } = headers;
            if (password) {
                CT.password = password;
            }

            I.exends(headers, {
                url,
                status,
                statusText
            });
            if (type == I.NN(document.head)) {
                cancel(response);
                return callback(headers);
            }
            if (result) {
                if (!result.filesize || filesize == result.filesize) {
                    cancel(response);
                    return callresult(result);
                }
                result = undefined;
            }
            if (response.status != 200) {
                if (filetype == F.getMime(texts[1])) {
                    headers.result = await response.json();
                } else {
                    CT.cancel(response);
                }
                return onerror(statusText, headers);
            }
            contents = await CT.steam(response, headers);
            filesize = contents.size;
            if (type != I.L(Blob)) {
                contents = await I.U8(contents);
                if (type) {
                    contents = I.decode(contents);
                    type = String.name;
                }
                if (type == T.ts[0]) {
                    contents = I.Json(contents);
                    type = T.ts[1];
                } else if (type == T.ts[0] || headers.type == document.contentType) {
                    type = HTMLElement.name;
                    contents = T.docElm(contents);
                }
            } else {
                type = File.name;
            }
            option = I.assign(option, {
                timestamp: T.date,
                filename: filename,
                filesize: filesize,
                filetype: filetype,
                type: type
            });
            if (version) option.version = version;
            if (I.u8buf(contents) || I.blob(contents)) {
                if (unpack) {
                    var undata = await this.onUpack(contents, option, key, Store);
                    if (undata) return callback(undata);
                }
            }
            if (contents) {
                if (Store) {
                    option.contents = contents;
                    Store.put(option, key);
                }
                return callback(contents);
            }
        }
        onUpack(contents, option, key, Store) {
            return I.Async(async callback => {
                var fileext = await F.CheckExt(contents);
                if (this.ispack.test(fileext)) {
                    var decompress = new Decompress({
                        contents: contents,
                        Name: option.filename,
                        ext: fileext,
                        password: this.password,
                        onprogress: this.progress
                    });
                    var filecontent = await decompress.done();
                    var maxLength = 0;
                    var backdata;
                    if (I.obj(filecontent)) {
                        await I.Async(
                            I.toArr(filecontent).map(entry => {
                                var [name, data] = entry;
                                if (this.libjs) {
                                    name = F.getname(name);
                                    var ftype = F.getMime(name);
                                    var fkey = T.LibPad + name;
                                    data = this.reBuf(data, this.unbuf, name, ftype);
                                    Store.put({
                                        contents: data,
                                        filename: name,
                                        filesize: data.byteLength,
                                        filetype: ftype,
                                        type: I.blob(data) ? File.name : I.blob(data) ? Uint8Array.name : this.unbuf,
                                        version: option.version
                                    }, fkey);
                                    if (fkey == key) {
                                        backdata = data;
                                    }
                                } else {
                                    maxLength += data.byteLength;
                                    filecontent[name] = this.reBuf(data, this.unbuf);
                                }
                            }));
                        if (backdata) {
                            return callback(backdata);
                        }
                    }
                    if (contents && maxLength) {
                        if (Store) {
                            if (maxLength > T.maxsize) {
                                Object.assign(option, {
                                    contents: contents,
                                    fileext: fileext,
                                    type: "unpack",

                                });
                                if (decompress.password) option.password = decompress.password;
                                await Store.put(option, key);
                            } else {
                                contents = null;
                                Object.assign(option, {
                                    contents: filecontent,
                                    fileext: fileext,
                                    type: NodeList.name,
                                });
                                await Store.put(option, key);
                            }
                        }
                        callback(filecontent);
                    }
                }
            });

        }
        cancel(response) {
            response.body && response.body.cancel();
        }
        async steam(response, headers) {
            var {
                body
            } = response;
            if (!body || !body.getReader)
                return response.blob();

            var {
                filename,
                type,
                length
            } = headers;
            let havesize = 0,
                speedsize = 0,
                reader = await body.getReader();
            let chunks = [];
            while (true) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) {
                    break;
                } else {
                    speedsize = value.length;
                    havesize += speedsize;
                }
                if (this.progress) {
                    let statustext = " ";
                    if (length && havesize <= length)
                        statustext = I.PER(havesize, length) + '%';
                    else
                        statustext = `(${(havesize / 1024).toFixed(1)
                            }KB)`;

                    /* 下载进度*/
                    this.progress(`${filename || ''} ${statustext}`, havesize, length, speedsize);
                }
                chunks.push(value);
            }
            return I.File(chunks, filename, type, headers["last-modified"]);
        }
        reBuf(data, unbuf, name, ftype) {
            if (unbuf == T.ts[0])
                data = I.decode(data);
            else if (unbuf == T.ts[1])
                data = I.Json(I.decode(data));
            else if (!unbuf && name)
                data = I.File([data], name, ftype);

            return data;
        }
        async getStore(store) {
            return I.IF(store, CustomStore) ? store : T.getTable(store);
        }
        get response() {
            var {
                url,
                get,
                post,
                head,
                json,
                headers
            } = this;
            let data = {
                headers: headers || {}
            };
            I.exends(data, head);
            if (json) {
                post = I.toJson(ARG.json);
                data.headers.Accept = F.getMime(T.ts[1]);
            } else if (post) {
                post = I.post(ARG.post);
            }
            if (post) {
                data.method = "POST";
                data.body = post;
            }
            return fetch(I.get(url, get), data);
        }
    }
    class Decompress {
        constructor(ARG) {
            if (!I.obj(ARG))
                this.contents = ARG;
            else
                Object.assign(this, ARG);

        }
        async done(fn) {
            var {
                ext,
                contents
            } = this;
            if (!ext) {
                ext = await F.CheckExt(contents);
            }
            var result = /(zip|rar|7z)$/.test(ext) && (/zip$/.test(ext) && await this.zip() || await this.rar(ext) || await this.extractor(ext)) || await I.U8(contents);
            return fn ? fn(result) : result;
        }
        progress(current, total, name) {
            this.onprogress && this.onprogress(`unpack(${I.PER(current, total)})${name || ''}`);
        }
        async extractor(ext) {
            return I.Async(async re => {
                F.getLibjs('extractor-new.min.zip').catch(e => re()).then(url => {
                    if (!url) return re();
                    /*T.JSpath+'lib/extractor-new.js?'+T.time */
                    var worker = new Worker(url);
                    var result = {},
                        nowFile, len = 0,
                        max;
                    worker.onmessage = e => {
                        var {
                            file,
                            data,
                            size,
                            end,
                            total,
                            error
                        } = e.data;
                        if (total) {
                            max = total;
                        } else if (end) {
                            I.Async(I.toArr(result).map(async entry => {
                                var [file, data] = entry;
                                return [file, data.length ? await I.U8((new Blob(data))) : new Uint8Array()];
                            })).then(arr => {
                                arr = arr.length ? I.toObj(arr) : undefined;
                                re(arr);
                            })
                            worker.terminate();
                        } else if (file && !/\/$/.test(file)) {
                            result[file] = []
                            nowFile = file;
                        } else if (data && nowFile) {
                            len += size;
                            result[nowFile].push(data);
                        } else if (error && !result[nowFile].length) {
                            delete result[nowFile];
                        }
                        nowFile && this.progress(len, max, nowFile);
                    };
                    worker.onerror = e => {
                        worker.terminate();
                        re()
                    };
                    worker.onmessageerror = worker.onerror;
                    worker.postMessage({
                        filename: this.Name || 'test.' + (ext || 'zip'),
                        data: this.contents,
                        DB_NAME: T.DB_NAME,
                        DB_TABLE: T.LibStore,
                        DB_FILE: T.LibPad + 'extractor-new.wasm'
                    })

                });

            });
        }
        async rar(ext) {
            var src = T.unrarsrc;
            if (ext && /7z$/.test(ext)) src = T.un7zsrc;
            var {
                contents,
                password,
                onprogress
            } = this;
            contents = await I.U8(contents);
            let url = await F.getLibjs(src, onprogress);
            return I.Async(complete => {
                let result, worker = new Worker(url),
                    close = e => worker.terminate();
                worker.onmessage = e => {
                    if (I.obj(e.data)) {
                        var {
                            t,
                            data,
                            file,
                            total,
                            current,
                            name
                        } = e.data;
                        if (t == 1) {
                            complete(result || undefined);
                        } else if (t == 2) {
                            !result && (result = {});
                            return data && (result[file] = data);
                        } else if (t == 4) {
                            return (total > 0 && total >= current) && this.progress(current, total, name || file);
                        } else if (t === -1) {
                            password = prompt('Enter password.', password || "");
                            if (!password) {
                                complete(undefined);
                            } else {
                                return worker.postMessage({
                                    password
                                });
                            }
                        }
                        close();
                    }
                };
                worker.onerror = e => {
                    complete(undefined);
                    close();
                };
                worker.onmessageerror = worker.onerror;
                worker.postMessage({
                    contents,
                    password
                });

            })
        }
        async getEntries(entrylist, password, arr) {
            if (I.none(password)) {
                var index, fistEntry = entrylist.filter((v, k) => {
                    if (I.none(index) && v.encrypted) {
                        index = k;
                        return !0;
                    }
                })[0];
                if (fistEntry) {
                    fistEntry = await this.getEncrypted(fistEntry, this.password);
                    if (fistEntry) {
                        entrylist.splice(index, 1);
                        return await this.getEntries(entrylist, fistEntry[0], fistEntry[1]);
                    }
                    return undefined;
                }

            }
            return I.toObj((arr ? [arr] : []).concat(await I.Async(entrylist.filter(entry => !entry.directory).map(async entry => [entry.filename, await this.getData(entry, password)]))));

        }
        async getData(entry, password) {
            return entry.getData(new zip.Uint8ArrayWriter(), {
                password
            });
        }
        async getEncrypted(entry, password) {
            var buf = await I.Async((re) => {
                this.getData(entry, password).catch(
                    e => {
                        password = prompt('Enter password.', password);
                        if (!password) return undefined;
                        return this.getEncrypted(entry, password);
                    }
                ).then(buf => re(buf));
            });
            this.password = password;
            if (I.u8buf(buf) || I.blob(buf)) return [password, [entry.filename, buf]];
            else return buf;
        }
        async zip() {
            var {
                contents
            } = this;
            if (typeof win.zip === I.TP()) await T.loadLibjs(T.zipsrc, this.onprogress);
            if (!I.blob(contents)) contents = new Blob([contents.buffer || contents], {
                type: F.getMime('*')
            });
            var ZipFile = new zip.ZipReader(new zip.BlobReader(contents)),
                entrylist = await ZipFile.getEntries();
            if (!I.empty(entrylist)) return await this.getEntries(entrylist);
        }
    }
    const I = new class NengeType {
        constructor() {
            let I = this;
            Object.assign(I, {
                O: (a) => (I.CS(a) == Number ? I[a] : a),
                B: (o, a) => o && o.bind(a),
                IF: (o, a) => o instanceof I.O(a),
                IC: (o, a) => I.CS(o) === I.O(a),
                TP: (o) => typeof o,
                N: (o) => (
                    (o = I.O(o)) && o.name
                ) || (I.CS(o) && I.CS(o).name) || I.TP(o),
                NC: (o) => I.LC(I.N(o)),
                R: (o, ...a) => Reflect.construct(I.O(o), a),
                H: (o, a) => (a && o.hasOwnProperty(a)) || false,
                L: (o) => (
                    ((o = I.O(o)) && I.ST(o)) || I.N(o) || I.TS(o)
                ).replace(/^(\w)/, (re) => I.LC(re)),
                C: (o) => I.CS(I.O(o)),
                CS: (o) => o != null && o != undefined && o.constructor,
                CP: (o) => (o != null && o != undefined && o.prototype) || o,
                DP: (o, a) => Reflect.deleteProperty(o, a),
                FE: (o, f) => (f && o.forEach && o.forEach(f)) || o,
                FM: (o, f) => (f && o.map && o.map(f)) || o,
                TS: (o) => o.toString(),
                NN: (o) => I.LC(o.nodeName),
                ST: (o) => I.LC(o[Symbol.toStringTag] || ""),
                LC: (o) => o && o.toLowerCase(),
                UC: (o) => o && o.toUpperCase(),
                dE: (o) => (o || document).documentElement,
                dElm: (o, a) => I.dE(new DOMParser().parseFromString(o, a)),
                elm: (o) => I.IF(o, HTMLElement),
                node: (o) => I.IF(o, Node),
                nodelist: (o) => I.IF(o, NodeList),
                isDoc: (o) => I.IF(o, Document),
                await: (o) => I.IF(o, Promise),
                blob: (o) => I.IF(o, Blob),
                file: (o) => I.IF(o, File),
                evt: (o) => I.IF(o, Event),
                keyevt: (o) => I.IF(o, KeyboardEvent),
                func: (o) => I.IF(o, Function) && !I.isClass(o),
                isClass: (o) => /^class\s/.test(Function.prototype.toString.call(o)),
                array: (o) => Array.isArray(o),
                obj: (o) => I.IC(o, Object),
                buf: (o) => I.IC(o, ArrayBuffer),
                u8obj: (o) => I.IC(o, Uint8Array),
                u8buf: (o) => I.u8obj(o),
                str: (o) => I.IC(o, String),
                cURL: (o) => URL.createObjectURL(o),
                rURL: (o) => URL.revokeObjectURL(o),
                bool: (o) => I.IC(o, Boolean),
                num: (o) => I.IC(o, Number),
                null: (o) => o === null,
                none: (o) => I.TP(o) == I.TP(),
                nil: (o) => I.null(o) || I.none(o),
                Arr: (o) => new Array(o),
                ArrFrom: (o) => Array.from(o),
                U8: (o) => I.u8buf(o) ? o : I.blob(o) ? I.Async(async (re) => re(I.U8(await o[I.L(ArrayBuffer)]()))) : new Uint8Array(o.buffer || o),
                Buf16str: (o) => I.toArr(o).map((v) => I.To16(v)).join(""),
                To16: (o) => o.toString(16).padStart(2, 0).toLocaleUpperCase(),
                ArrTest: (o, a) => I.toArr(o).filter((entry) => entry[1].test(a))[0],
                decode: (o, a) => new TextDecoder(a).decode(o),
                encode: (o) => new TextEncoder().encode(o),
                isForm: (o) => I.IF(o, FormData),
                setForm: (o) => new FormData(o),
                setParam: (o) => new URLSearchParams(o),
                Int: (o) => I.IntVal(o),
                IntVal: (o, a) => parseInt(o, a),
                PER: (o, ...a) => I.Int(
                    (100 * o) / a[0]
                ).toFixed(0) + (!a[1] ? "%" : ""),
                Async: (o, b) => I.array(o) ? b ? Promise.allSettled(o) : Promise.all(o) : I.func(o) ? new Promise(o) : null,
                $: (o, a) => (a || document).querySelector(o) || undefined,
                $$: (o, a) => (a || document).querySelectorAll(o) || undefined,
                $c: (o) => document.createElement(o),
                RegRe: (o, a) => (I.toArr(a, (e) => (o = o.replace(new RegExp(`{${e[0]
                    }}`, "g"), e[1]))) && 0) || o,
                setStyle: (o, a) => (I.toArr(a, (x) => I.reProp(o.style || o, x[0], x[1])) && 0) || o,
                getAttr: (o, a) => I.B(I.CP(Element).getAttribute, o)(a),
                setAttr: (o, a, b) => b ? I.B(I.CP(Element).setAttribute, o)(a, b) : I.getAttr(o, a),
                reAttr: (o, a, b) => I.nil(b) ? I.B(I.CP(Element).removeAttribute, o)(a) : I.setAttr(o, a, b),
                getProp: (o, a) => I.B(I.CP(CSSStyleDeclaration).getPropertyValue, o)(a),
                setProp: (o, a, b) => b ? I.B(I.CP(CSSStyleDeclaration).setProperty, o)(a, b) : I.getProp(o, a),
                reProp: (o, a, b) => b ? I.setProp(o, a, b) : I.B(I.CP(CSSStyleDeclaration).removeProperty, o)(a),
                Attr: (o, ...a) => I.obj(a[0]) ? I.toArr(a[0], (v) => I.Attr(o, v[0], v[1])) : a[0] ? I.setAttr(o, ...a) : I.toObj(o.attributes),
                Call: (o, ...a) => Reflect.apply(o, a.shift(), a),
                Apply(o, a, b) {
                    if (I.str(o) && b)
                        o = b[o];

                    return I.func(o) && Reflect.apply(o, b, a);
                },
                on: (o, ...a) => o && I.Apply(addEventListener, a, o),
                un: (o, ...a) => o && I.Apply(removeEventListener, a, o),
                EachNext: (o, a) => !(a = []) || I.Next(o, (s) => a.push(I.num(s[0]) ? s[1] : s)) || a,
                Next(o, fn) {
                    if (o.entries)
                        o = o.entries();

                    let v = o.next();
                    while (!v.done) {
                        fn(v.value);
                        v = o.next();
                    }
                },
                inArr: (o, ...a) => I.Item(a, (v) => o.includes(v)) || !1,
                inClass: (o, ...a) => I.Item(a, (v) => I.IF(v, o)) || !1,
                Item(o, fn) {
                    for (let i = 0; i < o.length; i++) {
                        let re = fn((o.item && o.item(i)) || o[i]);
                        if (re)
                            return re;

                    }
                },
                EachItem: (o, a) => !(a = []) || I.Item(o, (v) => {
                    if (I.IF(o, CSSStyleDeclaration))
                        a.push([
                            v, I.getProp(o, v)
                        ]);
                    else if (v.value)
                        a.push([v.name, v.value]);
                    else
                        a.push(v);

                }) || a,
                EachValue: (o, a) => !(a = []) || !I.FE(o, (v, k) => a.push([k, v])) || a,
                FromEntries(o) {
                    return Object.fromEntries(I.toArr(o).map((s, k) => !I.array(s) || s.length != 2 ? [k, s] : s));
                },
                getEntries(o) {
                    if (I.obj(o)) {
                        return I.Entries(o);
                    } else if (I.num(o) || o.byteLength) {
                        return I.ArrFrom(I.U8(o.buffer || o));
                    } else if (I.func(o.entries)) {
                        return I.EachNext(o);
                    } else if (o.item) {
                        return I.EachItem(o);
                    }
                    return I.ArrFrom(o);
                },
                Entries: (o, f) => I.FE(Object.entries(o), f),
                toJson: (post) => JSON.stringify(I.Json(post)),
                define: (o, p, attr, bool, rw) => Object.defineProperty(o, p, !bool ? attr : {
                    get: I.func(attr) ? attr : () => attr,
                    configurable: rw == !0
                }),
                defines: (o, attr, bool, rw) => bool ? I.toArr(attr, (entry) => I.define(o, entry[0], entry[1], 1, rw)) : Object.defineProperties(o, attr),
                AsyncTry: (fn, error) => I.Async(async (re) => {
                    fn().catch(async (e) => {
                        if (error(e))
                            return re(null);

                        re(await I.AsyncTry(fn, error));
                    }).then((result) => re(result));
                }),
                assign(...a) {
                    if (I.array(a[0]))
                        a = [].concat(...a);

                    return Object.assign({}, ...a);
                },
                exends: (o, a, b) => b ? (I.toArr(b, (v) => (o[v] = a[v])) && 0) || a : Object.assign(o, a),
                empty(data) {
                    if (!data || data == !1)
                        return !0;
                    else if (I.str(data))
                        return data.trim().length == 0;

                    return I.toArr(data).length == 0;
                },
                Json(post) {
                    if (I.u8buf(post))
                        post = I.decode(post);

                    return I.str(post) ? new Function("return " + post)() : post;
                },
                progress(fn, ...a) {
                    if (fn) {
                        a[0] += " " + I.PER(a[1], a[2]);
                        return I.Apply(fn, a, a[3]);
                    }
                },
                File: (o, n, type, d) => new File(o, n, {
                    type,
                    lastModified: d && I.Date(d).getTime()
                }),
                Date: (o) => new Date(I.IntVal(o) || o)
            });
            T.mobile = !I.none(document.ontouchend);
        }
        post(obj) {
            let post = I.isForm(obj) ? obj : I.setForm(I.elm(obj) ? obj : I.str(obj) ? I.$(obj) : undefined);
            if (I.obj(obj))
                I.toArr(obj, (v) => post.append(v[0], v[1]));

            return post;
        }
        get(url, ...arg) {
            let urlsearch = url.split("?"),
                urls = (urlsearch[1] && urlsearch[1].split("#")[0]) || "",
                data = I.toArr(I.toObj(I.setParam(urls + "&" + arg.map((v) => (I.obj(v) ? I.setParam(v) : v)).join("&")))).map((v) => v[0] + "=" + v[1]).join("&").replace(/=&/g, "&");
            return urlsearch[0] + (data ? "?" + data : "");
        }
        toObj(obj) {
            if (!obj)
                return {};

            return I.obj(obj) ? obj : I.FromEntries(obj);
        }
        toArr(obj, func) {
            if (!obj)
                return [];

            let arr = I.getEntries(obj);
            if (I.func(func))
                return I.FE(arr, func);

            return arr;
        }
    };
    const F = new class NengeUtil {
        Libjs = {};
        ext16 = {
            "7z": /^377ABCAF271C/,
            rar: /^52617221/,
            zip: /^504B0304/,
            png: /^89504E470D0A1A0A/,
            gif: /^47494638(3761|3961)/,
            jpg: /^FFD8FFE000104A464946/,
            webp: /^52494646\w{8}57454250/,
            pdf: /^255044462D312E/,
            bmp: /^424D\w{4}0{8}/
        };
        exttype = {
            text: [
                "css",
                "scss",
                "sass",
                "html",
                "htm",
                "xml"
            ],
            "text/javascript": ["js"],
            "text/css": ["style"],
            "text/html": [
                "htm", "php"
            ],
            "text/plain": ["txt"],
            "text/xml": ["vml"],
            image: [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "avif",
                "apng",
                "heic"
            ],
            font: [
                "woff", "woff2", "ttf", "otf"
            ],
            "image/svg+xml": ["svg"],
            "application/octet-stream": ["*"],
            application: [
                "pdf", "json"
            ],
            "application/x-zip-compressed": ["zip"],
            "application/x-rar-compressed": ["rar"],
            "application/x-7z-compressed": ["7z"]
        };
        CheckExt(u8) {
            let buf = u8.slice(0, 16);
            let text = I.blob(buf) ? I.U8(buf) : I.str(buf) ? I.encode(buf) : buf;
            return I.await(text) ? I.Async(async (e) => {
                e(F.mimeHead(await text));
            }) : F.mimeHead(text);
        }
        async getLibjs(jsfile, progress, version, decode, Filter) {
            let jsname = F.getname(jsfile),
                file = jsname.replace(/\.zip$/, ".js");
            if (F.Libjs[jsname])
                return F.Libjs[jsname];

            if (F.Libjs[file])
                return F.Libjs[file];

            version = version || T.version;
            let contents = await T.getTable(T.LibStore).getdata(T.LibPad + file, version);
            if (!contents) {
                contents = await T.FetchItem({
                    url: F.getlibpath(jsfile) + "?" + T.time,
                    libjs: !0,
                    version: version,
                    progress,
                    Filter,
                    decode,
                    unbuf: decode ? T.ts[0] : !1
                });
            }
            if (/json$/.test(file)) {
                F.Libjs[file] = contents;
            } else if (contents) {
                if (I.obj(contents)) {
                    I.toArr(contents, (entry) => (F.Libjs[entry[0]] = entry[1] && F.URL(entry[1], entry[0])));
                } else {
                    F.Libjs[file] = F.URL(contents, file);
                }
            }
            contents = null;
            return F.Libjs[file];
        }
        URL(u8, type) {
            if (I.str(u8) && /^(blob|http|\/?\w+\/)[^\n]*$/i.test(u8))
                return u8;

            return I.cURL(I.blob(u8) ? u8 : new Blob([u8], {
                type: F.getMime(type || (I.u8buf(u8) && F.CheckExt(u8)) || "js")
            }));
        }
        reURL(url) {
            return I.rURL(url);
        }
        getlibpath(js) {
            let x = /^[\w\-\.]+$/.test(js) ? "lib/" : "";
            return F.getpath(x + js);
        }
        getname(str) {
            let name = (str || "").split("/").pop().split("?")[0].split("#")[0];
            if (!name) {
                str = (str).match(/\/\?([\w\-\_\.]+?\.[a-z0-9A-Z]+)\&?/);
                if (str) {
                    name = str[1];
                }
            }
            return name || "";
        }
        getpath(js) {
            return /^(\/|https?:\/\/|static\/js\/|data\/|assets|blob\:|\.|\/)/.test(js) ? js : T.JSpath + js;
        }
        getExt(name) {
            return I.LC(F.getname(name).split(".").pop());
        }
        getKeyName(name) {
            let p = F.getname(name).split(".");
            return p.slice(0, p.length > 1 ? p.length - 1 : 1).join(".");
        }
        getMime(type, chartset) {
            let mime;
            if (/^\w+\/\w+$/.test(type) || F.exttype[type])
                mime = type;
            else {
                if (!F.extlist) {
                    F.extlist = I.assign(I.toArr(F.exttype).map((entry) => I.toObj(I.toArr(entry[1]).map((v) => {
                        let key = entry[0];
                        if (!/\//.test(key)) {
                            delete F.exttype[key];
                            key += "/" + v;
                            F.exttype[key] = !0;
                        }
                        return [v, key];
                    }))));
                }
                mime = F.extlist[F.getExt(type)] || F.extlist["*"];
            }
            if (chartset && /(text|javascript|xml|json)/.test(mime))
                return mime + ";chartset=utf8";

            return mime;
        }
        getType(type) {
            type = F.getMime(type);
            return type.split("/").pop();
        }
        FilterHeader(headers) {
            I.toArr(headers, (entry) => {
                if (/content-/.test(entry[0])) {
                    let name = entry[0].replace("content-", "");
                    let content = decodeURI(entry[1]);
                    if (isFinite(content))
                        content = I.IntVal(content);

                    switch (name) {
                        case "disposition":
                            let attachName = content.match(/^attachment;\s*filename=[\"\']+?(.+)[\"\']+?$/i);
                            if (attachName && attachName[1]) {
                                headers.filename = decodeURI(attachName[1]);
                            }
                            break;
                        case "length":
                            headers.filesize = content;
                        case "password":
                            headers[name] = content;
                            break;
                        case "type":
                            content = I.LC(content);
                            let v = content.split(";");
                            headers.filetype = content;
                            headers[name] = v[0].trim();
                            if (v[1])
                                headers.charset = I.LC(v[1].split("=").pop().trim());

                            break;
                    }
                }
            });
            return headers;
        }
        ajaxHeader(request) {
            return F.FilterHeader(I.toObj((request.getAllResponseHeaders() || "").trim().split(/[\r\n]+/).map((line) => {
                let parts = line.split(": ");
                return [parts.shift(), parts.join(": ")];
            }).concat([
                [
                    "status", request.status
                ],
                [
                    "statusText", request.statusText
                ],
                [
                    "url", request.responseURL
                ],
            ])));
        }
        HtmltoStr(obj) {
            if (I.elm(obj) && !obj.contents) {
                obj = {
                    contents: obj
                };
            }
            let elm = obj && obj.contents;
            if (I.elm(elm)) {
                obj.contents = elm.outerHTML;
                obj.tag = I.NN(document.body);
                obj.type = HTMLElement.name;
            }
            return obj;
        }
        mimeHead(s) {
            let text = I.Buf16str(s),
                result = I.ArrTest(F.ext16, text);
            if (result && result[0])
                return result[0];

            return "";
        }
    };
    (function () {
        var {
            language,
            serviceWorker
        } = navigator;
        var spath = document.currentScript,
            src = spath && spath.src.split("?"),
            JSpath = src && src[0].split("/").slice(0, -1).join("/") + "/",
            langs = I.LC(language).split("-");
        JSpath && (JSpath = JSpath.replace("static/", ""));
        if (langs[0] == "zh") {
            if (langs[1] == "cn")
                langs[1] = "hans";
            else if (langs[1] != "hk")
                langs[1] = "hant";

        }
        Object.assign(T, Nenge, {
            JSpath,
            ROOT: (JSpath && JSpath.replace("assets/js/", "")) || location.pathname,
            langName: langs[0],
            i18nName: langs.join("-"),
            charset: I.LC(document.characterSet),
            language,
            setNode() {
                Object.assign(Node.prototype, {
                    on(evt, fun, opt, cap) {
                        return T.on(this, evt, fun, opt, cap);
                    },
                    un(evt, fun, opt, cap) {
                        return T.un(this, evt, fun, opt, cap);
                    },
                    once(evt, fun, opt, cap) {
                        return T.once(this, evt, fun, opt, cap);
                    }
                });
            }
        });
        T.ts = [
            I.L(Text),
            I.L(JSON),
            F.getType(T.mime),
            T.mime,
            I.L(String)
        ];
        I.defines(T, {
            I,
            F,
            date: () => new Date(),
            time: () => Date.now(),
            rand: () => Math.random(),
            randNum: () => I.IntVal(Math.random().toString().slice(2))
        }, 1);
        if (serviceWorker) {
            I.defines(T, {
                sw: {
                    get() {
                        return serviceWorker.controller;
                    }
                }
            });
            T.setServiceWorker();
        }
        /*
        let ehtml = document.documentElement;
        if (!I.Attr(ehtml, "color-scheme")) {
            T.MediaQuery("(prefers-color-scheme: light)", (bool) => I.Attr(ehtml, {
                "color-scheme": bool ? "light" : "dark"
            }));
        }
        */
        win.onerror = (msg, url, lineNo, columnNo, error) => alert(msg + lineNo + url);
    })();
    I.defines(win, {
        Nenge: () => T
    }, 1);
});