(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : ((global = typeof globalThis !== "undefined" ? globalThis : global || self), factory((global)));
})(this, function (exports) {
    "use strict";
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
        NamedNodeMap,
        Date,
        Event,
        CustomEvent,
        JSON,
        indexedDB,
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
        console,
        EventTarget
    } = exports;
    const evtname = ["success", "error", "progress"];
    const typename = ['js', 'json'];
    /**
     * 自定义HTML标签类绑定
     */
    class CustomElement extends HTMLElement {
        /* 警告 如果文档处于加载中,自定义元素实际上并不能读取子元素(innerHTML等) */
        /*因此 如果仅仅操作属性(Attribute),可以比元素出现前提前定义.否则最好文档加载完毕再定义,并不会影响事件触发 */
        constructor() {
            super();
            const C = this;
            C.ElmName = I.toUp("TAG_" + C.tagName.replace(/-/g, "_"));
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
    /**
     * 本地数据 库操作
     */
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
                req.once("error", async (err) => {
                    throw err;
                });
                req.once("upgradeneeded", upgrad || (e => {
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
                req.once(evtname[0], async (e) => {
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
    /**
     * 本地数据 表操作
     */
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
            return I.Async((resolve) => request.on(evtname[0], (e) => {
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
                            contents = I.File(contents, filename || name, filetype);
                            if (type != File.name) {
                                contents = await I.toU8(contents);
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
                            var newcontens = await I.toU8(contents.slice(pos, filesize - pos >= T.maxsize ? pos + T.maxsize : filesize));
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
    /**
     * Fetch请求远程文件
     */
    class CustomFetch extends EventTarget {
        ispack = /(zip|rar|7z)$/;
        unpackText = 'unpack:';
        downText = 'down:';
        constructor(ARG) {
            super();
            var CF = this;
            if (I.str(ARG)) {
                CF.url = ARG;
            } else {
                Object.assign(CF, ARG);
            }
            if (ARG.libjs) {
                CF.store = T.LibStore;
                CF.type = I.L(Blob);
            }
            Object.assign(CF, {
                toProgress(current, total, name) {
                    I.tryCall(CF,CF.progress,name + '(' +I.PER(current, total) + ')', current, total);
                },
                toSuccess(result, headers) {
                    CF.toEvent(evtname[0], { result, headers });
                },
                toError(result) {
                    CF.toSuccess();
                    I.tryCall(CF,CF.error,result, CF);
                },
                toCancel(response) {
                    I.tryCall(response.body,response.body.cancel);
                },
                async getItem(key, version) {
                    return I.tryCall(CF.DB,'get',key, version)
                },
                async setItem(data, key, contents, type) {
                    if (CF.DB) {
                        if (contents) data.contents = contents;
                        if (type) data.type = type;
                        CF.DB.put(data, key);
                    }
                },
                urlname: F.getname(CF.url) || 'index.html',
                DB: T.getTable(CF.store),
                result: new Promise(re => {
                    CF.once(evtname[0], function (e) {
                        var { result, headers } = e.detail;
                        I.tryCall(CF,CF.success,result, headers);
                        re(result);
                    })
                })
            });
            CF.toSend();
        }
        async toSend() {
            var CT = this,
                contents,
                headers, {
                    urlname,
                    type,
                    libjs,
                    store,
                    key,
                    unpack,
                    filename,
                    onLine,
                    option,
                    version,
                    ispack,
                    toSuccess,
                    toCancel,
                    toError,
                } = CT;
            var callback = result => {
                toSuccess(result, headers);
            };
            var callresult = async () => {
                if (result && result.contents) {
                    var {
                        filename,
                        fileext,
                        contents,
                        type,
                    } = result;
                    if (type == "unpack") {
                        result = await new Decompress({
                            contents: contents,
                            Name: filename,
                            ext: fileext,
                            progress: (current, total, name) => CT.toProgress(current, total, CT.unpackText + name),
                            password: result.password || CT.password
                        }).result;

                    } else
                        result = contents;

                }
                return callback(result);
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
            var result = await CT.getItem(key, version);
            if (result && (!onLine || !T.onLine)) {
                return callresult(result);
            }
            var response = await CT.response();
            if (I.nil(response)) {
                if (result) {
                    return callresult(result);
                } else {
                    return toError({ message: CT.statusText });
                }
            }
            headers = F.FilterHeader(I.toObj(response.headers) || {});
            if (!headers.filename) {
                headers.filename = filename;
            }
            var {
                filetype,
                filesize,
                password
            } = headers;
            if (password) {
                CT.password = password;
            }
            if (type == 'head') {
                toCancel(response);
                return callback(headers);
            }
            if (result) {
                if (!result.filesize || filesize == result.filesize) {
                    toCancel(response);
                    return callresult(result);
                }
                result = undefined;
            }
            if (response.status != 200) {
                if (filetype == F.getMime(T.ts[1])) {
                    result = await response.json();
                } else {
                    result = await response.text();
                }
                return toError({ message: result || response.statusText, headers });
            }
            contents = await CT.steam(response, headers);
            filesize = contents.size;
            if (type != I.L(Blob)) {
                contents = await I.toU8(contents);
                if (CT.Filter) {
                    contents = await CT.Filter(contents, urlname, headers);
                } else if (type) {
                    contents = I.decode(contents, CT.charset);
                }
                if (type == T.ts[1]) {
                    contents = I.Json(contents);
                    type = T.ts[1];
                } else if (type == T.ts[2]) {
                    type = HTMLElement.name;
                    contents = T.docElm(contents);
                } else if (I.u8buf(contents)) {
                    type = Uint8Array.name;
                } else {
                    type = String.name;
                }
            } else {
                type = File.name;
            }
            option = Object.assign(option || {}, {
                timestamp: T.date,
                filename: filename,
                filesize: filesize,
                filetype: filetype,
                type: type
            });
            if (version) option.version = version;
            if (I.u8buf(contents) || I.blob(contents)) {
                if (unpack) {
                    return CT.toPack(contents, option, key, headers);
                }
            }
            if (contents) {
                CT.setItem(option, key, contents);
                return callback(contents);
            }
        }
        async toPack(contents, option, key, headers) {
            var CT = this;
            var fileext = await F.CheckExt(contents), filecontent;
            if (fileext && CT.ispack.test(fileext)) {
                var decompress = new Decompress({
                    contents: contents,
                    Name: option.filename,
                    ext: fileext,
                    password: CT.password,
                    progress: (current, total, name) => CT.toProgress(current, total, CT.unpackText + name)
                });
                var maxLength = 0;
                var backdata;
                filecontent = await decompress.result;
                if (I.obj(filecontent)) {
                    await I.Async(
                        I.toArr(filecontent).map(async entry => {
                            var [name, data] = entry;
                            if (CT.libjs) {
                                name = F.getname(name);
                                var ftype = F.getMime(name);
                                var fkey = T.LibPad + name;
                                data = CT.reBuf(data, CT.unbuf, name, ftype);
                                await CT.setItem({
                                    contents: data,
                                    filename: name,
                                    filesize: data.byteLength,
                                    filetype: ftype,
                                    type: I.blob(data) ? File.name : I.blob(data) ? Uint8Array.name : CT.unbuf,
                                    version: option.version
                                }, fkey);
                                if (fkey == key) {
                                    backdata = data;
                                }
                            } else {
                                maxLength += data.byteLength;
                                filecontent[name] = CT.reBuf(data, CT.unbuf);
                            }
                        }));
                    if (backdata) {
                        contents = null;
                        return CT.toSuccess(backdata, headers);
                    } else if (CT.libjs && filecontent) {
                        return CT.toSuccess(filecontent, headers);
                    }
                }
                if (contents && maxLength) {
                    option.fileext = fileext;
                    if (maxLength > T.maxsize) {
                        option.type = "unpack";
                        if (decompress.password) option.password = decompress.password;
                    } else {
                        contents = filecontent;
                        option.type = Object.name;
                    }

                }
            }
            await CT.setItem(option, key, contents);
            if (filecontent) return CT.toSuccess(filecontent, headers);
            CT.toSuccess(contents, headers);

        }
        async steam(response, headers) {
            var CT = this;
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
                /* 下载进度*/
                CT.toProgress(havesize, length, CT.downText + filename);
                chunks.push(value);
            }
            return I.File(chunks, filename, type);
        }
        reBuf(data, unbuf, name, ftype) {
            var CT = this;
            if (unbuf == T.ts[0])
                data = I.decode(data, CT.charset);
            else if (unbuf == T.ts[1])
                data = I.Json(I.decode(data, CT.charset));
            else if (!unbuf && name)
                data = I.File([data], name, ftype);

            return data;
        }
        response() {
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
            Object.assign(data, head);
            if (json) {
                post = I.toJson(ARG.json);
                data.headers.Accept = F.getMime(T.ts[1]);
            } else if (post) {
                post = I.toPost(ARG.post);
            }
            if (post) {
                data.method = "POST";
                data.body = post;
            }
            return fetch(I.toGet(url, get), data).catch(err => {
                this.statusText = err;
            });
        }
    }
    class CustomAjax extends EventTarget {    
        constructor(ARG) {
            super();
            const A = this;
            if (I.str(ARG))
                A.url = ARG;
            else
                Object.assign(A, ARG);
            Object.assign(A, {
                headers:{},
                total:0,
                toProgress(bool,current, total,name) {
                    I.tryCall(A,bool?A.progress:A.postProgress,name+I.PER(current,total),current, total);
                },
                toSuccess(result, headers) {
                    A.toEvent(evtname[0], { result, headers })
                },
                toError(result,headers,request) {
                    A.toSuccess();
                    I.tryCall(A,A.error,result,headers,request);
                },
                result: new Promise(re => A.once(evtname[0], e => {
                    var { result, headers } = e.detail;
                    I.tryCall(A,A.success,result, headers);
                    re(result);
                }))
            })
            if (A.url) A.toSend();
        }
        getHeader(request) {
            return F.FilterHeader(I.toObj((request.getAllResponseHeaders() || "").trim().split(/[\r\n]+/).map((line) => {
                let parts = line.split(": ");
                return [parts.shift(), parts.join(": ")];
            })));
        }
        toSend() {
            var A = this;
            var { url, get, post, type, json, headers, paramsDictionary } = A;
            const request = new XMLHttpRequest(paramsDictionary);
            var ResHeaders, ReType;
            var urlname = F.getname(url)||'index.html';
            request.on('readystatechange', (event) => {
                let readyState = request.readyState;
                if (readyState === 2) {
                    ResHeaders = A.getHeader(request);
                    ReType = ResHeaders.type;
                    A.total = ResHeaders.length||0;
                    if (!type) {
                        if (ReType == F.getMime('json')) {
                            request.responseType = 'json';
                        } else if (ReType == F.getMime("xml")) {
                            request.responseType = "xml";
                        } else if (ResHeaders.filename || !/(text|html|javascript|css)/.test(ReType)) {
                            request.responseType = I.L(Blob);
                        }
                    } else if (type == 'head') {
                        request.abort();
                    }
                } else if (readyState === 4) {
                    if (type == 'head'){
                        return A.toSuccess(ResHeaders);
                    }
                    let result = request.response;
                    if (I.blob(result)) {
                        result = I.File([result], ResHeaders.filename || urlname, ReType);
                    }
                    if (request.status == 200) {
                        return A.toSuccess(result, ResHeaders);
                    } else {
                        return A.toError(request.statusText || "net::ERR_FAILED", ResHeaders, request);
                    }
                }
            });
            request.on(evtname[2], (e) => A.toProgress(!0,e.loaded, e.total,urlname));
            request.upload.on(evtname[2], (e) => A.toProgress(!1,e.loaded, e.total,urlname));
            var formData = json ? I.toJson(json) : post ? I.toPost(post) : undefined;
            json && Object.assign(headers, { Accept: F.getMime(typename[1]) });
            if (type != 'head') request.responseType = type;
            request.open(!formData ? "GET" : "POST", I.toGet(url, { inajax: Date.now()}));
            I.toArr(headers, (entry) => request.setRequestHeader(entry[0], entry[1]));
            request.send(formData);
        }
    }
    /**
     * 解压文件
     */
    class Decompress extends EventTarget {
        src7z = "extract7z.zip";
        srcrar = "libunrar.min.zip";
        pwText = 'Enter password.';
        constructor(ARG) {
            super();
            if (!I.obj(ARG) && (I.buf(ARG) || I.blob(ARG)))
                this.contents = ARG;
            else
                Object.assign(this, ARG);
            Object.assign(this,{
                toProgress(current, total, name){
                    I.tryCall(this,this.progress,current, total, name);
                },
                result:new Promise(re => this.once(evtname[0], e => re(e.detail)))
            });
            if (this.contents) this.ondone();

        }
        async ondone() {
            var {
                ext,
                contents,
                password,
                progress,
                pwText,
            } = this;
            if (!ext) {
                ext = await F.CheckExt(contents);
            }
            if (/zip$/.test(ext)) {
                return this.toEvent(evtname[0], await new ZipCompress({ contents, password, progress, pwText }).result);
            }
            this.toEvent(evtname[0], /(zip|rar|7z)$/.test(ext) && await this.rar(ext) || await I.toU8(contents));
        }
        /**
        async extractor(ext) {
            return I.Async(async re => {
                F.getLibjs('extractor-new.min.zip').catch(e => re()).then(url => {
                    if (!url) return re();
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
                                return [file, data.length ? await I.toU8((new Blob(data))) : new Uint8Array()];
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
                        nowFile && this.toProgress(len, max, nowFile);
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
        **/
        async rar(ext) {
            var {
                contents,
                password,
                progress,
                src7z, srcrar
            } = this;
            var src = ext && /7z$/.test(ext) ? src7z : srcrar;
            contents = await I.toU8(contents);
            let url = await F.getLibjs(src, progress);
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
                            return (total > 0 && total >= current) && this.toProgress(current, total, name || file);
                        } else if (t === -1) {
                            password = prompt(this.pwText, password || "");
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
    }
    /**
     * 解压ZIP
     */
    class ZipCompress extends EventTarget {
        zipsrc = "zip.min.js";
        pwText = 'Enter password.';
        constructor(ARG) {
            super();
            var Z = this;
            if (I.blob(ARG) || I.buf(ARG)) {
                Z.contents = ARG;
            } else {
                Object.assign(Z, ARG);
            }
            Object.assign(Z,{
                toProgress(current, total, name) {
                    I.tryCall(Z,Z.progress,current, total, name);
                },
                result:new Promise(re => Z.once(evtname[0], e => re(e.detail)))
            });
            if (Z.contents) Z.pack ? Z.toEnData() : Z.toDeData();
        }
        async loadjs() {
            if (I.nil(exports.zip)) {
                await T.loadLibjs(this.zipsrc, this.progress);
            }
        }
        async toEnData() {
            await this.loadjs();
            var { password, contents } = this;
            const zipFileWriter = new zip.BlobWriter();
            const zipWriter = new zip.ZipWriter(zipFileWriter, {
                password
            });
            if (!contents) return zipWriter;
            if (I.buf(contents)) {
                zipWriter.add('unknow.data', new zip.BlobReader(I.toBlob(contents)), { onprogress: (current, total) => this.toProgress(current, total), password });
            } else {
                I.toArr(contents).map(entry => zipWriter.add(entry[0], new zip.BlobReader(I.toBlob(entry[1])), { onprogress: (current, total) => this.toProgress(current, total, entry[0]), password }));
            }
            await zipWriter.close({ onprogress: (current, total) => this.toProgress(current, total, 'complete') });
            this.toEvent(evtname[0], await zipFileWriter.getData());
        }
        async toDeData() {
            var { password, contents } = this;
            await this.loadjs();
            var ZipFile = new zip.ZipReader(new zip.BlobReader(I.blob(contents) ? contents : I.toBlob(contents))),
                entrylist = await ZipFile.getEntries();
            this.toEvent(evtname[0], !I.empty(entrylist) ? await this.getEntries(entrylist) || await I.toU8(contents) : undefined)
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
            return entry.getData(new zip.Uint8ArrayWriter(), { password, onprogress: (current, total) => this.toProgress(current, total, entry.filename) });
        }
        async getEncrypted(entry, password) {
            var buf = await I.Async((re) => {
                this.getData(entry, password).catch(
                    e => {
                        password = prompt(this.pwText, password);
                        if (!password) return undefined;
                        return this.getEncrypted(entry, password);
                    }
                ).then(buf => re(buf));
            });
            this.password = password;
            if (I.u8buf(buf) || I.blob(buf)) return [password, [entry.filename, buf]];
            else return buf;
        }
    }
    /**
     * 检查转换类
     */
    const I = {
        IF: (o, a) => o instanceof a,
        IC: (o, a) => I.CS(o) === a,
        TP: o => typeof o,
        N: o => o.name || (I.CS(o) && I.CS(o).name) || I.TP(o),
        NC: o => I.toLow(I.N(o)),
        R: (o, ...a) => Reflect.construct(o, a),
        L: o => (
            I.ST(o) || I.N(o) || I.toStr(o)
        ).replace(/^(\w)/, (re) => I.toLow(re)),
        C: o => I.CS(o),
        CS: o => !I.nil(o) && o.constructor,
        DP: (o, a) => Reflect.deleteProperty(o, a),
        /**
         * 遍历数组
         * @param {Array} o 
         * @param {Function} f 
         * @returns {Array}
         */
        Each: (o, f) => f && o.forEach(f) || o,

        NN: o => I.toLow(o.nodeName),
        ST: o => I.toLow(o[Symbol.toStringTag] || ""),
        dE: o => (o || document).documentElement,
        dElm: (o, a) => I.dE(new DOMParser().parseFromString(o, a)),
        /**
         * HTML对象
         * @param {Object} o 
         * @returns {Boolean}
         */
        elm: o => I.IF(o, HTMLElement),
        node: o => I.IF(o, Node),
        nodelist: o => I.IF(o, NodeList),
        /**
         * 异步函数
         * @param {Object} o 
         * @returns {Boolean}
         */
        await: o => I.IF(o, Promise),
        /**
         * Blob对象
         * @param {Object} o 
         * @returns {Boolean}
         */
        blob: o => I.IF(o, Blob),
        /**
         * 文件
         * @param {Object} o 
         * @returns {Boolean}
         */
        file: o => I.IF(o, File),
        /**
         * 函数
         * @param {Object} o 
         * @returns {Boolean}
         */
        func: o => I.IF(o, Function) && !I.isClass(o),
        isClass: o => /^class\s/.test(I.toStr(o.constructor)),
        /**
         * 数组
         * @param {Object} o 
         * @returns {Boolean}
         */
        array: o => Array.isArray(o),
        /**
         * 普通对象集
         * @param {Object} o 
         * @returns {Boolean}
         */
        obj: o => I.IC(o, Object),
        /**
         * 二进制
         * @param {Object} o 
         * @returns {Boolean}
         */
        buf: o => I.IC(o && o.buffer || o, ArrayBuffer),
        /**
         * Uint8Array对象
         * @param {Object} o 
         * @returns {Boolean}
         */
        u8obj: o => I.IC(o, Uint8Array),
        u8buf: o => I.u8obj(o),
        str: o => I.IC(o, String),
        toURL: o => URL.createObjectURL(o),
        reURL: o => URL.revokeObjectURL(o),
        /**
         * 布尔值
         * @param {Object} o 
         * @returns {Boolean}
         */
        bool: o => I.IC(o, Boolean),
        /**
         * 数字
         * @param {Object} o 
         * @returns {Boolean}
         */
        num: o => I.IC(o, Number),
        /**
         * null值
         * @param {Object} o 
         * @returns {Boolean}
         */
        null: o => o === null,
        /**
         * 未定义值
         * @param {Object} o 
         * @returns {Boolean} 
         */
        none: o => I.TP(o) == I.TP(),
        /**
         * 空值或者未定义
         * @param {Object} o 
         * @returns {Boolean}
         */
        nil: o => I.null(o) || I.none(o),
        /**
         * 对象原型
         * @param {Object} o 对象 
         * @returns {prototype}
         */
        Proto: o => !I.nil(o) && o.prototype,
        /**
         * 原型属性
         * @param {Object} o 对象 
         * @param {*} p 属性/方法
         * @returns {Boolean}
         */
        hasOwnProp: (o, p) => I.hasProp(I.Proto(o), p),
        /**
         * 是否含有属性
         * @param {Object} o 对象
         * @param {String} p 属性/方法
         * @returns {Boolean}
         */
        hasProp: (o, p) => o.hasOwnProperty(p),
        /**
         * 转化为ArrayBuffer
         * @param {Blob} o 
         * @returns {ArrayBuffer|Promise}
         */
        toBuf: o => o.arrayBuffer(),
        /**
         * blob转换Uint8Array
         * @param {Blob} o
         * @returns {Promise<Uint8Array>}
         */
        Blob2U8: async o => I.toU8(await I.toBuf(o)),
        /**
         * 转换为BLOB
         * @param {*} o 
         * @returns 
         */
        toBlob: o => new Blob([o.buffer || o]),
        /**
         * {async}
         * 转化为Uint8Array
         * @param {ArrayBuffer|Blob} o
         * @returns {Uint8Array|Promise<Uint8Array>}
         */
        toU8: o => I.u8buf(o) ? o : I.blob(o) ? I.Blob2U8(o) : new Uint8Array(o.buffer || o),
        U8: o => I.toU8(o),
        /**
         * 打印字符
         * @param {any} o 
         * @param {number|null} a 参数
         * @returns {String}
         */
        toStr: (o, a) => o.toString(a),
        /**
         * 大写
         * @param {String} o 
         * @returns {String}
         */
        toUp: o => o && o.toUpperCase(),
        /**
         * 小写
         * @param {String} o 
         * @returns {String}
         */
        toLow: o => o && o.toLowerCase(),
        /**
         * 解码二进制
         * @param {Uint8Array} o 
         * @param {String} a 编码,默认utf8
         * @returns {String}
         */
        decode: (o, a) => new TextDecoder(a).decode(o),
        /**
         * 编码为二进制
         * @param {String} o 
         * @returns {Uint8Array}
         */
        encode: o => new TextEncoder().encode(o),
        Int: o => I.IntVal(o),
        IntVal: (o, a) => parseInt(o, a),
        PER(a,b,c){
            if(a<=b){
                return (100*a / b ).toFixed(0)+'%';
            }else if(a){
                return (a / 1024).toFixed(1)+'KB';
            }else{
                return '0%';
            }
        },
        /**
         * 返回一个异步对象Promise
         * @param {Function|Array<Function>} o 异步函数或异步函数组 
         * @param {Boolean} b 是否采用 allSettled
         * @returns {Promise<value>|Promise<Array<value>>}
         */
        Async: (o, b) => I.array(o) ? b ? Promise.allSettled(o) : Promise.all(o) : I.func(o) ? new Promise(o) : Promise.resolve(),
        /**
         * 设置内联样式
         * @param {CSSStyleDeclaration} o 
         * @param {JSON} a 
         * @returns 
         */
        setStyle: (o, a) => (I.toArr(a, x => (o.style || o).setProperty(x[0], x[1])) && 0) || o,
        /**
         * 获取内联样式
         * @param {CSSStyleDeclaration} o 
         * @returns {JSON}
         */
        getStyle: o => I.EachItem(o.style || o, !1),
        /**
         * 获取HTML对象属性
         * @param {NamedNodeMap} o 
         * @returns {JSON}
         */
        getAttr: o => I.EachItem(o.attributes || o, !1),
        /**
         * 设置HTML属性
         * @param {NamedNodeMap} o 
         * @param {JSON} a 
         * @returns 
         */
        setAttr: (o, a) => (I.toArr(a, x => (o.attributes || o).setAttribute(x[0], x[1])) && 0) || o,
        /**
         * 尝试执行函数
         * @param {Object} o 执行对象
         * @param {Function|String} fn 函数名.函数对象
         * @param  {Arguments} a 参数
         * @returns {any} 函数执行结果
         */
        tryCall:(o, fn, ...a)=>I.tryApply(o,fn,a),
        /**
         * 尝试执行函数
         * @param {Object} o 执行对象
         * @param {Function|String} fn 函数名.函数对象
         * @param  {Arguments} a 参数
         * @returns {any} 函数执行结果
         */
        tryApply(o, fn,a) {
            if(!I.nil(o)){
                if (fn&&I.str(fn)) fn = o[fn];
                return !I.func(fn) ? undefined : fn.apply(o, a);
            }
        },
        /**
         * 打印数据对象
         * @param {Object} o 
         * @param {Boolean} k 
         * @returns {Array<String>|Array<Array>|JSON}
         */
        EachItem(o, k) {
            var a = [], b = {};
            if (k === !0 && I.array(o)) {
                return o;
            } else if (k === !1 && I.obj(o)) {
                return o;
            } else if (I.str(o)) {
                a = Array.from(o);
            } else if (I.func(o.entries)) {
                var c = o.entries();
                var i = 0;
                while (!0) {
                    var { done, value } = c.next();
                    if (done) break;
                    if (value[0] === i) {
                        a.push(value[1]);
                    } else {
                        a.push(value);
                    }
                    i += 1;
                }

            } else if (o.item) {
                for (let i = 0; i < o.length; i++) {
                    var value = o.item(i);
                    if (I.str(value)) {
                        var key = I.tryCall(o, o.getPropertyValue, value);
                        if (key) b[key] = value;
                        else a.push(value);
                    } else if (value) {
                        if (value.nodeType === 2) {
                            a.push([value.name, value.value]);
                        } else {
                            a.push(value);
                        }
                    }
                }
            } else if (o.forEach) {
                I.Each(o, v => a.push(v));
            }
            return k === !1 ? Object.fromEntries(a.map((v, i) => I.array(v) && v.length == 2 ? v : [i, v])) : a;
        },
        getEntries(o) {
            return I.array(o) ? o : I.obj(o) ? Object.entries(o) : I.num(o) || o.byteLength ? Array.from(I.toU8(o.buffer || o)) : I.EachItem(o, !0);
        },
        /**
         * 设置对象属性
         * @param {*} o 
         * @param {*} p 
         * @param {*} attr 
         * @param {*} bool 
         * @param {*} rw 
         * @returns 
         */
        define: (o, p, attr, bool, rw) => Object.defineProperty(o, p, (!bool || I.obj(attr) && attr.value) ? attr : {
            get: I.func(attr) ? attr : () => attr,
            configurable: rw == !0
        }),
        /**
         * 设置对象多个属性
         * @param {*} o 
         * @param {*} attr 
         * @param {*} bool 
         * @param {*} rw 
         * @returns 
         */
        defines: (o, attr, bool, rw) => bool ? I.toArr(attr, (entry) => I.define(o, entry[0], entry[1], 1, rw)) : Object.defineProperties(o, attr),
        /**
         * 判断数据值是否为空
         * @param {Array|String|JSON|Boolean} data 
         * @returns {Boolean}
         */
        empty(data) {
            if (!data || data == !1)
                return !0;
            else if (I.str(data))
                return data.trim().length == 0;

            return I.toArr(data).length == 0;
        },
        /**
         * 字符串变为JSON
         * @param {String} post 
         * @returns {JSON}
         */
        Json(post) {
            if (I.u8buf(post))
                post = I.decode(post);

            return I.str(post) ? new Function("return " + post)() : post;
        },
        /**
         * 转换JSON为字符串
         * @param {JSON} post 
         * @returns {String}
         */
        toJson: (post) => JSON.stringify(I.Json(post)),
        progress(fn, ...a) {
            if (fn) {
                a[0] += " " + I.PER(a[1], a[2]);
                fn && fn.apply(a[3], a);
            }
        },
        /**
         * 创建一个文件
         * @param {Array<Blob|Uint8Array|String>} o 
         * @param {String} n 文件名
         * @param {String} type mime
         * @returns {File}
         */
        File: (o, n, type) => new File(o, n, {
            type,
            lastModified: Date.now()
        }),
        /**
         * 处理POST数据
         * @param {FormData|HTMLFormElement|JSON} obj 
         * @returns {FormData}
         */
        toPost(obj) {
            var post = obj instanceof FormData ? obj : new FormData(obj instanceof HTMLFormElement ? obj : undefined);
            if (I.obj(obj)) I.toArr(obj, v => post.append(v[0], v[1]));
            return post;
        },
        /**
         * 合拼URL参数
         * @param {String} url 
         * @param  {Array<String>} arg 
         * @returns {String}
         */
        toGet(url, ...arg) {
            var [href, search] = url.split("?");
            search = new URLSearchParams(search);
            I.Each(arg, v => {
                if (I.str(v)) v = new URLSearchParams(v);
                I.toArr(v, x => search.set(x[0], x[1]))
            });
            return href + (search.size ? '?' + I.toStr(search) : '');
        },
        /**
         * 转换对象为JSON
         * @param {Object} o 
         * @returns {JSON}
         */
        toObj(o) {
            return I.obj(o) ? o : I.EachItem(o, !1);
        },
        /**
         * 转换为数组
         * @param {Object} obj 
         * @param {Function|null} func 回调函数
         * @returns {Array<value>}
         */
        toArr(obj, func) {
            if (!obj) return [];
            let arr = I.getEntries(obj);
            return I.Each(arr, func);
        }
    };
    /**
     * 其他操作
     */
    const F = {
        Libjs: {},
        ext16: {
            "7z": /^377ABCAF271C/,
            rar: /^52617221/,
            zip: /^504B0304/,
            png: /^89504E470D0A1A0A/,
            gif: /^47494638(3761|3961)/,
            jpg: /^FFD8FFE000104A464946/,
            webp: /^52494646\w{8}57454250/,
            pdf: /^255044462D312E/,
            bmp: /^424D\w{4}0{8}/
        },
        exttype: {
            "text": [
                "css",
                "scss",
                "sass",
                "html",
                "htm",
                "xml",
                "vml",
                ["style", "css"],
                ["html", "html"],
                ["php", "html"],
                ["txt", "plain"],
            ],
            "image": [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "avif",
                "apng",
                "heic",
                ["svg", "svg/xml"]
            ],
            "font": [
                "woff", "woff2", "ttf", "otf"
            ],
            "application": [
                "pdf",
                "json",
                ["js", "javascript"],
                ["*", "octet-stream"],
                ["zip", "x-zip-compressed"],
                ["rar", "x-rar-compressed"],
                ["7z", "x-7z-compressed"],
            ]
        },
        CheckExt(u8) {
            let buf = u8.slice(0, 16);
            let text = I.blob(buf) ? I.toU8(buf) : I.str(buf) ? I.encode(buf) : buf;
            return I.await(text) ? I.Async(async (e) => {
                e(F.mimeHead(await text));
            }) : F.mimeHead(text);
        },
        async getLibjs(jsfile, progress, version, Filter, decode) {
            let jsname = F.getname(jsfile),
                file = jsname.replace(/\.zip$/, ".js");
            if (F.Libjs[jsname]) {
                return F.Libjs[jsname];
            }
            if (F.Libjs[file]) {
                return F.Libjs[file];
            }
            version = version || T.version;
            let contents = await T.getTable(T.LibStore).getdata(T.LibPad + file, version);
            if (!contents) {
                contents = await T.FetchItem({
                    url: T.JSpath + "lib/" + jsfile + "?" + T.time,
                    libjs: !0,
                    version: version,
                    progress,
                    Filter,
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
        },
        URL(u8, type) {
            if (I.str(u8) && u8.length < 255 && /^(blob|http|\/{1,2}(?!\*)|\.\/|.+\/)[^\n]*?$/i.test(u8)) {
                return u8;
            }
            return I.toURL(I.blob(u8) ? u8 : new Blob([u8], {
                type: F.getMime(type || (I.u8buf(u8) && F.CheckExt(u8)) || "js")
            }));
        },
        reURL(url) {
            return I.reURL(url);
        },
        getname(str) {
            str = str.replace(/^https?:\/\/[^\/\?\#\&]+/g,'') || "";
            let name = str.split("/").pop().split("?")[0].split("&")[0].split("#")[0];
            if (!name&&(str = str.match(/[^\/\?\&\#\=\*]+\.[a-z0-9A-Z]+/))){
                console.log(str);
                return str[0] || '';
            }
            return name || "";
        },
        getExt(name) {
            return I.toLow(F.getname(name).split(".").pop());
        },
        getKeyName(name) {
            return F.getname(name).replace(/\.\w+$/, '');
        },
        getMime(type, chartset) {
            type = type && I.toLow(type) || '';
            let mime;
            if (/^\w+\/[\w\;]+$/.test(type)) return type;
            else type = F.getExt(type) || type.split('.').pop();
            if (!F.extlist) {
                F.extlist = Object.assign.apply({},
                    I.toArr(F.exttype).map(entry => {
                        if (I.array(entry[1])) {
                            return I.toObj(entry[1].map(v => {
                                if (I.array(v)) {
                                    return [v[0], entry[0] + '/' + v[1]];
                                }
                                let key = entry[0];
                                if (!/\//.test(key)) {
                                    delete F.exttype[key];
                                    key += "/" + v;
                                    F.exttype[key] = !0;
                                }
                                return [v, key];
                            }))
                        } else if (I.obj(entry[1])) {
                            return I.toObj(I.toArr(entry[1]).map(v => {
                                return [v[0], entry[0] + '/' + v[1]];
                            }))
                        }
                    })
                );
            }
            mime = F.extlist[type] || F.extlist["*"];
            if (chartset && /(text|javascript|xml|json)/.test(mime))
                return mime + ";chartset=utf8";

            return mime;
        },
        getType(type) {
            type = F.getMime(type);
            return type.split("/").pop();
        },
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
                            content = I.toLow(content);
                            let v = content.split(";");
                            headers.filetype = content;
                            headers[name] = v[0].trim();
                            if (v[1])
                                headers.charset = I.toLow(v[1].split("=").pop().trim());

                            break;
                    }
                }
            });
            return headers;
        },
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
        },
        HtmltoStr(obj) {
            let elm = obj && obj.contents || obj;
            if (I.elm(elm)) {
                if (I.elm(obj)) obj = {};
                obj.contents = elm.outerHTML;
                obj.tag = I.NN(document.body);
                obj.type = HTMLElement.name;
            }
            return obj;
        },
        mimeHead(s) {
            let text = I.toUp(I.toArr(s).map(v => I.toStr(v, 16).padStart(2, '0')).join("")),
                result = I.toArr(F.ext16).filter((entry) => entry[1].test(text))[0];
            if (result && result[0])
                return result[0];

            return "";
        }
    };
    /**
     * 主对象
     */
    const T = new class NengeObj extends EventTarget {
        version = 1;
        DB_NAME = "XIUNOBBS";
        DB_STORE_MAP = {
            libjs: {},
            myfile: {
                timestamp: false
            }
        }
        LibStore = "libjs";
        LibPad = "script-";
        maxsize = 0x6400000;
        part = "-part-";
        lang = {};
        action = {};
        StoreList = {};
        isLocal = /^(127|localhost|172)/.test(location.host);
        get I() {
            return I;
        }
        get F() {
            return F;
        }
        get date() {
            return new Date;
        }
        get time() {
            return Date.now();
        }
        CLASS = [CustomElement, CustomFetch, CustomStore, CustomTable, Decompress, ZipCompress,CustomAjax];
        getStore(dbName, opt) {
            if (!dbName || dbName == T.DB_NAME) {
                dbName = T.DB_NAME;
                opt = opt || T.DB_STORE_MAP;
            }
            return T.StoreList[dbName] || new CustomStore(dbName, opt);
        }
        getTable(table, dbName, opt) {
            if (!table) return undefined;
            if (I.IF(table, CustomTable)) return table;
            if (I.str(table)) return T.getStore(dbName, opt).table(table);
        }
        async FetchItem(ARG) {
            return new CustomFetch(ARG).result;
        }
        ajax(ARG) {
            return new CustomAjax(ARG).result;
        }
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

        }
        addJS(buf, cb, iscss, id) {
            return I.Async(back => {
                iscss = iscss || I.buf(buf) && (buf.type && /css$/.test(buf.type) || buf.name && /css$/.test(buf.name));
                var url = F.URL(buf);
                var script = T.$ce(iscss ? 'link' : 'script');
                Object.assign(script, {
                    type: F.getMime(iscss ? 'css' : 'js'),
                    href: url,
                    src: url,
                    rel: StyleSheet.name,
                    crossorigin: "anonymous",
                    onload(e) {
                        if (buf != url) {
                            F.reURL(url);
                        }
                        buf = null;
                        back(cb && cb(e));
                    },
                    onerror(e) {
                        this.onload(e);
                    }
                });
                T.$append(!iscss ? document.body : document.head, script);
            });

        }
        async loadLibjs(name, progress, version, Filter, decode) {
            return await T.addJS(await F.getLibjs(name, progress, version, Filter, decode), null, F.getExt(name) == "css");
        }
        async unFile(u8, fn, ARG) {
            return new Decompress(Object.assign(ARG || {}, {
                contents: u8,
                progress: fn
            })).result;
        }
        customElement(myelement) {
            !customElements.get(myelement) && customElements.define(myelement, CustomElement);
        }
        Err(msg) {
            return new Error(msg);
        }
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
        }
        triger(target, type, data) {
            target = T.$(target);
            if (!data)
                data = {
                    detail: target
                };
            target.dispatchEvent(new CustomEvent(type, data));
        }
        setClass(o) {
            o = o || new class extends EventTarget { };
            o.action = o.action || {};
            var { RF, CF, BF } = this;
            I.defines(o, { I, T, F, RF: { value: RF }, CF: { value: CF }, BF: { value: BF } }, !0);
            return o;
        }
        onEvent(elm, evt, fun, opt, cap) {
            elm = T.$(elm);
            I.Each(evt.split(/\s+/), v => elm.on(v, fun, opt === false ? {
                passive: false
            } : opt, cap));
            return elm;
        }
        unEvent(elm, evt, fun, opt, cap) {
            elm = T.$(elm);
            I.Each(evt.split(/\s+/), v => elm.un(v, fun, opt === false ? {
                passive: false
            } : opt, cap));
            return elm;
        }
        onceEvent(elm, evt, fun, cap) {
            return elm.once(evt, fun, {
                passive: false,
                once: true
            }, cap)
        }
        docload(f) {
            if (document.readyState != T.readyState)
                return f && f.call(T);
            document.once("DOMContentLoaded", f);
        }
        $(e, f) {
            return e ? (I.str(e) ? (f || document).querySelector(e) : I.func(e) ? T.docload(e) : e) : undefined;
        }
        $$(e, f) {
            return (f || document).querySelectorAll(e) || [];
        }
        $ce(e) {
            return document.createElement(e)
        }
        $ct(e, txt, c) {
            let elm = T.$ce(e);
            if (txt)
                elm.innerHTML = I.str(txt) ? txt : txt();

            I.Attr(elm, !c ? undefined : I.str(c) ? {
                class: c
            } : c);
            return elm;
        }
        $append(a, b) {
            if (I.str(b)) b = T.$ce(b);
            a.appendChild(b);
            return b;
        }
        $add(e, c) {
            return (e.classList.add(c) && !1) || e
        }
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
        }
        docElm(str, mime) {
            return I.dElm(str, mime || document.contentType);
        }
        RF(action, data) {
            const R = this,A = R.action[action];
            return I.func(A) ? I.tryApply(R,A,data || []) : A;

        }
        CF(action, ...args) {
            return this.RF(action, args);
        }
        BF(action, ...a) {
            const R = this,A = R.action[action],obj = a.shift();
            return I.func(A) ? I.tryApply(obj,A,a): A;
        }
        getLang(name, arg) {
            return T.GL(name, arg);
        }
        GL(name, arg) {
            if (!I.none(T.lang[name]))
                name = T.lang[name];

            return arg ? T.toReplace(name, arg) : name;
        }
        toReplace(str, arg) {
            if (I.str(arg)) {
                str = str.replace(/{value}/, arg);
            } else if (I.obj(arg)) {
                I.toArr(arg, v => str.replace(new RegExp(v[0], "g"), v[1]));
            }
            return str;
        }
        MediaQuery(query, fn) {
            if (matchMedia) {
                let m = matchMedia(query);
                m.on("change", (e) => fn(e.matches, e));
                fn(m.matches);
            }
        }
        MediaMath(str) {
            return styleMedia.matchMedium(str);
        }
        async toZip(files, progress, password) {
            return new ZipCompress({
                contents: files,
                progress,
                password,
                pack: !0
            }).result;
        }
        PostMessage(str) {
            var sw = this.sw;
            return sw && sw.postMessage(str);
        }
        async openServiceWorker(file) {
            var { serviceWorker } = navigator;
            serviceWorker.register(file).then(e => {
                var sw;
                if (e.installing) {
                    sw = e.installing;
                    this._PWAReady(!0);
                } else if (e.active) {
                    sw = e.active;
                }
                sw.on('statechange', e => {
                    this.sendClient(e.target.active);
                    T.CF('pwa_statechange', e)
                });
                document.on("visibilitychange", function () {
                    if (document.visibilityState === 'visible') {
                        T.sendClient(sw);
                    }
                });
                this.sendClient(sw);
                T.sw = sw;
                e.on('updatefound', e => {
                    this.sendClient(e.target.active);
                    T.CF('pwa_updatefound', e)
                });
            })
        }
        clearWorker(js) {
            navigator.serviceWorker.getRegistrations().then(sws => I.Each(sws, sw => {
                if (sw.active) {
                    if (js && sw.active.scriptURL.includes(js))
                        sw.unregister();
                    else if (!js)
                        sw.unregister();
                }
            }));
        }
        sendClient(sw) {
            if (sw) {
                sw.postMessage({ action: 'CLIENT' });
                if (sw != this.sw) this.sw = sw;
            }
        }
        setWorker(serviceWorker) {
            serviceWorker.on(evtname[1], function (e) {
                T.clearWorker();
                T.CF('pwa_error', e);
            });
            serviceWorker.on('message', async function (event) {
                let data = event.data;
                if (T.isLocal) console.log(data);
                if (I.obj(data)) {
                    let { action, from, id } = data;
                    if (action) {
                        if (I.str(action)) {
                            if (action == 'GETDBNAME') {
                                return T.docload(() => {
                                    T.PostMessage({
                                        action: 'WOKERDBNAME',
                                        result: T.DB_NAME
                                    })
                                })
                            }
                            let result = await T.CF(action, data);
                            if (id) {
                                data.result = result;
                                T.PostMessage(data);
                            } else {
                                T.PostMessage(result);
                            }
                        } else if (I.array(action) && id) {
                            var result = I.Async(action.map(v => T.CF(v)));
                            data.result = result;
                            T.PostMessage(data);
                        }
                    } else if (from) {
                        T.CF(from, data);
                    }
                }
            });
            return !0;
        }
        constructor() {
            super();
            var T = this;
            Object.assign(EventTarget.prototype, {
                on(evt, fun, opt) {
                    return this.addEventListener(evt, fun, opt);
                },
                un(evt, fun, opt) {
                    return this.removeEventListener(evt, fun, opt);
                },
                once(evt, fun, opt) {
                    return this.addEventListener(evt, fun, Object.assign({
                        passive: !1,
                        once: !0,
                    }, opt === true ? { passive: !0 } : opt || {}));
                },
                toEvent(evt, detail) {
                    this.dispatchEvent(new CustomEvent(evt, { detail }))
                }
            });
            var { language, serviceWorker, onLine } = navigator;
            var { contentType, readyState, ontouchend, currentScript, characterSet } = document;
            var src = currentScript && currentScript.src.split("?"),
                JSpath = src && src[0].split("/").slice(0, -1).join("/") + "/",
                langs = I.toLow(language).split("-");
            JSpath && (JSpath = JSpath.replace("static/", ""));
            if (langs[0] == "zh") {
                if (langs[1] == "cn")
                    langs[1] = "hans";
                else if (langs[1] != "hk")
                    langs[1] = "hant";

            }
            Object.assign(T, {
                JSpath,
                ROOT: (JSpath && JSpath.replace("assets/js/", "")) || location.pathname,
                langName: langs[0],
                i18nName: langs.join("-"),
                charset: I.toLow(characterSet),
                language,
                onLine,
                readyState,
                isTouch: I.hasOwnProp(HTMLElement, 'ontouchstart'),
                ts: [
                    I.L(Text),
                    I.L(JSON),
                    F.getType(contentType),
                    contentType,
                    I.L(String)
                ]
            });
            if (serviceWorker) {
                T.setWorker(serviceWorker)
                T.sw = serviceWorker.controller;
                T.PWAReady = new Promise(re => {
                    if (T.sw) {
                        re(!0);
                    } else {
                        T._PWAReady = re;
                    }
                });
            }
        }
    };
    exports.onerror = (msg, url, lineNo, columnNo, error) => alert(msg + lineNo + url);
    exports.T = T;
    I.defines(exports, {
        Nenge: () => T
    }, 1);
});