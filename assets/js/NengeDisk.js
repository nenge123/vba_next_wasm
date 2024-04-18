
class NengeDisk {
    ready = [];
    RegExpPaths = [];
    constructor(NAME, pathinfo, Module) {
        this.pathinfo = pathinfo;
        this.dbName = NAME;
        this.Store = typeof Nenge != 'undefined' ? Nenge.getStore(NAME) : this.getIndexedDB(NAME);
        if (Module) this.SetModule(Module);
    }
    SetModule(Module) {
        Object.defineProperty(this, 'Module', { get: () => Module });
        if (this.FS) {
            Object.keys(this.pathinfo).forEach(path => {
                this.RegExpPaths.push(new RegExp('^' + path.replace('/', '\\/')));
                this.FS.mkdir(path);
                this.FS.mount(this, {}, path);
            })
        }
        if (this.MEMFS) {
            this.setMEMFS();
        }
    }
    get FS() {
        return this.Module.FS || window.FS;
    }
    get MEMFS() {
        return this.Module.MEMFS || this.FS.filesystems.MEMFS;
    }
    get HEAP8() {
        return this.Module.HEAP8 || self.HEAP8;
    }
    getStore(mount) {
        var path = mount.mountpoint;
        if (!path || !this.pathinfo[path]) return;
        return this.Store.table(this.pathinfo[path]);
    }
    mount(mount) {
        this.ready.push(this.syncfs(mount))
        return this.MEMFS.mount.apply(null, arguments);
    }
    async syncfs(mount, populate, callback) {
        let D = this;
        let store = D.getStore(mount);
        let result;
        if (store) {
            if (!mount.isReady) {
                //初始化
                result = await this.loadFile(store).catch(e => alert(e));
                mount.isReady = true;
            } else {
                result = await D.syncWrite(store, mount);
            }
        }
        if (location.host === '127.0.0.1') console.log('同步成功:'+mount.mountpoint+'\n', result);
        populate && (populate instanceof Function) && populate('ok');
        callback && (callback instanceof Function) && callback('ok');
        return result;
    }
    async loadFile(store) {
        let D = this;
        return Object.entries(await store.cursor()).map(entry => D.storeLocalEntry(entry[0], entry[1])).join("\n");
    }
    IsOnSync = !1;
    syncUpdate(steam, bool) {
        if (steam && steam.node && steam.node.mount) {
            if (!this.toRegExp(steam.node.mount.mountpoint)) return;
        }
        this.IsOnSync = !0;
        if (steam.fd != null) {
            clearTimeout(this.Timer);
            return this.Timer = setTimeout(() => this.syncUpdate(steam, !0), 500);
        }
        this.IsOnSync = !1;
        this.FS.syncfs(() => { });
    }
    setMEMFS(MEMFS) {
        let D = this;
        if (!this.MEMFS) Object.defineProperty(this.Module, 'MEMFS', { get: () => MEMFS });
        else if (!MEMFS) MEMFS = D.MEMFS;
        MEMFS.stream_ops.write = function (stream, buffer, offset, length, position, canOwn) {
            if (D.HEAP8 && buffer.buffer === D.HEAP8.buffer) {
                canOwn = false
            }
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    D.syncUpdate(stream);
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            D.MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset,
                offset + length), position);
            else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        };
        MEMFS.stream_ops.msync = function (steam) {
            console.log('msync同步?', steam);
            /*D.FS.syncfs(()=>console.log('同步'));*/
        }
        if (MEMFS.ops_table) MEMFS.ops_table.file.stream.write = MEMFS.stream_ops.write;
        if (MEMFS.ops_table) MEMFS.ops_table.file.stream.msync = MEMFS.stream_ops.msync;
        MEMFS.node_ops.unlink = function (parent, name) {
            delete parent.contents[name];
            if (parent.mount && parent.mount.isReady) {
                if (D.toRegExp(parent.mount.mountpoint)) {
                    clearTimeout(D.Timer);
                    return D.Timer = setTimeout(() => D.FS.syncfs(() => { }), 500);
                }
            }
        }
        if (MEMFS.ops_table) MEMFS.ops_table.dir.node.unlink = MEMFS.node_ops.unlink;
    }
    setSyncEvent() {
        var D = this;
        D.FS.trackingDelegate['onDeletePath'] = function (path) {
            if (D.toRegExp(path)) {
                clearTimeout(D.Timer);
                return D.Timer = setTimeout(() => D.FS.syncfs(() => { }), 500);
            }
        };
        D.FS.trackingDelegate["onWriteToFile"] = function (path) {
            if (D.toRegExp(path)) {
                clearTimeout(D.Timer);
                return D.Timer = setTimeout(() => D.FS.syncfs(() => { }), 500);
            }
        }

    }
    async syncWrite(store, mount) {
        var D = this;
        let fslist = this.getLocalList(mount.mountpoint, !0);
        let dblist = await this.getRemoteList(store);
        let savelist = [],
            removelist = [],
            result = [];
        Object.entries(fslist).forEach(entry => {
            if (!dblist[entry[0]] || entry[1] > dblist[entry[0]]) {
                savelist.push(entry[0]);
            }
        });
        Object.entries(dblist).forEach(entry => {
            if (!fslist[entry[0]]) {
                removelist.push(entry[0]);
            }
        });
        if (savelist.length || removelist.length) {
            var transaction = await store.write();
            if (savelist.length) {
                savelist = savelist.sort().map(
                    path => new Promise(
                        re => transaction.put(D.loadLocalEntry(path), path).addEventListener(
                            'success',
                            e => re('indexdb write:' + path)
                        )
                    )
                );
            };
            if (removelist.length) {
                removelist = removelist.sort().map(
                    path => new Promise(
                        re => transaction.delete(path).addEventListener(
                            'success',
                            e => re('indexdb delete::' + path)
                        )
                    )
                );
            }
            result = result.concat(await Promise.all(savelist)).concat(await Promise.all(removelist));
        }
        this.log && this.log(IsReady, result);
        return result.join("\n");
    }
    loadLocalEntry(path) {
        let D = this,
            FS = D.FS,
            stat, node;
        if (FS.analyzePath(path).exists) {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path)
        } else {
            return path + ' is exists'
        }
        if (FS.isDir(stat.mode)) {
            return {
                timestamp: stat.mtime,
                mode: stat.mode
            };
        } else if (FS.isFile(stat.mode)) {
            node.contents = D.getFileDataAsTypedArray(node);
            return {
                timestamp: stat.mtime,
                mode: stat.mode,
                contents: node.contents
            };
        } else {
            return "node type not supported";
        }
    }
    storeLocalEntry(path, entry) {
        let D = this,
            FS = D.FS;
        if (!entry || !entry.mode) return;
        if (FS.isDir(entry.mode)) {
            !FS.analyzePath(path).exists && FS.createPath('/', path, !0, !0)
        } else if (FS.isFile(entry.mode)) {
            let p = path && path.split('/').slice(0, -1).join('/');
            if (p && !FS.analyzePath(p).exists) FS.createPath('/', p, !0, !0);
            FS.writeFile(path, entry.contents, {
                canOwn: true,
                encoding: "binary"
            });
        } else {
            throw "node type not supported";
        }
        FS.chmod(path, entry.mode);
        FS.utime(path, entry.timestamp, entry.timestamp);
        return 'FS write:' + path;
    }
    removeLocalEntry(path) {
        let FS = this.FS;
        if (FS.analyzePath(path).exists) {
            var stat = FS.stat(path);
            if (FS.isDir(stat.mode)) {
                FS.rmdir(path)
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path)
            }
            return 'FS unlink:' + path;
        } else {
            return path + 'is not exists';
        }
    }
    async getRemoteList(store, callback) {
        let result = await store.cursor('timestamp');
        callback && callback(result);
        return result
    }
    getLocalList(mountpoint, bool) {
        mountpoint = mountpoint || '/';
        let D = this,
            FS = D.FS,
            entries = {},
            filterRoot = [".", ".."].concat(mountpoint == '/' ? ["dev", "tmp", "proc"] : []),
            isRealDir = p => !bool || !filterRoot.includes(p),
            toAbsolute = root => p => D.join2(root, p),
            check = D.stat(mountpoint) && FS.readdir(mountpoint).filter(isRealDir).map(toAbsolute(
                mountpoint));
        if (!check) return console.log('mount:PATH ERROR');
        while (check.length) {
            let path = check.shift();
            if (!bool && path == mountpoint) continue;
            if (!bool && path == mountpoint) continue;
            let stat = D.stat(path);
            if (D.Filter && D.Filter(path)) continue;
            if (stat) {
                if (!FS.isDir(stat.mode)) {
                    entries[path] = stat.mtime;
                }
                if (FS.isDir(stat.mode) && bool) {
                    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
                }

            }
        }
        return entries;
    }
    stat(path) {
        let D = this,
            FS = D.FS,
            pathinfo = FS.analyzePath(path);
        if (pathinfo.exists && pathinfo.object.node_ops && pathinfo.object.node_ops.getattr) {
            return FS.stat(path);
        }
    }
    getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    }
    join() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return this.normalize(paths.join("/"))
    }

    join2(l, r) {
        return this.normalize(l + "/" + r)
    }
    normalize(path) {
        var isAbsolute = path.charAt(0) === "/",
            trailingSlash = path.substring(-1) === "/";
        path = this.normalizeArray(path.split("/").filter(p => {
            return !!p
        }), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    }

    normalizeArray(parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift("..")
            }
        }
        return parts
    };
    ReadFile(file) {
        if (this.FS.analyzePath(file).exists) return this.FS.readFile(file);
    }
    MKFILE(path, data, bool) {
        if (!this.Module) return;
        let FS = this.FS,
            dir = path.split('/');
        if (dir.length) dir = dir.slice(0, -1).join('/');
        else dir = '/';
        if (!FS.analyzePath(dir).exists) {
            let pdir = dir.split('/').slice(0, -1).join('/');
            if (!FS.analyzePath(pdir).exists) FS.createPath('/', pdir, !0, !0);
            FS.createPath('/', dir, !0, !0);
        }
        if (typeof data == 'string') data = new TextEncoder().encode(data);
        if (bool) {
            if (FS.analyzePath(path).exists) FS.unlink(path);
            FS.writeFile(path, data, {
                //canOwn: true,
                encoding: "binary"
            });
        } else if (!FS.analyzePath(path).exists) {
            FS.writeFile(path, data, {
                //canOwn: true,
                encoding: "binary"
            });
        }
    }
    toRegExp(path) {
        var bool = !1;
        this.RegExpPaths.forEach(v => v.test(path) && (bool = !0));
        return bool;
    }
    getIndexedDB(name) {
        var D = this;
        D._DB = new Promise(re => {
            var req = indexedDB.open(name || D.dbName);
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                Object.keys(D.pathinfo).forEach(key => {
                    if (!db.objectStoreNames.contains(key)) {
                        var store = db.createObjectStore(key);
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                })
            }
            req.onsuccess = function (e) {
                re(req.result);
            }
        });
        return new class {
            async transaction(table, ReadMode) {
                return (await D._DB).transaction([table], ReadMode ? undefined : "readwrite").objectStore(table);
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
                    read() {
                        return this.transaction(!0)
                    }
                    write() {
                        return this.transaction(!1)
                    }
                    put(data, path) {
                        return new Promise(async re => {
                            (await this.write()).put(data, path).onsuccess = function (e) { re(e.target.result) };
                        });
                    }
                    delete(path) {
                        return new Promise(async re => {
                            (await this.write()).delete(data, path).onsuccess = function (e) { re(e.target.result) };
                        });
                    }
                    get(path) {
                        return new Promise(async re => {
                            (await this.read()).get(data, path).onsuccess = function (e) { re(e.target.result) };
                        });
                    }
                    cursor(keyname, query, direction) {
                        return new Promise(async re => {
                            var data = {}, db = await this.read(), odb;
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
        }
    }
}