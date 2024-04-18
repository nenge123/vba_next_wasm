(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : ((global = typeof globalThis !== "undefined" ? globalThis : global || self), factory(global));
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
        TextDecoder,
        TextEncoder,
        document,
        RegExp,
        HTMLElement,
        customElements,
        parseInt,
        Date,
        CustomEvent,
        JSON,
        indexedDB,
        undefined,
        DOMParser,
        prompt,
        alert,
        fetch,
        Response,
        Headers,
        XMLHttpRequest,
        location,
        matchMedia,
        styleMedia,
        Node,
        NodeList,
        StyleSheet,
        console,
        EventTarget,
        Worker,
        Text,
        Document,
        Symbol,
        CSSStyleDeclaration,
        NamedNodeMap,
        Event,
        KeyboardEvent,
    } = exports;
    const evtname = ["success", "error", "progress", "cancel", "readystatechange", "complete", "change", "message"];
    const typename = ["js", 'json', "css", "blob", "xml", "text", "html"];
    const strname = ["CLIENT", "UPCACHE"];
    /**
     * 自定义HTML标签类绑定
     */
    class CustomElement extends HTMLElement {
        /* 警告 如果文档处于加载中,自定义元素实际上并不能读取子元素(innerHTML等) */
        /*因此 如果仅仅操作属性(Attribute),可以比元素出现前提前定义.否则最好文档加载完毕再定义,并不会影响事件触发 */
        constructor() {
            super();
            const C = this;
            C.funName = I.toUp("TAG_" + I.RC(C.tagName, /-/g, "_")) + '_';
            T.BF(C.funName + 'INIT', C);
        }
        connectedCallback(...a) {
            /*文档中出现时触发*/
            T.BF(this.funName + 'READY', this, ...a);
        }
        attributeChangedCallback(...a) {
            /*attribute增加、删除或者修改某个属性时被调用。*/
            console.log(a);
            T.BF(this.funName + 'ATTR', this, ...a);
        }
        disconnectedCallback(...a) {
            /*custom element 文档 DOM 节点上移除时被调用*/
            T.BF(this.funName + 'REMOVE', this, ...a);
        }
    }
    /**
     * 本地数据 库操作
     */
    class CustomStore {
        tables = [];x
        Store =  {};
        constructor(name, config) {
            config = config || {};
            Object.assign(this, {
                name,
                config,
            });
            T.StoreList[name] = this;
        }
        open(upgrad) {
            var IDB = this;
            return I.Async(resolve => {
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
            return a.filter(v => !b.includes(v[0]));
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
            var DB = this;
            Object.assign(DB, {
                table,
                IDB,
                opt,
                transaction: async ReadMode => IDB.transaction(table, ReadMode, await IDB.getTable(table, opt)),
                read:()=>DB.transaction(!0),
                write:()=>DB.transaction(!1),
                clear: async () => DB.toSuccess((await DB.write()).clear()),
                count: async query => DB.toSuccess((await DB.read()).count(query)),
                all: async (query, count) => DB.toSuccess((await DB.read()).getAll(query, count)),
                keys: async (query, count) => DB.toSuccess((await DB.read()).getAllKeys(query, count)),
                key: async (range) => DB.toSuccess((await DB.read()).getKey(range)),
                load: (request, name) => DB.toSuccess(request.get(name)),
                save(request, data, name) {
                    if (I.elm(data) || I.elm(data.contents)) {
                        if (I.elm(data)) data = { contents: data };
                        data.tag = I.toLow(data.contents.tagName || typename[6]);
                        data.type = HTMLElement.name;
                        data.contents = data.contents.outerHTML;
                    }
                    return DB.toSuccess(request.put(data, name))
                },
                cursor: async (fn, query, direction, request) => {
                    if (!request) request = await DB.read();
                    else if (I.await(request)) request = await request;
                    return DB.getCursor(request.openCursor(query, direction), fn);
                },
                keyCursor: async (fn, query, direction, request) => {
                    if (!request) request = await DB.read();
                    else if (I.await(request)) request = await request;
                    return DB.getCursor(request.openKeyCursor(query, direction), fn);
                },
                index: (index,range) => {
                    return new class {
                        constructor(index,range){
                            Object.assign(this,{
                                async transaction() {
                                    var read = await DB.read();
                                    return read.indexNames.contains(index) ? read.index(index) : read;
                                },
                                async cursor(key,direction) {
                                    return DB.cursor(key, range, direction, await this.transaction());
                                },
                                async keys(key,direction) {
                                    return DB.keyCursor(key, range, direction, await this.transaction());
                                },
                                async get(key, version, bool) {
                                    return DB.get(key, version, bool, await this.transaction());
                                }
                            });
                        }
                    }(index,range);
                }
            });
        }
        toSuccess(request, fn) {
            return I.Async((resolve) => request.on(evtname[0], (e) => {
                var result = request.result;
                fn ? fn(resolve, result) : resolve(result);
            }));
        }
        getCursor(request, fn) {
            var data = {};
            return this.toSuccess(request, (resolve, result) => {
                if (result) {
                    if (I.fn(fn)) {
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
        async get(name, _version, bool, read) {
            var DB = this;
            read = read || await DB.read();
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
                        if (tag && tag != typename[6]) {
                            contents = contents.querySelector(tag);
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
            var write = await DB.write();
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
                        filetype = contents.type || F.getMime();
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
                                timestamp: new Date
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
                timestamp: new Date
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
            var write = await DB.write();
            if (I.str(name)) {
                return DB.toSuccess(write.delete(name));
            } else if (I.array(name)) {
                return I.Async(I.Mach(name, v => DB.toSuccess(write.delete(v), (e) => v)));
            }
        }
        async remove(name) {
            let DB = this;
            let result = await DB.load(DB.read(), name);
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
                CF.type = typename[3];
            }
            Object.assign(CF, {
                toProgress(current, total, name) {
                    I.tryC(CF, evtname[2], name + '(' + I.PER(current, total) + ')', current, total);
                },
                toSuccess(result, headers) {
                    CF.toEvent(evtname[0], { result, headers });
                },
                toError(result) {
                    CF.toSuccess();
                    I.tryC(CF, evtname[1], result, CF);
                },
                toCancel(response) {
                    I.tryC(response.body, evtname[3]);
                },
                async getItem(key, version) {
                    return I.tryC(CF.DB, 'get', key, version)
                },
                async setItem(data, key, contents, type) {
                    if (CF.DB) {
                        if (contents) data.contents = contents;
                        if (type) data.type = type;
                        CF.DB.put(data, key);
                    }
                },
                urlname: F.getName(CF.url) || 'index.html',
                DB: T.getTable(CF.store),
                result: I.Async(re => {
                    CF.once(evtname[0], e => {
                        var { result, headers } = e.detail;
                        I.tryC(CF, evtname[0], result, headers);
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
                    libkey,
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

                    } else result = contents;

                }
                return callback(result);
            };
            key = key || urlname;
            filename = filename || urlname;
            if (libjs) {
                if (ispack.test(key)) {
                    key = libkey || T.LibPad + I.RC(key, ispack, typename[0]);
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
                if (filetype == F.getMime(typename[1])) {
                    result = await response.json();
                } else {
                    result = await response.text();
                }
                return toError({ message: result || response.statusText, headers });
            }
            contents = await CT.steam(response, headers);
            filesize = contents.size;
            if (type != typename[3]) {
                contents = await I.toU8(contents);
                if (CT.Filter) {
                    contents = await CT.Filter(contents, urlname, headers);
                } else if (type) {
                    contents = I.decode(contents, CT.charset);
                }
                if (type == typename[1]) {
                    contents = I.Json(contents);
                    type = typename[1];
                } else if (type == typename[6]) {
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
                timestamp: new Date,
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
            CT.setItem(option, key, contents);
            return callback(contents);
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
                                name = F.getName(name);
                                var ftype = F.getMime(name);
                                var fkey = T.LibPad + name;
                                data = CT.reBuf(data, CT.unbuf, name, ftype);
                                await CT.setItem({
                                    contents: data,
                                    filename: name,
                                    filesize: data.size||data.length,
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
                filename,
                type,
                length
            } = headers;
            var {
                body
            } = response;
            if (!body || !body.getReader)
                return response.blob();
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
            if (unbuf == typename[5])
                data = I.decode(data, CT.charset);
            else if (unbuf == typename[1])
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
                headers: new Headers(headers || {})
            };
            data.headers.set('ajax-fetch',1);
            Object.assign(data, head);
            if (json) {
                post = I.toJson(json);
                data.headers.set('accept',F.getMime(typename[1]));
            } else if (post) {
                post = I.toPost(post);
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
        headers = {};
        total =  0;
        constructor(ARG) {
            super();
            const A = this;
            if (I.str(ARG))
                A.url = ARG;
            else
                Object.assign(A, ARG);
            Object.assign(A, {
                toProgress(bool, current, total, name) {
                    I.tryC(A, bool ? A.progress : A.postProgress, name + I.PER(current, total), current, total);
                },
                toSuccess(result, headers) {
                    A.toEvent(evtname[0], { result, headers })
                },
                toError(result, headers, request) {
                    A.toSuccess();
                    I.tryC(A, evtname[1], result, headers, request);
                },
                result: I.Async(re => A.once(evtname[0], e => {
                    var { result, headers } = e.detail;
                    I.tryC(A, evtname[0], result, headers);
                    re(result);
                }))
            })
            if (A.url) A.toSend();
        }
        getHeader(request) {
            var headers = I.tryC(request, 'getAllResponseHeaders').trim().split(/\n+/);
            return F.FilterHeader(
                I.toObj(
                    I.Mach(headers, line => I.Mach(line.split(/:\s+/), t => I.RC(t.trim(), /^"(.+)"$/, '$1'))

                    )
                ));
        }
        toSend() {
            var A = this;
            var { url, get, post, type, json, headers, paramsDictionary } = A;
            const request = new XMLHttpRequest(paramsDictionary);
            var aHeaders, ReType;
            var urlname = F.getName(url) || 'index.html';
            request.on(evtname[4], (event) => {
                let readyState = request.readyState;
                if (readyState === 2) {
                    aHeaders = A.getHeader(request);
                    console.log(aHeaders);
                    ReType = aHeaders.type;
                    A.total = aHeaders.length || 0;
                    if (!type) {
                        if (ReType == F.getMime(typename[1])) {
                            request.responseType = typename[1];
                        } else if (ReType == F.getMime(typename[4])) {
                            request.responseType = typename[4];
                        } else if (aHeaders.filename || !/(text|html|javascript|css)/.test(ReType)) {
                            request.responseType = typename[3];
                        }
                    } else if (type == 'head') {
                        request.abort();
                    }
                } else if (readyState === 4) {
                    if (type == 'head') {
                        return A.toSuccess(aHeaders);
                    }
                    let result = request.response;
                    if (I.blob(result)) {
                        result = I.File([result], aHeaders.filename || urlname, ReType);
                    }
                    if (request.status == 200) {
                        return A.toSuccess(result, aHeaders);
                    } else {
                        return A.toError(request.statusText, aHeaders, request);
                    }
                }
            });
            request.on(evtname[2], (e) => A.toProgress(!0, e.loaded, e.total, urlname));
            request.upload.on(evtname[2], (e) => A.toProgress(!1, e.loaded, e.total, urlname));
            var formData = json ? I.toJson(json) : post ? I.toPost(post) : undefined;
            json && Object.assign(headers, { accept: F.getMime(typename[1]),'ajax-fetch':1});
            if (type && type != 'head') request.responseType = type;
            request.open(!formData ? "GET" : "POST", I.toGet(url, { inajax: Date.now() }, get));
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
            Object.assign(this, {
                toProgress(current, total, name) {
                    I.tryC(this, evtname[2], current, total, name);
                },
                result: I.Async(re => this.once(evtname[0], e => re(e.detail)))
            });
            this.toDeData(ARG);

        }
        async toDeData(ARG) {
            if (ARG && !ARG.contents) ARG = { contents: ARG }
            var { ext, contents } = ARG;
            if (!ext) ext = await F.CheckExt(contents);
            console.log(ext);
            var result = /zip$/.test(ext) ? new ZipCompress(ARG).result : this.rar(ext, ARG);
            return this.toEvent(evtname[0], await result);
        }
        async loadUrl(ext, progress) {
            var { src7z, srcrar } = this;
            var src = /7z$/.test(ext) ? src7z : srcrar;
            return await F.getLibjs(src, progress);
        }
        /**
        async extractor(ext) {
            var {contents,password,progress} = ARG;
            contents = await I.toU8(contents);
            if(!/(rar|7z)$/.test(ext)) return contents;
            var url = await F.getLibjs('extractor-new.min.zip');
            if(!url) return contents;
            return I.Async(async re => {
                var worker = new Worker(url);
                var result = {},nowFile, len = 0,max;
                worker.on(evtname[7], e => {
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
                            return [file, data.length ? await I.toU8((new Blob(data))) : new Uint8Array(0)];
                        })).then(arr => {
                            arr = arr.length ? I.toObj(arr) : undefined;
                            re(arr||contents);
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
                });
                worker.on(evtname[1],e => {
                    worker.terminate();
                    re(contents)
                });
                worker.onmessageerror = e=>worker.toEvent(evtname[1]);
                worker.postMessage({
                    filename: this.Name || 'test.' + (ext || 'zip'),
                    data: this.contents,
                    DB_NAME: T.DB_NAME,
                    DB_TABLE: T.LibStore,
                    DB_FILE: T.LibPad + 'extractor-new.wasm'
                })

            });
        }
        **/
        async rar(ext, ARG) {
            var { contents, password, progress } = ARG;
            contents = await I.toU8(contents);
            if (!/(rar|7z)$/.test(ext)) return contents;
            let url = await this.loadUrl(ext, progress);
            if (!url) return contents;
            return I.Async(complete => {
                let result, worker = new Worker(url);
                worker.on(evtname[7], e => {
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
                            complete(result || contents);
                        } else if (t == 2) {
                            !result && (result = {});
                            return data && (result[file] = data);
                        } else if (t == 4) {
                            return (total > 0 && total >= current) && this.toProgress(current, total, name || file);
                        } else if (t === -1) {
                            password = prompt(this.pwText, password || F.sp);
                            if (!password) {
                                complete(contents);
                            } else {
                                return worker.postMessage({
                                    password
                                });
                            }
                        }
                        worker.terminate();
                    }
                });
                worker.on(evtname[1], e => {
                    complete(contents);
                    worker.terminate();
                });
                worker.onmessageerror = e => worker.toEvent(evtname[1]);
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
            Object.assign(Z, {
                toProgress(current, total, name) {
                    I.tryC(Z, evtname[2], current, total, name);
                },
                result: I.Async(re => Z.once(evtname[0], e => re(e.detail)))
            });
            if (Z.contents) Z.pack ? Z.toEnData() : Z.toDeData();
        }
        async loadZip() {
            if (I.nil(exports.zip)) {
                await T.loadLibjs(this.zipsrc, this.progress);
            }
        }
        async toEnData() {
            await this.loadZip();
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
            await this.loadZip();
            new zip.ZipReader(I.toBlob(contents)).getEntries().then(async entrylist => {
                this.toEvent(evtname[0], entrylist && entrylist.length ? await this.getEntries(entrylist) : await I.toU8(contents))

            });
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
        /**
         * 替换字符
         * @param {String} o 
         * @param {String|RegExp} r 
         * @param {String|Function} a 
         * @returns {String}
         */
        RC: (o, r, a) => o && o.replace(r, !I.nil(a) && a || F.sp) || F.sp,
        /**
         * 原型判断
         * @param {Object} o 
         * @param {CLASS} a 
         * @returns {Boolean}
         */
        IF: (o, a) => o instanceof a,
        /**
         * 类判断
         * @param {Object} o 
         * @param {CLASS} a 
         * @returns {Boolean}
         */
        IC: (o, a) => !I.nil(o) && o.constructor === a,
        /**
         * 对象原型
         * @param {Object} o 对象 
         * @returns {prototype}
         */
        IP: o => !I.nil(o) && o.prototype,
        /**
         * 遍历数组
         * @param {Array} o 
         * @param {Function} f 
         * @returns {Array}
         */
        Each: (o, f) => f && o.forEach(f) || o,
        /**
         * 遍历数组并且返回数据
         * @param {*} o 
         * @param {*} f 
         * @returns {Array}
         */
        Mach: (o, f) => Array.from(o, f),
        /**
         * HTML对象
         * @param {Object} o 
         * @returns {Boolean}
         */
        elm: o => I.IF(o, HTMLElement),
        /**
         * Node对象
         * @param {*} o 
         * @returns 
         */
        node: o => I.IF(o, Node),
        /**
         * NodeList对象
         * @param {*} o 
         * @returns 
         */
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
        fn: o => I.IF(o, Function) && (!I.IP(o) || I.IC(I.IP(o), o)),
        func: o => I.fn(o),
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
        u8buf: o => I.IC(o, Uint8Array),
        /**
         * 字符
         * @param {*} o 
         * @returns 
         */
        str: o => I.IC(o, String),
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
        none: o => o === undefined,
        /**
         * 空值或者未定义
         * @param {Object} o 
         * @returns {Boolean}
         */
        nil: o => I.null(o) || I.none(o),
        /**
         * 原型属性
         * @param {Object} o 对象 
         * @param {*} p 属性/方法
         * @returns {Boolean}
         */
        hasOwnProp: (o, p) => I.hasProp(I.IP(o), p),
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
        /**
         * 转换为十进制数字
         * @param {Number|String} o 
         * @param {undefined|Number} a 
         * @returns 
         */
        toInt: (o, a) => parseInt(o, a),
        /**
         * 生成一个百分比函数
         * @param {*} a 
         * @param {*} b 
         * @param {*} c 
         * @returns 
         */
        PER(a, b) {
            if (a && a <= b) {
                return (100 * a / b).toFixed(0) + '%';
            } else if (a) {
                return (a / 1024).toFixed(1) + 'KB';
            } else {
                return '0%';
            }
        },
        /**
         * 返回一个异步对象Promise
         * @param {Function|Array<Function>} o 异步函数或异步函数组 
         * @param {Boolean} b 是否采用 allSettled
         * @returns {Promise<value>|Promise<Array<value>>}
         */
        Async: (o, b) => I.array(o) ? b ? Promise.allSettled(o) : Promise.all(o) : I.fn(o) ? new Promise(o,b) : Promise.resolve(o),
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
        tryC: (o, fn, ...a) => I.tryA(o, fn, a),
        /**
         * 尝试执行函数
         * @param {Object} o 执行对象
         * @param {Function|String} fn 函数名.函数对象
         * @param  {Arguments} a 参数
         * @returns {any} 函数执行结果
         */
        tryA(o, fn, a) {
            if (!I.nil(o)) {
                if (fn && I.str(fn)) fn = o[fn];
                return !I.fn(fn) ? undefined : fn.bind(o, ...a)();
            }
        },
        /**
         * 遍历对象
         * @param {*} o 
         * @returns 
         */
        toItem(o, fn) {
            var a = [];
            for (let i = 0; i < o.length; i++) {
                var value = o.item(i);
                if (fn && fn(value)) {
                    return !0;
                } else if (I.str(value)) {
                    var key = I.tryC(o, o.getPropertyValue, value);
                    if (key) a.push([key, value]);
                    else a.push(value);
                } else if (value) {
                    if (value.nodeType === 2) {
                        a.push([value.name, value.value]);
                    } else {
                        a.push(value);
                    }
                }
            }
            return a;

        },
        /**
         * 遍历迭代
         * @param {*} o 
         * @returns 
         */
        toEntry(o, fn) {
            var a = [];
            var c = o.entries();
            var i = 0;
            while (!0) {
                var { done, value } = c.next();
                if (done) break;
                if (fn && fn(value)) {
                    return !0;
                } else if (value[0] === i) {
                    a.push(value[1]);
                } else {
                    a.push(value);
                }
                i += 1;
            }
            return a;
        },
        /**
         * 转换对象
         * @param {Object} o 
         * @param {Boolean} k 
         * @returns {Array<String>|Array<Array>|JSON}
         */
        EachItem(o, k) {
            var a = [];
            if (k === !0 && I.array(o)) {
                return o;
            } else if (k === !1 && I.obj(o)) {
                return o;
            } else if (I.str(o)) {
                a = I.Mach(o);
            } else if (I.fn(o.entries)) {
                a = I.toEntry(o);
            } else if (o.item) {
                a = I.toItem(o);
            } else if (o.forEach) {
                I.Each(o, v => a.push(v));
            } else if (I.IF(o, Object)) {
                a = Object.entries(o);
            }
            return k === !1 ? Object.fromEntries(a.map((v, i) => I.array(v) && v.length == 2 ? v : [i, v])) : a;
        },
        /**
         * 转换为数组
         * @param {*} o 
         * @returns 
         */
        getArr(o) {
            return I.array(o) ? o : I.obj(o) ? Object.entries(o) : I.num(o) || o.byteLength ? I.Mach(I.toU8(o.buffer || o)) : I.EachItem(o, !0);
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
            get: I.fn(attr) ? attr : () => attr,
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
            var [href, search] = url.split(/\?/);
            search = new URLSearchParams(search);
            I.Each(arg, v => {
                if (I.str(v)) v = new URLSearchParams(v);
                I.toArr(v, x => search.set(x[0], x[1]))
            });
            return href + (search.size ? '?' + I.toStr(search) : F.sp);
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
         * @param {Function|null} fn 回调函数
         * @returns {Array<value>}
         */
        toArr(obj, fn) {
            if (!obj) return [];
            let arr = I.getArr(obj);
            return I.Each(arr, fn);
        }
    };
    /**
     * 其他操作
     */
    const F = {
        Libjs: {},
        sp: "",
        p: location.pathname[0],
        async getLibjs(jsfile, progress, version, Filter, decode) {
            let jsname = F.getName(jsfile),
                file = I.RC(jsname, /\.zip$/, ".js");
            if (F.Libjs[file]) {
                return F.Libjs[file];
            }
            version = version || T.version;
            let contents = await T.getTable(T.LibStore).getdata(T.LibPad + file, version);
            if (!contents) {
                contents = await T.FetchItem({
                    url: (/^[\w+\.\-\_]+$/.test(jsfile) ? T.JSpath + "lib/" + jsfile : jsfile) + "?" + Date.now(),
                    libkey: T.LibPad + file,
                    libjs: !0,
                    version: version,
                    progress,
                    Filter,
                    unbuf: decode ? typename[5] : !1
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
        /**
         * 创建URL
         * @param {*} u8 
         * @param {*} type 
         * @returns 
         */
        URL(u8, type) {
            if (I.str(u8) && u8.length < 255 && /^(blob|http|\/{1,2}(?!\*)|\.\/|.+\/)[^\n]*?$/i.test(u8)) {
                return u8;
            }
            return URL.createObjectURL(I.blob(u8) ? u8 : new Blob([u8], {
                type: F.getMime(type || (I.u8buf(u8) && F.CheckExt(u8)) || typename[0])
            }));
        },
        /**
         * 释放URL资源
         * @param {*} url 
         * @returns 
         */
        reURL(url) {
            return URL.revokeObjectURL(url);
        },
        /**
         * 获取目录
         * @param {*} url 
         * @returns 
         */
        getPath(url) {
            var p = F.p;
            return url && url.split(p).slice(0, -1).join(p) + p
        },
        getName(str) {
            str = I.RC(str, /^https?:\/\/[^\/\?\#\&]+/g) || F.sp;
            let name = str.split(F.p).pop().split(/\?/)[0].split(/&/)[0].split(/#/)[0];
            if (!name && (str = str.match(/[^\/\?\&\#\=\*]+\.[a-z0-9A-Z]+/))) {
                console.log(str);
                return str[0] || F.sp;
            }
            return name || F.sp;
        },
        getExt(name) {
            return I.toLow(F.getName(name).split(".").pop());
        },
        getKey(name) {
            return I.RC(F.getName(name), /\.\w+$/);
        },
        exttype: {},
        setMime() {
            F.extlist = I.toObj(
                [].concat(...(
                    "text;css,scs,sass,html,xml,vml,style:css,htm:html,php:html,txt:plain\n" +
                    "image;jpg,jpeg,png,gif,webp,avif,apng,heic,svg:svg+xml\n" +
                    "font;woff,woff2,ttf,otf\n" +
                    "application;pdf,json,js:javascript,0:octet-stream,zip:x-zip-compressed,rar:x-rar-compressed,7z:x-7z-compressed,wasm").split(/\n/).map(a => {
                        a = a.split(/;/);
                        return [].concat(a[1].split(/,/).map(c => {
                            c = c.split(/:/);
                            var d = a[0] + F.p + (c[1] || c[0]);
                            F.exttype[d] = !0;
                            return [c[0], d];
                        }))
                    })))
        },
        getMime(type) {
            if (!F.extlist) F.setMime();
            type = type && I.toLow(type) || F.sp;
            if (F.exttype[type]) return type;
            if (/^\w+\/[\w\;]+$/.test(type)) return type;
            else if (!/^\w+$/.test(type)) type = F.getExt(type) || type.split('.').pop();
            console.log(type);
            return F.extlist[type] || F.extlist[0];
        },
        FilterHeader(headers) {
            I.toArr(headers, (entry) => {
                if (/content-/.test(entry[0])) {
                    let content = decodeURI(entry[1]);
                    headers[entry[0]] = content;
                    let name = I.RC(entry[0], /content-/);
                    switch (name) {
                        case "disposition":
                            let attachName = content.match(/^attachment;\s*filename=[\"\']+?(.+)[\"\']+?$/i);
                            if (attachName && attachName[1]) {
                                headers.filename = decodeURI(attachName[1]);
                            }
                            break;
                        case "length":
                            headers.filesize = I.toInt(content) || 0;
                        case "password":
                            headers[name] = content;
                            break;
                        case "type":
                            content = I.toLow(content);
                            let v = content.split(/;/);
                            headers.filetype = content;
                            headers[name] = v[0].trim();
                            if (v[1])
                                headers.charset = I.toLow(v[1].split(/=/).pop().trim());

                            break;
                    }
                }
            });
            return headers;
        },
        head16: [
            ["7z", /^377ABCAF271C/],
            ["rar", /^52617221/],
            ["zip", /^504B0304/],
            ['png', /^89504E470D0A1A0A/],
            ["gif", /^47494638(3761|3961)/],
            ["jpg", /^FFD8FFE000104A464946/],
            ["webp", /^52494646\w{8}57454250/],
            ["pdf", /^255044462D312E/],
            ["bmp", /^424D\w{4}0{8}/]
        ],
        CheckExt(u8) {
            var u8buf = I.toU8(u8.slice(0, 16));
            return I.await(u8buf) ? u8buf.then(x => F.headType(x)) : F.headType(u8buf);
        },
        headType(s) {
            var mime = F.sp,
                text = I.str(s) ? s : I.toUp(I.Mach(s, v => I.toStr(v, 16).padStart(2, 0)).join(mime));
            I.toArr(F.head16, e => {
                if (e[1].test(text)) {
                    mime = e[0];
                    return !0;
                }
            })
            return mime;
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
        StoreList = {};
        isLocal = /^(127|localhost|172)/.test(location.host);
        CLASS = [CustomElement, CustomFetch, CustomStore, CustomTable, Decompress, ZipCompress, CustomAjax];
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
        async FetchCache(url, type, exp, dbName) {
            type = type || typename[3];
            let cache = await caches.open(dbName || T.DB_NAME);
            let response = await cache.match(url);
            if (!response || (exp && new Date - Date.parse(response.headers.get("date")) > exp)) {
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
                    type: F.getMime(iscss ? typename[2] : typename[0]),
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
            return await T.addJS(await F.getLibjs(name, progress, version, Filter, decode), null, F.getExt(name) == typename[2]);
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
                    name = F.getName(buf);

            } else if (buf) {
                href = F.URL(buf, type);

            }
            if (!name)
                name = I.file(buf) && buf.name || F.getMime(typename[3]) + "." + (I.u8buf(buf) && F.CheckExt(buf) || F.getMime(typename[6])
                );
            let a = T.$ce("a");
            a.href = href;
            a.download = name;
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
        toSet(o) {
            o = o || new class extends EventTarget { };
            o.action = o.action || {};
            var { RF, CF, BF } = this;
            I.defines(o, { I, T, F, RF: { value: RF }, CF: { value: CF }, BF: { value: BF } }, !0);
            return o;
        }
        docload(f) {
            if (document.readyState == evtname[5]) f.call(T);
            else document.once("DOMContentLoaded", f);
        }
        $(e, f) {
            return e ? (I.str(e) ? (f || document).querySelector(e) : I.fn(e) ? T.docload(e) : e) : undefined;
        }
        $$(e, f) {
            return (f || document).querySelectorAll(e) || [];
        }
        $ce(e) {
            return document.createElement(e)
        }
        $ca(e, attr) {
            return Object.assign(T.$ce(e), attr);
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
            return new DOMParser().parseFromString(str, mime || document.contentType).documentElement;
        }
        RF(action, data) {
            const R = this, A = R.action[action];
            return I.fn(A) ? I.tryA(R, A, data || []) : A;

        }
        CF(action, ...args) {
            return this.RF(action, args);
        }
        BF(action, o, ...a) {
            const R = this, A = R.action[action];
            return I.fn(A) ? I.tryA(o, A, a) : undefined;
        }
        GL(name, arg) {
            if (!I.none(T.lang[name]))
                name = T.lang[name];

            return arg ? T.toReplace(name, arg) : name;
        }
        toReplace(str, arg) {
            if (I.str(arg)) {
                str = I.RC(str, /{value}/, arg);
            } else if (I.obj(arg)) {
                I.toArr(arg, v => I.RC(str, new RegExp(v[0], "g"), v[1]));
            }
            return str;
        }
        MediaQuery(query, fn) {
            if (matchMedia) {
                let m = matchMedia(query);
                m.on(evtname[6], (e) => fn(e.matches, e));
                fn(m.matches);
                return m;
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
        /**
         * 下载远程数据到本地
         * @param {*} ARG 
         * @returns 
         */
        FetchItem(ARG) {
            return new CustomFetch(ARG).result
        }
        /**
         * 获取或者提交远程数据
         * @param {*} ARG 
         * @returns 
         */
        ajax(ARG) {
            return new CustomAjax(ARG).result
        }
        /**
         * 上传文明
         * @param {*} fn 
         * @param {*} Accept 
         */
        upload(fn, accept, multiple) {
            T.$ca('input', {
                type: File.name,
                accept,
                multiple,
                onchange(e) {
                    var files = e.target.files;
                    files.length && I.tryC(e, fn, files);
                    this.remove();
                },
                oncancel(e) {
                    this.remove();
                }
            }).click();
        }
        async PostMessage(str) {
            T.SW.post(str);
        }
        SW = new class {
            constructor(T) {
                var S = this,
                    sW = navigator.serviceWorker;
                Object.assign(S, {
                    async post(str) {
                        var sw = sW.controller||T.sw||sW.ready&&(await sW.ready).active;
                        return sw && sw.postMessage(str);
                    },
                    open(file,fn) {
                        sW.register(file).then(e => {
                            var sw = e.installing || e.active;
                            fn&&fn(sw);
                            S.client();
                            document.on("visibilitychange", e => document.visibilityState === 'visible' && S.client());
                            T.PWAReady = I.Async(!0);
                            sw.on('statechange', e => {
                                T.sw = e.target;
                                ['redundant','activated'].includes(T.sw.state)&&S.client();
                                console.log(T.sw.state,2);
                                T.CF('pwa_' + e.type, e);
                            });
                            T.sw = sw;
                            S.pushManager = e.pushManager;
                            e.pushManager.getSubscription().then(
                                x => {
                                    if (!x) {

                                    }else{
                                        console.log(x);
                                    }
                                }
                            );
                        })
                    },
                    client() {
                        S.post({
                            action: strname[0],
                            DB_NAME: T.DB_NAME,
                            DB_STORE_MAP:T.DB_STORE_MAP,
                            JSpath: T.JSpath
                        });
                    },
                    clear() {
                        sW.getRegistrations().then(sws => I.Each(sws, sw => sw.unregister()));
                    },
                    init() {
                        var { post, clear } = S;
                        return I.Async(re => {
                            if (sW) {
                                sW.on(evtname[1], e => {
                                    S.clear();
                                    console.log(e);
                                    T.CF('pwa_' + e.type, e);
                                });
                                sW.on('controllerchange',e=>{
                                    console.log(e.type);
                                    S.client();
                                });
                                sW.on(evtname[7], async event => {
                                    let data = event.data;
                                    if (I.obj(data)) {
                                        let { action, id} = data;
                                        if (action) {
                                            if(action===strname[0])T.CACHE_NAME = data.CACHE_NAME;
                                            if (I.str(action)&&T.action[action]) {
                                                if (id) {
                                                    return post({
                                                        action:id,
                                                        result:await T.CF(action, data)
                                                    });
                                                }else{
                                                    return T.CF(action, data)
                                                }
                                            }else if (T.isLocal) console.log(data);
                                        }
                                    }
                                });
                                sW.ready.then(sw => {T.sw = sw.active;re(!0);});
                            } else {
                                re(!1);
                            }
                        })

                    }

                })
            }
        }(this);
        action = {};
        constructor() {
            super();
            var T = this;
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
            var { language, onLine } = navigator;
            var { readyState, currentScript, characterSet } = document;
            var src = currentScript && currentScript.src.split(/\?/),
                JSpath = src && F.getPath(src[0]),
                langs = I.toLow(language).split("-");
            if (langs[0] == "zh") {
                if (langs[1] == "cn")
                    langs[1] = "hans";
                else if (langs[1] != "hk")
                    langs[1] = "hant";

            }
            Object.assign(T, {
                I, F,
                JSpath,
                ROOT: F.getPath(location.href),
                langName: langs[0],
                i18nName: langs.join("-"),
                charset: I.toLow(characterSet),
                language,
                onLine,
                readyState,
                isTouch: I.hasOwnProp(HTMLElement, 'ontouchstart'),
                PWAReady: T.SW.init()
            });
        }
    };
    exports.onerror = (...a) => alert(a.join("\n"));
    Object.assign(exports, { T, F, I });
    I.defines(exports, {
        Nenge: T
    }, 1);
});