let NengeApp = new class {
    version = 7.22;
    CoreFile = "wasm/vbanext-wasm.7z";
    Core7z = "js/extract7z.min.js";
    CoreZip = "js/jszip.js";
    CoreRar = "js/libunrar.js";
    CoreRarMem = "js/libunrar.js.mem";
    CoreDB = 'js/dexie.worker.js';
    CONFIG = {
        stateKey: 0,
        'do-music': false
    };
    Timer = {};
    CoreFileName = this.CoreFile.split('/').pop();
    constructor() {
        this.setConfig({});
        this.CONFIG['do-record'] = false;
        this.initDB();
    }
    DB = new class {
        info = 'INFO';
        room = 'ROOMS';
        state = 'STATE';
        DATA = {
            'DBNAME': 'NengeNet_VBA-Next',
            'STORES': {
                'INFO': '&name,*time',
                'ROOMS': '&name',
                'STATE': '&name',
            }
        };
        constructor(N) {
            this.file = N.CoreDB;
            this.DATA.version = Math.floor(N.version);
            return (query) => {
                return new Promise((complete, erro) => {
                    query = query || {};
                    if (!query.db) query.db = 'room';
                    query.db = this[query.db] || query.db;
                    if (!query.method) query.method = 'get';
                    query.method = query.method.toLowerCase();
                    query.key = Math.random();
                    return this.OPEN(query, complete, erro)
                });
            }
        };
        SETPOST(post) {
            for (let key in this.DATA) post[key] = this.DATA[key];
            return post;
        }
        E = {};
        OPEN(post, cb, erro) {
            if (post) {
                /**
                 * 常驻可以在离开的时候储存
                 * 临时的可以避免多次操作产生错误。
                 * 为此用承诺方式执行
                 *
                    let worker = new Worker(this.file);
                    worker.onerror = e => this.Erro(e);
                    worker.onmessage = e=>{
                        cb(e.data.result);
                        worker.terminate();
                    };
                    worker.onerro = e=>erro(e);
                    worker.postMessage(this.SETPOST(post));
                }
                return;
                 */
                if (!this.worker) {
                    this.worker = new Worker(this.file);
                    this.worker.onerror = e => {
                        console.log(e);
                    };
                    this.worker.onmessage = e => {
                        let data = e.data;
                        if(data.key){
                            this.E[data.key](data.result);
                            data.erro&&console.log(data.erro);
                            delete this.E[data.key];
                        }
                    };;
                }
                this.E[post.key] = cb;
                this.worker.postMessage(this.SETPOST(post));
            }
        }
    }(this);
    async installCore(result) {
        if (NengeApp == undefined || !NengeApp.Module){
            (new Function('NengeApp', result.file.CoreJS + ';'+result.file.CoreMD5))(this);
            ['CoreFile', 'Core7z', 'CoreZip', 'CoreRar', 'CoreRarMem'].forEach(
                val => {
                    if (result.file[val]) {
                        if (val !== 'CoreRar') this[val] = URL.createObjectURL(new Blob([result.file[val]]));
                    }
                }
            );
            if (result.file['CoreRar']) {
                result.file['CoreRar'] = result.file['CoreRar'].replace('"libunrar.js.mem"', '"' + this.CoreRarMem + '"');
                this['CoreRar'] = URL.createObjectURL(new Blob([result.file['CoreRar']]));

            }
        }else console.log('本地测试环境');
        let File = result.file,
            cfg = File.cfg,
            Module = this.Module;
        if (File['wasmdata']) {
            this.Module.wasmBinary = File['wasmdata'];
        }
        Module.canvas = document.querySelector('.gba-pic');
        Module.MSG = (a,b)=>this.MSG(a,b);
        Module.runMusic = this.CONFIG['do-music'] || false;
        Module.MusicMSG = ()=>{
            this.MSG('<button data-btn="startmusic">启动模拟器音乐</button>')
        }
        Module.onRuntimeInitialized = e => {
            console.log('就绪!加载游戏!');
            File['wasmdata'] = null;
            File = null;
            Module.wasmBinary = null;
            result = null;
            if (this.CONFIG.lastgame) this.BtnMap['db']['GetRoom'](this.CONFIG.lastgame);
            else this.BtnMap['rooms']['show']();
        };
        if (typeof EmulatorJS == 'undefined')(new Function('NengeApp', File.wasmjs + ';EmulatorJS(NengeApp.Module);'))(this);
        else EmulatorJS(Module);
        let FS = Module.FS;
        FS['createFolder']('/', 'etc', !0x0, !0x0),
        FS['createFolder']('/etc', 'VBA Next', !0x0, !0x0),
            FS['mkdir']('/shader'),
            FS['syncfs'](!0x0, function (e) {}),
            FS['createFolder']('/home/web_user', '.config', !0x0, !0x0),
            FS['createFolder']('/home/web_user/.config', 'retroarch', !0x0, !0x0);
            for (let dir in cfg) {
                if (cfg[dir]) FS['writeFile'](dir, cfg[dir]);
            }
        //EmulatorJS(Module);
    }
    AddJs(URL, cb) {
        let elm = document.createElement('script');
        elm.src = URL;
        if (cb) elm.onload = cb;
        document.body.appendChild(elm);
    }
    get isRun() {
        if (this.running) return true;
        let $re = this.Module && this.Module.noExitRuntime;
        if (!$re) this.BtnMap['rooms']['show']();
        else this.running = true;
        return $re;
    }
    get MusicState(){
        let bool = this.Module.onRunning==false&&this.Module.runMusic==true;
        if(bool) return this.BtnMap['startmusic'](),bool;
    }
    BtnMap = {
        'startmusic': e => {
            this.Module.MusicStart();
            this.MSG('启动音乐',true);
        },
        'do': {
            'settings': e => {
                this.RESULT(this.ELM.MENU_HTML)
            },
            'reload': e => {
                return location.reload();
            },
            'reset': e => {
                if (!this.isRun) return;
                this.Module['cwrap']('system_restart', '', [])();
                this.BtnMap['closelist']();
            },
            'music': e => {
                this.setConfig({
                    "do-music": !this.CONFIG['do-music']
                });
                this.BtnMap['closelist']();
                return location.reload();
            },
            'forward': () => {
                if (!this.isRun) return;
                this.CONFIG['do-forward'] = !this.CONFIG['do-forward'];
                this.Module['cwrap']('fast_forward', 'number', ['number'])(this.CONFIG['do-forward'] ? 1 : 0);
                this.BtnMap['closelist']();
            },
            'downscreen': e => {
                this.download(this.DATA.SCREEN, this.GetName('png'));
                this.BtnMap['closelist']();
            },
            'shader': e => {
                if (!this.isRun) return;
                if (e && e.target) e.target.classList.toggle('active');
                this.CONFIG['do-shader'] = [];
                document.querySelectorAll('[data-btn="do-shader"]').forEach(
                    val => {
                        if (val.classList.contains('active')) this.CONFIG['do-shader'].push(val.getAttribute('data-option'));
                    }
                );
                this.setConfig({'do-shader':this.CONFIG['do-shader']});
                this.DATA.SetShader();
                this.BtnMap['closelist']();
            },
            'getinfo': e => {
                fetch('list.html').then(v => v.arrayBuffer()).then(v => this.RESULT((new TextDecoder).decode(v)));
            },
            'sw':e=>{
                if(this.CONFIG['do-sw'])this.BtnMap['sw']['clear']().then(e=>location.reload());
                else this.BtnMap['sw']['install']().then(result=>this.BtnMap['closelist']());
            },
            'loop':e=>{
                this.Module.resumeMainLoop();
                this.BtnMap['closelist']();
            },
            'hideui':e=>{
                this.BtnMap['closelist']();
                let ctrl = document.querySelector('.gba-ctrl').classList;
                ctrl.toggle('hideui');
                this.setConfig({'do-hideui':ctrl.contains('hideui')});
            },
            'record':e=>{
                if (!this.isRun || !this.GameName) return;
                this.BtnMap['closelist']();
                if(!this.Record) {
                    this.setConfig({'do-record':false});
                    this.MSG('<h3>错误</h3>不能录屏<br>当前浏览器不支持<br>MediaRecorder API<br>请停止使用。</h3>');
                    return
                };
                if(this.CONFIG['do-record']){
                    this.setConfig({'do-record':false});
                    this.Record.stop();
                }else{
                    this.setConfig({'do-record':true});
                    this.MSG('<button data-btn>录屏已开始</button>',true);
                    this.Record.start();
                }
            }
        },
        'sw':{
            'clear':e=>{
                return new Promise((ok, erro) => {
                    if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(registrations=>{
                        for(let i in registrations)registrations[i].unregister();
                        this.setConfig({'do-sw':false});
                        caches.delete('NengeApp_VBA').then(result=>ok());
                    });
                    else ok();
                });
            },
            'install':e=>{
                return new Promise((compelte, erro) => {
                    if('serviceWorker' in navigator){
                        navigator.serviceWorker.register('sw.js').then(async serviceWorker=>{
                            this.setConfig({'do-sw':true});
                            compelte();
                            console.log('ServiceWorker 注册成功',serviceWorker.scope);
                                const registrations = await navigator.serviceWorker.getRegistrations();
                            for (let index in registrations) {
                                let serviceWorker = registrations[index];
                                if (serviceWorker['active']) {
                                    let controller = serviceWorker['active'], talk = new MessageChannel(), custom = new CustomEvent('message');
                                    talk.port1.onmessage = message => {
                                        let result_1 = message.data;
                                        if (result_1 == 'install') {
                                            console.log('sw=>web 通信建立!');
                                            controller.postMessage = e => talk.port1.postMessage(e);
                                            talk.port1.onmessage = e_1 => {
                                                controller.onmessage && controller.onmessage(e_1);
                                                custom.data = e_1.data;
                                                controller.dispatchEvent(custom);
                                            };
                                        }
                                    };
                                    controller.onmessage = e_2 =>{
                                        if(e_2.data.message){
                                            this.MSG(`<button data-btn>${e_2.data.message}</button>`,true);
                                        }
                                        console.log(e_2.data)
                                    };
                                    controller.postMessage('install', [talk.port2]);
                                }
                            }
                        },err=>{console.log('ServiceWorker registration failed: ', err);});
                        navigator.serviceWorker.addEventListener('message',message=>{if(message.data.message)this.MSG(`<button data-btn>${message.data.message}</button>`,true)});
                    }else{
                        compelte();
                    }
                });
            },
        },
        'srm': {
            'up': e => {
                if (!this.isRun) return;
                this.BtnMap['closelist']();
                this.upload(result => {
                    console.log('载入存档');
                    let fun = cb => cb instanceof Uint8Array && (cb.length == 139264 || cb.length == 1024 * 128);
                    if (fun(result)) {
                        return this.DATA.AddSRM(result);
                    } else if (typeof result == 'object') {
                        for (let file in result) {
                            if (fun(result[file])) {
                                return this.DATA.AddSRM(result[file]);
                                break;
                            }
                        }
                    }
                    this.MSG('存档文件大小不符合要求被忽略了！');
                    result = null;
                })

            },
            'down': e => {
                if (!this.isRun) return;
                this.BtnMap['closelist']();
                this.download(this.DATA.SRM, this.GetName('srm'));
            },
            'down128': e => {
                if (!this.isRun) return;
                this.BtnMap['closelist']();
                let buf = new Uint8Array(this.DATA.SRM.subarray(0, 128 * 1024));
                this.download(buf, this.GetName('srm'));
            },
        },
        'key': {
            'key': e => {
                this.RESULT(this.ELM.KEY_HTML(this.KEY.KeyCodetoArr(), this.KEY.KeyboardIndex));
            },
            'gamepad': e => {
                this.RESULT(this.ELM.GAMEPAD_HTML(this.KEY.KeyGamePad, this.KEY.KeyGamePadMap, this.KEY.KeyMap));
            },
            'save': e => {
                let KeyCode = this.KEY.ELMsetKeyBoard();
                this.BtnMap['closelist']();
                this.setConfig({
                    KeyCode
                });
            },
            'reset': e => {
                this.KEY.resetKeyBoard();
                this.BtnMap['key']['key']();
            }
        },
        'translate': {
            'load': e => {
                if(this.MusicState) return ;
                let baiduKey = this.CONFIG.baiduKey;
                if (baiduKey && baiduKey.id && baiduKey.key) {
                    return this.BtnMap['translate']['Baidu']('POST');
                }
                return this.BtnMap['translate']['show']();
            },
            'save': e => {
                let baiduKey = {
                    id: document.querySelector('.gba-translate-id').value,
                    key: document.querySelector('.gba-translate-key').value,
                    host: document.querySelector('.gba-translate-host').value,
                    from: document.querySelector('.gba-translate-from').value,
                    to: document.querySelector('.gba-translate-to').value
                };
                if (baiduKey.id && baiduKey.key) {
                    this.setConfig({
                        baiduKey
                    });
                    this.BtnMap['closelist']();
                } else {
                    return ;
                }
            },
            'show': e => {
                this.RESULT(this.ELM.BAIDU_HTML(this.CONFIG.baiduKey || {}));
                document.querySelector('.gba-translate-id').select()

            },
            Baidu: (method, config) => {
                config = config || {};
                method = method || 'GET';
                let g = new FormData(),
                    baiduKey = this.CONFIG.baiduKey,
                    p,
                    image = this.DATA.SCREEN, // uintArray8
                    gd = {
                        "key": baiduKey.key,
                        "appid": baiduKey.id,
                        "from": baiduKey.from,
                        "to": baiduKey.to,
                        "q": baiduKey.q || "",
                        "salt": Math.random(),
                        "cuid": 'APICUID',
                        "mac": 'mac',
                        "version": 3,
                        "paste": 0,
                        //"query":'apple',
                    },
                    delkey = ['mac', 'cuid', 'version', 'paste', 'key'],
                    url = baiduKey.host + '?'; //'http://127.0.0.1/api/translateBaidu.php?';
                //https://fanyi-api.baidu.com/api/trans/sdk/picture?
                for (var i in gd) {
                    g.append(i, config[i] || gd[i]);
                }
                //return console.log(image.buffer);
                //SparkMD5 https://github.com/satazor/js-spark-md5/tree/v3.0.2
                if (method == 'GET') {
                    g.append("callback", 'NengeApp.MSGJSON');
                    g.append("sign", SparkMD5.hash(g.get('appid') + g.get('salt') + g.get('salt') + g.get('key')));
                } else {
                    delkey = ['q', 'key'];
                    p = new FormData();
                    let imgmd5 = SparkMD5.ArrayBuffer.hash(image.buffer);
                    p.append("image", new File([image.buffer], 'my.png', {
                        type: "image/png"
                    }));
                    g.append("sign", SparkMD5.hash(g.get('appid') + imgmd5 + g.get('salt') + g.get('cuid') + g.get('mac') + g.get('key')));

                }
                delkey.forEach(val => g.delete(val));
                g = new URLSearchParams(g);
                if (method == 'GET') return this.AddJs(url + g);
                else fetch(
                    new Request(url + g, {
                        'method': method,
                        //'headers': {
                        //    'Content-Type': method == 'GET' ? 'application/x-www-form-urlencoded' : 'multipart/formdata'
                        //},
                        'body': p
                    })
                ).then(
                    v => v.json()
                ).then(
                    v => {
                        let msg;
                        if (v && v.data) {
                            msg = v.data.sumDst ? v.data.sumDst.replace(/\n/g, '<br>') : '错误！没找到可翻译内容';
                        }
                        this.MSG('<div class="gba-translate-show">' + msg + '</div>')
                    }
                    // console.log(v)
                    // '<pre>'+v&&v.data&&v.data.sumDst||v.error_msg+'</pre>',true)
                ).catch(
                    e => this.MSG('很遗憾!翻译功能要跨域!')
                );
            },
        },
        'cheat': {
            'show': async e => {
                if (!this.isRun) return;
                let HTML = '<div><textarea style="width: 100%;height: 500px;" class="gba-cheats">',
                    data = await this.DB({
                        method:'get',
                        name:this.GameName,
                        db:'info'
                    });
                if (data && data.cheat) {
                    HTML += data.cheat;
                }
                let ctrl = '<button type="button" data-btn="cheat-run">启用</button> | <button type="button" data-btn="cheat-save">保存并启用</button> | <button type="button" data-btn="cheat-stop">暂停</button>';
                HTML += '</textarea></div>';
                this.RESULT(ctrl + HTML + ctrl);
                //this.BtnMap['closelist']();
            },
            'run': e => {
                if (!this.isRun) return;
                let cheat = document.querySelector('.gba-cheats').value.split('\n'),
                    code = [];
                for (let i = 0; i < cheat.length; i++) {
                    let c = cheat[i].trim();
                    if (c.indexOf('-') == -1 && c.indexOf('#') == -1) {
                        c = c.replace(/\s+?/g, '');
                        code.push(c);
                    }
                }
                console.log(code.join('\\n'));

                //适用口袋妖怪穿墙
                if (code.toString() == "C518E2595ADBAF5B") {
                    let id = setInterval(function () {
                        NengeApp.Module['setValue'](40759308, 0);
                        NengeApp.Module['setValue'](40759309, 33);
                    }, 10);
                }
                //适用所有GBA游戏的原始作弊码
                for (let i = 0; i < code.length; i++) {
                    code[i] = code[i].replace(":","");
                    code[i] = code[i].replace("：","");
                    let address = code[i].substring(0, 8);
                    let value = code[i].substring(8, code[i].length);
                    let highValue = address.substring(0,2);
                    //02变量数据 , 08程序数据
                    let offset = 40201760;
                    if (highValue == "02") {
                        offset = 40201760;
                    } else if (highValue == "08") {
                        offset = -40759308;
                    } else {
                        continue;
                    }

                    let rd = eval("0x" + address).toString(10);
                    rd = parseInt(rd) + parseInt(offset);
                    if (value.length == 2) {
                        let id = setInterval(function () {
                            NengeApp.Module['setValue'](rd, eval("0x" + value.substring(0, 2)).toString(10));
                        }, 10);
                    }
                    if (value.length == 4) {
                        let id = setInterval(function () {
                            NengeApp.Module['setValue'](rd, eval("0x" + value.substring(2, 4)).toString(10));
                            NengeApp.Module['setValue'](rd + 1, eval("0x" + value.substring(0, 2)).toString(10));
                        }, 10);
                    }
                    if (value.length == 8) {
                        let id = setInterval(function () {
                            NengeApp.Module['setValue'](rd, eval("0x" + value.substring(6, 8)).toString(10));
                            NengeApp.Module['setValue'](rd + 1, eval("0x" + value.substring(4, 6)).toString(10));
                            NengeApp.Module['setValue'](rd + 2, eval("0x" + value.substring(2, 4)).toString(10));
                            NengeApp.Module['setValue'](rd + 3,  eval("0x" + value.substring(0, 2)).toString(10));
                        }, 10);
                    }
                    if (value.length == 16) {
                        let id = setInterval(function () {
                            NengeApp.Module['setValue'](rd, eval("0x" + value.substring(14, 16)).toString(10));
                            NengeApp.Module['setValue'](rd + 1, eval("0x" + value.substring(12, 14)).toString(10));
                            NengeApp.Module['setValue'](rd + 2, eval("0x" + value.substring(10, 12)).toString(10));
                            NengeApp.Module['setValue'](rd + 3, eval("0x" + value.substring(8, 10)).toString(10));
                            NengeApp.Module['setValue'](rd + 4, eval("0x" + value.substring(6, 8)).toString(10));
                            NengeApp.Module['setValue'](rd + 5, eval("0x" + value.substring(4, 6)).toString(10));
                            NengeApp.Module['setValue'](rd + 6, eval("0x" + value.substring(2, 4)).toString(10));
                            NengeApp.Module['setValue'](rd + 7, eval("0x" + value.substring(0, 2)).toString(10));
                        }, 10);
                    }
                }

                this.Module._reset_cheat();
                this.Module['cwrap']('set_cheat', 'number', ['number', 'number', 'string'])(0, 1, code.join('\\n'));
            },
            'stop': e => {
                if (!this.isRun) return;
                this.Module._reset_cheat();
            },
            'save': async e => {
                if (!this.isRun) return;
                this.DB({
                    method:'update',
                    name:this.GameName,
                    data:{ cheat: document.querySelector('.gba-cheats').value},
                    db:'info'
                }).then(result => {
                        this.BtnMap['cheat']['run']();
                });
            },
        },
        'db': {
            'InsertRoom': (gba, name, cb) => {
                return new Promise((ok, erro) => {
                    let time = new Date();
                    this.DB({
                        method: 'put',
                        data: {
                            name,
                            time
                        },
                        db: 'info'
                    });
                    this.DB({
                        method: 'put',
                        data: {
                            name,
                            gba,
                            time
                        },
                        db: 'room'
                    }).then(result => {
                        console.log(result);
                        cb ? cb(result) : ok(result);
                    }).catch(e => erro(e));
                });
            },
            'UpdateRoom': cb => {
                return new Promise((ok, erro) => {
                if (!this.isRun || this.CONFIG.lastgame == ''){
                    (typeof cb == 'function')&&cb(result);
                    return ok(false);
                }
                    let time = new Date(),
                        name = this.GameName,
                        img = this.DATA.SCREEN,
                        state = this.DATA.STATE,
                        srm = this.DATA.SRM;
                    this.DB({
                        method: 'update',
                        name,
                        data: {
                            img,
                            time
                        },
                        db: 'info'
                    }).then(result => {
                        console.log(result ? '封面储存成功' : '封面储存失败!')
                    });
                    this.DB({
                        method: 'update',
                        name,
                        data: {
                            state,
                            srm,
                            time
                        },
                        db: 'room'
                    }).then(
                        result => {
                            console.log(result ? '储存成功' : '存储失败!');
                            this.MSG(`<h3>${name}</h3><button data-btn="">快照${result ? '储存成功' : '存储失败!'}</button>`, true);
                            (typeof cb == 'function')&&cb(result);
                            ok(result);
                            time = new Date(), img = null, state = null, srm = null;
                        }).catch(e => erro(e));
                    })
            },
            'GetInfo': cb => {
                return new Promise((ok, erro) => {
                    this.DB({
                        method: 'all',
                        orderBy: 'time',
                        db: 'info',
                    }).then(result => {
                        cb ? cb(result) : ok(result);
                    })
                });

            },
            'GetRoom': (name, isdown) => {
                if (name == this.CoreFileName) return this.MSG('核心文件不是游戏文件！');
                this.DB({
                    method: 'get',
                    name,
                    db: 'room'
                }).then(result => {
                    if(!result) return this.BtnMap['rooms']['show']();
                    if (!isdown) {
                        this.setConfig({
                            lastgame: result.name
                        });
                        this.DATA.AddROOM(result.gba, result.srm, result.state, result.name);
                        return this.BtnMap['closelist']();
                    }
                    let Name = result.name.toLowerCase().replace(/\.gba/g, '');
                    if (result.gba) this.download(result.gba, Name + '.gba');
                    if (result.srm) this.download(result.srm, Name + '.srm');
                    if (result.state) this.download(result.state, Name + '.state');
                });

            },
            Delete: (name, db, cb) => {
                return new Promise((ok, erro) => {
                    this.DB({
                        method: 'delete',
                        name,
                        db
                    }).then(result => cb ? cb(result) : ok(result)).catch(e => erro(e));
                });
            }
        },
        'state': {
            'show': async e => {
                if (!this.isRun) return;
                this.BtnMap['closelist']();
                let HTML = '',
                    key = 'state';
                let states = await this.DB({
                    method: 'get',
                    db: key,
                    name: this.GameName
                });
                if (states) {
                    let list = {};
                    for (let index = 0; index < 5; index++) {
                        if (states[key + index]) {
                            list[index] = {
                                name:index,
                                title:'位置'+index,
                                img:states[key + 'img' + index],
                                time:states[key + 'time' + index]
                            }
                        }
                    }
                    HTML += this.ELM.ROOMS_LIST(list,key);
                }else{
                    HTML += '<div><h3>本游戏没有S/L记录！</h3></div>';
                }
                this.RESULT(HTML);
            },
            delete: e => {
                return;
            },
            'clear': e => {
                this.DB({
                    method: 'delete',
                    name: this.GameName,
                    db: 'state'
                }).then(result => {
                    console.log(result);
                    this.BtnMap['closelist']();
                });
            },
            'allclear': e => {
                this.DB({
                    method: 'clear',
                    db: 'state'
                }).then(result => {
                    console.log(result);
                    this.BtnMap['closelist']();
                });
            },
            'down': e => {
                if (!this.isRun) return;
                let elm = e.target,
                    index = elm.getAttribute('data-keyname');
                if (index == undefined) {
                    this.BtnMap['closelist']();
                    this.download(this.DATA.STATE, this.GetName('state'));
                    return;
                }
                this.DB({
                    method: 'get',
                    name: this.GameName,
                    db: 'state'
                }).then(
                    result => {
                        if (!result) return;
                        let state = result['state' + index];
                        if (state) {
                            this.download(state, this.GetName('state'));
                            state = null;
                        }
                        this.BtnMap['closelist']();
                    }
                );

            },
            'load': e => {
                if (!this.isRun) return;
                if(this.MusicState) return ;
                let index = this.CONFIG['stateKey'];
                if (e) {
                    let elm = e.target;
                    if (elm.getAttribute('data-keyname') != undefined) {
                        index = elm.getAttribute('data-keyname')
                    }
                }
                this.DB({
                    method: 'get',
                    name: this.GameName,
                    db: 'state'
                }).then(
                    result => {
                        if (!result) return;
                        let state = result['state' + index];
                        if (state) {
                            this.DATA.STATE = state;
                            state = null;
                        }
                        this.BtnMap['closelist']();
                    }
                )
            },
            'save': e => {
                if (!this.isRun) return;
                if(this.MusicState) return ;
                let data = {};
                data['state' + this.CONFIG['stateKey']] = this.DATA.STATE;
                data['stateimg' + this.CONFIG['stateKey']] = this.DATA.SCREEN;
                data['statetime' + this.CONFIG['stateKey']] = new Date();
                this.BtnMap['closelist']();
                return this.DB({
                    method: 'update',
                    name: this.GameName,
                    data,
                    db: 'state'
                }).then(update => {
                    if (!update) {
                        console.log('更新失败!写入！');
                        data['name'] = this.GameName;
                        this.DB({
                            method: 'put',
                            data,
                            db: 'state'
                        }).then(result => {
                            this.MSG('即时存档保存成功',true);
                            this.BtnMap['closelist']();
                        });
                    } else {
                        console.log('更新成功!');
                        this.BtnMap['closelist']();
                        this.MSG('即时存档保存成功',true);
                    }
                })
            },
            'up': e => {
                if (!this.isRun) return;
                this.BtnMap['closelist']();
                this.upload(result => {
                    if (result instanceof Uint8Array) {
                        this.DATA.STATE = result;
                    } else if (typeof result == "object") {
                        for (let file in result) {
                            if (result[file] instanceof Uint8Array) {
                                this.DATA.STATE = result[file];
                                break;
                            }
                        }
                    }
                })

            },
            'switch': e => {
                this.setConfig({
                    stateKey: ++this.CONFIG['stateKey'] % 5
                });
                this.MSG(`<button data-btn>当前即时存档位置为:${this.CONFIG['stateKey']}</button">`, true);
            },


        },
        'rooms': {
            'show': e => {
                this.BtnMap['db']['GetInfo'](result => {
                    this.RESULT(this.ELM.ROOMS_LIST(result));
                });
            },
            'load': Name => {
                if(this.MusicState) return ;
                if (Name && Name.target) {
                    Name = Name.target, Name = Name.getAttribute('data-keyname');
                }
                if (Name == this.CoreFileName) {
                    return this.MSG('核心文件不是游戏文件！');
                }
                console.log(Name);
                if (!Name || this.GameName == Name) return;
                if (this.GameName)this.BtnMap['db']['UpdateRoom']().then(result=>this.BtnMap['db']['GetRoom'](Name));
                else this.BtnMap['db']['GetRoom'](Name);
            },
            'delete': async e => {
                let elm = e.target,
                    name = elm.getAttribute('data-keyname');
                this.BtnMap['db']['Delete'](name, 'room');
                this.BtnMap['db']['Delete'](name, 'info', result => {
                    console.log(result);
                    if(name == this.GameName){this.setConfig({lastgame:''});location.reload();};
                    document.querySelector(`.gba-roomslist[data-keyname="${name}"`).remove();
                });

            },
            'save': e => {
                this.BtnMap['db']['UpdateRoom']().then(result=>this.BtnMap['closelist']());
            },
            'down': e => {
                let elm = e.target,
                    Name = elm.getAttribute('data-keyname');
                if (Name == this.CoreFileName) return location.href = "https://github.com/nenge123/vba_next_wasm";
                else this.BtnMap['db']['GetRoom'](Name, true);
            },
            'upload': async e => {
                this.upload((result, name) => {
                    let func = (buf, name) => {
                        this.BtnMap['db']['InsertRoom'](buf, name).then(result2 => {
                            console.log(result2);
                            if(!ERRO)this.BtnMap['rooms']['show']()
                        });
                    };
                    let ERRO = '';
                    if (result instanceof Uint8Array) {
                        if(result[0xB2] != 0x96)ERRO += this.ELM.NOTGBA_HTML(name);
                        else func(result, name);
                        result = null;
                    } else if (typeof result == "object") {
                        for (let file in result) {
                            if (result[file] instanceof Uint8Array) {
                                if(result[file][0xB2] != 0x96) ERRO += this.ELM.NOTGBA_HTML(file);
                                else func(result[file], file);
                            }
                        }
                        result = null;
                    }
                    if(ERRO){
                        this.BtnMap['closelist']();
                        this.MSG(ERRO);
                    }
                });
            },
        },
        'closelist': e => {
            let list = document.querySelector('.gba-list');
                list.style.cssText = '';
                if(this.ListResultHide)list.classList.remove('hideTitle');
                document.querySelector('.gba-result').innerHTML = '';
        },
        'openlist': e => {
            let list = document.querySelector('.gba-list');
                list.style.cssText = 'top:0px';
                if(e===true){
                    this.ListResultHide = true;
                    list.classList.add('hidetitle');
                }
        },
        'closemsg': e => {
            this.BtnMap['CloseMsg']();
        },
        'CloseMsg': e => {
            document.querySelector('.gba-msg').style.display = e?"":"none";
        }
    }
    RESULT(html,bool) {
        let result = document.querySelector('.gba-result');
        result.innerHTML = html;
        this.BtnMap['openlist'](bool);
        result = null;
    }
    MSG(str, bool) {
        clearTimeout(this.Timer.msg);
        document.querySelector('.gba-msg').innerHTML = str;
        this.BtnMap['CloseMsg'](true);
        if (bool==true) {
            this.Timer.msg = setTimeout(e => this.BtnMap['CloseMsg'](), 1500)
        }
    }
    MSGJSON(str, bool) {
        return this.MSG('<pre>' + JSON.stringify(str, null, 4) + '</pre>', bool)
    }
    UpLoad(elm){
        console.log(elm);
    }
    upload(cb) {
        return;
    }
    download(buf, name,mime) {
        let a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(buf instanceof Array ? buf:[buf], mime||{type: 'application/octet-stream'}));
        a.download = name || this.GameName;
        a.click();
        a = null;
    }
    GetName(str) {
        if (!this.GameName) this.GameName = '未知游戏.gba';
        if (!/\.gba$/.test(this.GameName)) this.GameName += '.gba';
        return str ? this.GameName.replace('.gba', '.' + str) : this.GameName;
    }
    async initDB() {
        let CoreData = await this.DB({
            'method':'get',
            'name': this.CoreFileName,
            'db': 'info'
        });
        if (CoreData) {
            if (CoreData.file.version == this.version) {
                console.log(CoreData.time);
                return this.installCore(CoreData);
            }
        }

        let havesize = 0,
            N = this,
            response = await fetch(this.CoreFile+'?'+Math.random()),
            errotext = `<h3>网络错误,或者无法下载：${this.CoreFile}</h3>`,
            Error = (msg)=>{
                this.MSG(msg);
                if(CoreData){
                    this.installCore(CoreData);
                }
            },
            downsize = response.headers.get("Content-Length") || '',
            ContentType = response.headers.get("Content-Type") || '';
            if(response.status == 404| ContentType.includes('text/html; charset='))return Error(`${errotext}<p><button data-btn>错误代码: ${response.status}</button></p><p><button data-btn>错误代码: ${response.statusText}</button></p><p>尝试读取旧版本数据.</p>`);
            const reader = response.body.getReader();
            const stream = new ReadableStream({
                start(controller) {
                    let push = e => {
                        reader.read().then(({
                            done,
                            value
                        }) => {
                            // 判断是否还有可读的数据？
                            if (done) {
                                // 告诉浏览器已经结束数据发送
                                controller.close();
                                push = null;
                                return;
                            }
                            havesize += value.length;
                            N.MSG('<h3>请稍等！</h3>' + N.CoreFile + '<br><button data-btn="">已下载: ' + (Math.ceil(havesize/downsize*100)) + '% 速度：'+Math.ceil(value.length/1024)+'KB</button>');
                            // 取得数据并将它通过controller发送给浏览器
                            controller.enqueue(value);
                            push();
                        });
                    }
                    push();
                }
            });
            let FetchData = await (new Response(stream).arrayBuffer()),
                result = await this.CheckFile(FetchData);
                this.MSG('解压完成');
                if(!result ||result instanceof Uint8Array){
                    return Error(`${errotext}<p><button data-btn>错误原因: 无法解压</button></p><p>尝试读取旧版本数据.</p>`);
                }
                CoreData = null;
                let decode = str => new TextDecoder().decode(str),
                untype = ['js', 'cfg', 'glsl', 'glslp'],
                data = {
                    'file': {
                        'cfg': {},
                        'version': N.version
                    },
                    'name': this.CoreFileName
                };
            for (var i in result) {
                let t = i.split('.').pop(),
                    fileName = i.split('/').pop(),
                    u8 = new Uint8Array(result[i]);
                if (untype.includes(t)) {
                    let txt = decode(u8);
                    if (fileName == 'retroarch.min.js') data.file.wasmjs = txt;
                    else if (fileName == 'extract7z.min.js') data.file.Core7z = txt;
                    else if (fileName == 'jszip.js') data.file.CoreZip = txt;
                    else if (fileName == 'libunrar.js') data.file.CoreRar = txt;
                    else if (fileName == 'NengeApp.class.min.js') data.file.CoreJS = txt;
                    else if (fileName == 'spark-md5.min.js') data.file.CoreMD5 = txt;
                    else if (t !== 'js') data.file.cfg[i] = txt;
                } else if (fileName == 'retroarch.wasm') {
                    data.file.wasmdata = u8;
                } else if (fileName == 'retroarch.js.mem') {
                    data.file.memdata = u8;
                } else if (fileName == 'libunrar.js.mem') {
                    data.file.CoreRarMem = u8;
                } else if (fileName == 'icon.png') {
                    data.img = u8;
                }
                result[i] = null;
            }
            data.time = new Date();
            result = null;
            let dbresult = await this.DB({method: 'put',data,db: 'info'});
            this.MSG('保存完毕');
            console.log(dbresult);
            this.installCore(data);
    }
    CheckFile(buf,name) {
        return new Promise((ok, erro) => {
            if(!buf || buf.length==0) return erro();
            let u8 = new Uint8Array(buf),
                FILE_HEAD = {
                    "504B0304":'unZip',
                    "52617221":'unRAR',
                    "377ABCAF":'un7z'
                },
                HEAD = FILE_HEAD[(Array.from(u8.subarray(0, 4)).map(item => {
                return (item < 16 ? '0' : '') + item.toString(16);
            })).join("").toUpperCase()];
            buf = null;
            if (HEAD) return this[HEAD](u8, name).then(result=>ok(result));
            else ok(u8,name);

        });
    }
    un7z(buf, name) {
        return new Promise((ok, erro) => {
        let w = new Worker(this.Core7z),
            F = {};
            w.onmessage = e => {
            if (e.data.data) {
                F[e.data.file] = e.data.data;
            } else if (e.data.t == 1) {
                ok(F);
            }
        };
        w.postMessage(buf);
    });
    }
    unZip(buf, name,cb) {
        return new Promise((ok, erro) => {
            let w = new Worker(this.CoreZip),
                F = {};
            w.onmessage = e => {
                ok(e.data);
            };
            w.postMessage(buf);
            buf = null;
            return F;

        });
    }
    unRAR(content,name,password) {
        name = name || 'test.rar';
        return new Promise((ok, erro) => {
            let w = new Worker(this.CoreRar),
                F = {};
            w.onmessage = e => {
                let ls = e.data.ls,
                    files = {};
                for (let i in ls) {
                    if (ls[i].type == 'dir') continue;
                    if (!ls[i].fileContent) continue;
                    files[ls[i].fullFileName] = ls[i].fileContent
                }
                ok(files);
                content = null;
                w.terminate();
            };
            w.onerror = e => {
                console.log(e.message);
                if (e.message == "Uncaught Missing password" || e.message=="Uncaught File CRC error") {
                    this.RESULT(this.ELM.RAR_HTML(e.message),true);
                    this.BtnMap['unrar'] = e => {
                        let elm = document.querySelector('.gba-rar-password');
                        if (!elm.value) return;
                        this.BtnMap['unrar'] = null;
                        this.BtnMap['closelist']();
                        w.postMessage({"data": [{name,content}],password:elm.value});
                    }
                    this.BtnMap['exitrar'] = e=>{
                        w.terminate();
                        this.BtnMap['closelist']();
                    };
                }else {
                    this.MSG(e.message||'rar发生未知错误,目前支持RAR4的解压!');
                    w.terminate();
                }
            };
            w.postMessage({"data": [{name,content}],password});
        });

    }
    get Record(){
        if(this._Record != undefined) return this._Record;
            let Mime;
            [
                'video/webm; codecs=h264',
                'video/webm; codecs=vp9',
                'video/webm; codecs=vp8',
                'video/webm; codecs=vp9.0',
                'video/webm; codecs=vp8.0',
                'video/webm; codecs=avc1',
            ].forEach(
            val=>{
                if(!Mime&&MediaRecorder.isTypeSupported(val))Mime = val;
            });
            if(!Mime){
                this._Record = false;
                return;
            }
            let recorder = new MediaRecorder(this.Module.canvas.captureStream(30), {'mimeType':Mime});
            if(!recorder || !recorder.stream){
                this._Record = false;
                return;
            }
            recorder.BLOBdata = [];
            recorder.ondataavailable = e=>{
                recorder.BLOBdata.push(e.data);
            };
            recorder.onstop = (e)=>{
                if(recorder.BLOBdata.length<1) return;
                this.download(recorder.BLOBdata,this.GetName('webm'),{'type':'video/webm'})
                recorder.BLOBdata = [];
            };
            this._Record = recorder;
            return this._Record;
    }
    setConfig(data) {
        if (data) {
            let config = localStorage.getItem('vba-next-config');
            config = config ? JSON.parse(config) : this.CONFIG;
            for (let j in data) {
                config[j] = data[j]
            }
            localStorage.setItem('vba-next-config', JSON.stringify(config));
            this.CONFIG = config;
        }
        return this.CONFIG;
    }
}
