(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : ((global = typeof globalThis !== "undefined" ? globalThis : global || self), factory((global)));
})(this, function (exports) {
    var T = Nenge,
        I = T.I,
        F = T.F,
        JSpath = document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    console.log(JSpath);
    T.DB_NAME = 'GBA-WASM';
    Object.assign(T.DB_STORE_MAP, {
        images: {
            system: false
        },
        rooms: {
            system: false
        },
        states: {
            GameName: false
        },
        saves: {
            timestamp: false
        },
        retroarch: {
            timestamp: false
        },
    });
    delete T.DB_STORE_MAP.myfile;

    function MyTable(table) {
        return T.getStore(T.DB_NAME).table(table);
    }

    function Download(name, buf) {
        return T.download(name, buf)
    }
    function ToArr(obj, fn) {
        return I.toArr(obj, fn);
    }
    function $(str, elm) {
        return T.$(str, elm);
    }

    function $$(str, elm) {
        return T.$$(str, elm);
    }
    var Imgages_URL = [];

    function ImageURL(data) {
        var url = F.URL(data, 'png');
        Imgages_URL.push(url);
        return url;
    }
    function clearImages() {
        Imgages_URL.forEach(entry => window.URL.revokeObjectURL(entry));
        Imgages_URL = [];
    }
    function GetName(name) {
        return F.getname(name);
    }
    function GetExt(name) {
        return F.getExt(name);
    }
    class emuModulle {
        //TOTAL_MEMORY: 0x10000000,
        //INITIAL_MEMORY:167772160,
        noInitialRun = !0x0;
        arguments = ['-v', '', 'c37f5e84f377fb892c851b364c55251132d57c66d2f3ea56d2af90bef14773f0'];
        preRun = [];
        postRun = [];
        totalDependencies = 0x0;
        SRM_PTR = undefined;
        SRM_LEN = 0x8000;
        /**
         * Module构造函数
         * @param {*} emu 
         * @constructor 
         */
        constructor(emu) {
            var { MountConfig, FSROOT, EXTREGX, corename,isPWA} = emu;
            emu.Module = this;
            Object.assign(this, {
                MountConfig,
                FSROOT,
                corename,
                EXTREGX,
                isPWA,
                canvas: emu.canvas || document.querySelector('canvas'),
                print: (e) => console.log(e),
                printErr: (e) => {
                    if (this.isLocal) console.warn(e);
                    if (/Video\s@\s\d+x\d+/i.test(e)) {
                        var wh = e.match(/Video\s@\s(\d+x\d+)/)[1].split('x').map(v => parseInt(v));
                        emu.wh = wh[0] / wh[1];
                        var h = emu.videoSize || 720;
                        var w = h * emu.wh;
                        document.documentElement.style.setProperty('--ch', 'calc(100vw * ' + wh[1] + ' / ' + wh[0] + ')');
                        document.documentElement.style.setProperty('--wh', 'calc(' + wh[0] + ' / ' + wh[1] + ')');
                        this.setCanvasSize(w, h);
                    } else if (!this.SRM_PTR) {
                        if (/00000000\s0000A000\sFFFF\w000\s00000000\s00008000/.test(e)) {
                            //gb gbc 
                            var ptr = e.match(/\[INFO\]\s+\d+\s+\w+\s+0x(\w+)/);
                            if (ptr && ptr[1]) {
                                this.SRM_PTR = parseInt(ptr[1], 16);
                                this.SRM_LEN = 0x8000;
                            }
                        } else if (/0E000000\sFFFF0000\s00000000\s00010000\sSRAM/.test(e)) {
                            //vbanext
                            var ptr = e.match(/\[INFO\]\s+\d+\s+\w+\s+0x(\w+)/);
                            if (ptr && ptr[1]) {
                                this.SRM_PTR = parseInt(ptr[1], 16);
                                this.SRM_LEN = 0x20000;
                            }

                        } else if (/00000000\s0E000000\sFFFE0000\s00000000\s00020000/.test(e)) {
                            //mgba
                            var ptr = e.match(/\[INFO\]\s+\d+\s+\w+\s+0x(\w+)/);
                            if (ptr && ptr[1]) {
                                this.SRM_PTR = parseInt(ptr[1], 16);
                                this.SRM_LEN = 0x20000;
                            }
                        }
                    }
                    /*
                    if(VBA.corename=='mgba'){
                        if(e=='[libretro INFO] GBA Savedata: Savedata synced'){
                            VBA.saveSRM();
                        }else if(e=='[libretro INFO] GB Memory: Savedata synced'){
                            clearTimeout(this.autosavetime);
                            this.autosavetime = setTimeout(()=>VBA.saveSRM(),3000);
                        }
                    }
                    */
                }
            });
            Object.defineProperty(exports, 'Module', { get: () => this });
        }
        isLocal = location.host=='127.0.0.1';
        async onRuntimeAsmJs(optData, progress) {
            if (this.isPWA) {
                var asmpath = JSpath + this.corename + '/retroarch.js';
                if(!this.isLocal){  
                    asmpath = JSpath + this.corename + '/retroarch.min.js?pack=getcore';                  
                    if (!navigator.serviceWorker.controller) {
                        T.action['pwa_activate'] = ()=>location.reload();
                        progress('serviceWorker 未完全加载!稍后替你刷新页面');
                        return;
                    }
                    Object.assign(T.action, {
                        getcore: async (data) => {
                            console.log(data);
                            var files = await T.FetchItem({
                                url: JSpath + this.corename + '/' + this.corename + '.zip',
                                unpack: !0,
                                progress
                            });
                            var CACHE = await caches.open('GBA-WASM');
                            await Promise.all(ToArr(files).map(entry=>{
                                var ext = GetExt(entry[0]);
                                var mime = "application/"+(ext=="js"?"javascript":"wasm");
                                var path = ext=='js'?asmpath:asmpath.replace(/(\.min)?\.js.+$/,'.wasm');
                                var file = new File([entry[1]],entry[0], { type: mime });
                                var reponse = new Response(file,{headers:{"Content-Type":file.type,"Content-Length":file.size},url:path,type:'basic'});
                                console.log(reponse);
                                return CACHE.put(path,reponse.clone());
                            }));
                            return !0;
                        }
                    });
                }
                await T.addJS(asmpath);
                //await T.addJS(JSpath + this.corename + '/retroarch.js?pack=getcore');
            } else {
                var files = await T.FetchItem({
                    url: JSpath + this.corename + '/' + this.corename + '.zip',
                    unpack: !0,
                    store: 'libjs',
                    progress
                });
                this.wasmBinary = files['retroarch.wasm'];
                await T.addJS(files['retroarch.min.js']);
                delete files['retroarch.wasm'];
                delete files['retroarch.min.js'];
            }
            if(typeof EmulatorJS_!='undefined'){
                EmulatorJS_(this);
                await this.ready;
                this.toWriteStart(optData);
                return !1;
            }
            progress('模拟器核心下载失败,请确保已经联网!下载过慢建议下载加速器加速任意外服游戏!');
            return !0;
        }
        async onRuntimeInitialized() {
            delete this.wasmBinary;
            if (this.specialHTMLTargets) {
                var canvas = this.canvas;
                var input = document.createElement('input');
                input.hidden = !0;
                canvas.parentNode.appendChild(input);
                Object.assign(this.specialHTMLTargets, {
                    '#canvas': canvas,
                    '#canvas-input': input,
                    '#canvas-mouse': this.canvas
                });
            }
        }
        async toWriteStart(optData) {
            var { MountConfig, FSROOT } = this;
            this.DISK = new NengeDisk(T.DB_NAME, MountConfig, this);
            await Promise.all(this.DISK.ready);
            this.mkdir(FSROOT.saves);
            this.writeFile('/etc/retroarch-core-options.cfg', optData);
            this.writeFile('/etc/retroarch.cfg',
                `savefile_directory = "${FSROOT.saves}"
savestate_directory = "${FSROOT.saves}"
system_directory = "${FSROOT.system}"
video_shader = "${FSROOT.shaderFile}"
cheat_database_path = "${FSROOT.cheat}"
screenshot_directory = "/"
video_vsync = true
video_shader_enable = true
video_font_enable = false
video_scale = 1.0
video_gpu_screenshot = false
camera_allow = "false"
camera_driver = "null"
camera_device = "null"
video_smooth = false
input_joypad_driver="xinput"
autosave_interval = "1"
fastforward_ratio = "5.0"
audio_latency = "256"`);

        }
        toReadPath(path, bool) {
            if (this.DISK) {
                return this.DISK.getLocalList(path, bool);
            }
        }
        toShaderText() {
            return this.toReadText(this.FSROOT.shaderFile)
        }
        toShaderSet(name) {
            if (name) {
                var data = this.toReadFile(this.FSROOT.shader + name + '.glslp');
                if (data) {
                    this.writeFile(this.FSROOT.shaderFile, data);
                }
            } else if (name == '') {
                return this.toShaderRemove();
            }
            this.toEnableShader(!0);
        }
        toShaderAdd(name, data) {
            this.writeFile(this.FSROOT.shader + name, data);
        }
        toShaderRemove() {
            this.writeFile(this.FSROOT.shaderFile, '#');
            this.toEnableShader(!1);
        }
        toShaderList() {
            return ToArr(this.toReadPath(this.FSROOT.shader)).filter(v => v && /\.glsl$/.test(v[0])).map(v => GetName(v[0]).replace(/\.glsl$/, ''));
        }
        toBiosAdd(name, data) {
            this.writeFile(this.FSROOT.system + name, data);
        }
        toReadText(name) {
            if (!this.isPath(name)) return '';
            return new TextDecoder().decode(this.toReadFile(name))
        }
        toReadFile(path) {
            if (!this.isPath(path)) return;
            return this.FS.readFile(path)
        }
        isPath(path) {
            return this.FS.analyzePath(path).exists;
        }
        mkdir(path) {
            let FS = this.FS;
            if (!this.isPath(path)) {
                let p = path.split('/');
                let name = p.pop();
                let newpath = p.join('/');
                this.mkdir(newpath);
                FS.createPath(newpath, name, !0x0, !0x0);
            }
        }
        unlink(path) {
            if (this.isPath(path)) {
                this.FS.unlink(path);
            }
        }
        writeFile(path, data) {
            let newpath = path.split('/').slice(0, -1).join('/');
            newpath && this.mkdir(newpath);
            this.FS.writeFile(path, data);
        }
        get stateValue() {
            return (this.cwrap('get_state_info', 'string', [])() || '').split('|').map(v => parseInt(v));
        }
        get GameName() {
            return this.arguments[1];
        }
        get GameFileName() {
            return this.GameName.replace(this.EXTREGX, '');
        }
        get stateBuffer() {
            var stateinfo = this.stateValue;
            return this.HEAPU8.slice(stateinfo[1], stateinfo[1] + stateinfo[0])

        }
        toReadScreenshot() {
            this.cwrap('cmd_take_screenshot', '', [])();
            var imagebuf = this.toReadFile('screenshot.png');
            this.unlink('screenshot.png');
            return imagebuf;

        }
        async toSaveState(name, fn) {
            var statebuf = this.stateBuffer;
            var GameName = this.GameName;
            var imagebuf = new Uint8Array(this.toReadScreenshot());
            var system = this.system;
            var timestamp = new Date;
            if (name && name.constructor === Number) {
                var keyname = `${this.corename}-${this.GameFileName}-${name}.state`;
                return new Promise(async re => {
                    await MyTable('states').put({
                        contents: new Uint8Array(statebuf),
                        images: imagebuf,
                        GameName,
                        pos: name,
                        system,
                        timestamp,
                    }, keyname);
                    MyTable('images').put({ contents: imagebuf, GameName, system, timestamp }, `${this.corename}-${this.GameFileName}-last.png`);
                    re(fn && fn(imagebuf));
                });

            } else {
                var keyname = `${this.corename}-${this.GameFileName}-state.png`;
                this.writeFile(this.FSROOT.saves + `/${this.GameFileName}.state`, statebuf);
                MyTable('images').put({ contents: imagebuf, GameName, system, timestamp }, keyname).then(fn);

            }
        }
        async toLoadState(name) {
            if (name) {
                if (name.constructor === Number) {
                    var keyname = `${this.corename}-${this.GameFileName}-${name}.state`;
                    var statebuf = await MyTable('states').getdata(keyname);
                    if (statebuf instanceof Uint8Array) {
                        this.writeFile('/game.state', statebuf);
                        this.cwrap('load_state', 'number', ['string', 'number'])('game.state', 0);
                        this.unlink('game.state');
                    }
                } else if (name instanceof Uint8Array) {
                    this.writeFile('/game.state', name);
                    this.cwrap('load_state', 'number', ['string', 'number'])('game.state', 0);
                    this.unlink('game.state');

                }
            } else {
                this.cwrap('cmd_load_state', 'string', [])();
            }
        }
        async toSaveSaves(fn) {
            var GameName = this.GameName;
            var system = this.system;
            this.cwrap('cmd_savefiles', 'string', [])();
            await MyTable('images').put({
                contents: this.toReadScreenshot(),
                timestamp: new Date,
                GameName,
                system
            }, `${this.corename}-${this.GameFileName}.png`);
            fn && fn();
        }
        toSaveSRM(data) {
            this.writeFile(this.FSROOT.saves + `/${this.GameFileName}.srm`, data);
        }
        toReadSRM() {
            return this.HEAPU8.slice(this.SRM_PTR, this.SRM_PTR + this.SRM_LEN);
        }
        toEventLoadSRM() {
            return this.cwrap('event_load_save_files', '', [])();
        }
        toggleFastForward(fn, num) {
            this.__fastForwardState = !this.__fastForwardState;
            this.cwrap('fast_forward', 'string', ['number'])(this.__fastForwardState ? (num || 1) : 0);
            fn && fn(this.__fastForwardState);
        }
        toReadCoreOption() {
            let options = this.cwrap('get_core_options', 'string', [])();
            if (options) {
                let list = options.split('\n');
                return Object.fromEntries(
                    list.filter(v => v.trim() != '').map(v => {
                        let s = v.split(';');
                        return [s[0], s[1] && s[1].trim().split('|').map(v => v.trim())];
                    }));
            }
        }
        toReadOption() {
            var options = this.toReadText('/etc/retroarch-core-options.cfg');
            var result = {};
            if (options) {
                options.split('\n').filter(v => v.trim() != '').map(opt => {
                    opt = opt.split('=').map(v => v.trim());
                    result[opt[0]] = opt[1].replace(/^"/, '').replace(/"$/, '');
                });
            }
            return result;
        }
        toEnableShader(bool) {
            return this.cwrap('shader_enable', 'null', ['number'])(bool ? 1 : 0);
        }
        get ButtonsInput() {
            return ["B", "Turbo B", "Select", "Start", "UP", "DOWN", "LEFT", "RIGHT", "A", "Turbo A", "L", "R"];
        }
        toRunButton(index, btnpost, state) {
            if (btnpost !== undefined && btnpost !== null && btnpost.constructor != Number) {
                if (isNaN(btnpost)) {
                    btnpost = this.ButtonsInput.indexOf(btnpost);
                } else {
                    btnpost = parseInt(btnpost);
                }
            }
            if (btnpost !== 0 && !btnpost) return;
            return this.cwrap('simulate_input', 'null', ['number', 'number', 'number'])(index, btnpost, state);
        }
        toClickButton(num) {
            this.toRunButton(0, num, 1);
            setTimeout(() => this.toRunButton(0, num, 0), 500);
        }
        toSetVariable(optkey, optvalue) {
            this.cwrap('set_variable', 'null', ['string', 'string'])(optkey, optvalue);
        }
        toEnableCheat(index, bool, cheat) {
            index = parseInt(index) || 0;
            return this.cwrap('set_cheat', 'string', ['number', 'number', 'string'])(index, bool, cheat);
        }
        toReadCheat() {
            var cheatText = this.toReadText(this.FSROOT.cheat + this.GameFileName + '.cht');
            var cheatObj = {};
            var cheatList = {};
            cheatText.split('\n').forEach(line => {
                var value = line.trim().split('=');
                if (value[0] && value[1]) {
                    cheatObj[value[0].trim()] = value[1].trim().replace(/^\s*?"(.+)"[\s\r]*?$/, '$1');
                }
            });
            if (cheatObj['cheats']) {
                var len = parseInt(cheatObj['cheats']);
                for (var i = 0; i < len; i++) {
                    var keyname = cheatObj['cheat' + i + '_desc'];
                    cheatList[keyname] = cheatObj['cheat' + i + '_code'].replace(/\s\s/g, '\n');
                }
            }
            console.log(cheatObj);
            return cheatList;
        }
        toSaveCheat(data) {
            var cht = '', lastkey = 0;
            var path = this.FSROOT.cheat + this.GameFileName + '.cht';
            ToArr(data, (value, key) => {
                lastkey = key + 1;
                var cheat = value[1].replace(/\n/g, '  ');
                cht += `cheat${key}_desc = "${value[0]}"\n`;
                cht += `cheat${key}_code = "${cheat}"\n`;
            });
            if (lastkey) {
                cht += `cheats="${lastkey}"`;
                this.writeFile(path, cht);
            } else {
                this.unlink(path)
            }
        }
        toResetCheat() {
            return this.cwrap('set_cheat', 'string', [])();
        }
        toSysReset() {
            return this.cwrap('system_restart', '', [])();
        }
        toStartGame(name, data) {
            if (name) {
                this.arguments[1] = name;
                if (data) {
                    this.writeFile(name, data);
                }
            }
            this.callMain(this.arguments);
            this.unlink(this.arguments[1]);
            var system = GetExt(this.arguments[1]);
            this.system = system == 'gba' ? 'gba' : 'gb';
            this.canvas.classList.add(this.system);
        }
        toAudioChange(fn) {
            if (this.RA) {
                this.RA.context.addEventListener('statechange', fn);
                return !0;
            }
        }
        toAudioResume(fn) {
            this.RA.context.resume().then(fn);
        }
        get NowTime() {
            if (this.timeMode) {
                if (this.timeMode.constructor === Number) {
                    return this.timeMode;
                } else {
                    var time = Date.now();
                    switch (this.timeMode) {
                        case 'ff14':
                            return time * 20.571428571428573;
                            break;
                        case 'sec':
                            return time * 60;
                            break;
                        case 'hour':
                            return time * 1200;
                            break;
                    }
                }
            }
            return Date.now();
        }

    }
    class gbawasm {
        isRunning = !1;
        videoSize = 720;
        DBKEY = 'gba-wasm-';
        EXTREGX = /\.(gba|gbc|gb)/i;
        MountConfig = {
            '/s': 'saves',
            '/u': 'retroarch',
        };
        FSROOT = {
            saves: '/s/',
            shader: '/u/shaders/',
            shaderFile: '/u/shaders/shaderenable.glslp',
            system: '/u/system/',
            cheat: '/u/cheats/',
        }
        corename = 'mgba';
        constructor() {
            if (!Node.prototype.once) {
                Object.assign(Node.prototype, {
                    on(evt, fn, opt, cap) {
                        return this.addEventListener(evt, fn, opt || { passive: false }, cap);
                    },
                    once(evt, fn, opt, cap) {
                        return this.addEventListener(evt, fn, Object.assign({
                            passive: !1,
                            once: !0,
                        }, opt), cap);
                    },
                    un(evt, fn, opt, cap) {
                        return this.removeEventListener(evt, fn, opt || { passive: false }, cap);
                    }
                });
            }
            if (document.readyState == 'complete') return T.welcome();
            document.addEventListener('DOMContentLoaded', e => {
                this.welcome();
            }, {
                passive: false,
                once: true
            });
        }
        welcome() {
            /**设置 数据库管理 */
            var VBA = this;
            if(this.isIPhone&&!this.isstandalone){
                $('.wel-index').innerHTML = '<p style="color:red">检测到你是苹果手机.<br>请点击状态栏的"更多"<br>下翻后的"添加到主屏幕".</p>';
                return;
            }
            $$('.wel-btn button[data-db]').forEach(elm => elm.on('click', async function (e) {
                var html = '';
                var table = this.dataset.db;
                ToArr(await MyTable(this.dataset.db).cursor('timestamp'), entry => {
                    var [key, time] = entry;
                    html += `<li data-key="${key}" data-table="${table}"><p class="db-key">${key}<button data-act="down">下载</button></p><p><button data-act="replace">替换</button>${time && time.toLocaleString() || ''}<button data-act="del">删除</button></p></li>`
                });
                $('.wel-result').innerHTML = `<ul class="wel-ul">${html}</ul>`;
            }));
            $('.wel-result').on('click', function (e) {
                var elm = e.target;
                var ElmData = elm && elm.dataset;
                if (ElmData) {
                    var liElm = elm.parentNode.parentNode;
                    var { key, table } = liElm.dataset;
                    var Store = MyTable(table);
                    switch (ElmData.act) {
                        case 'down':
                            Store.getdata(key).then(buf => Download(GetName(key), buf))
                            break;
                        case 'del':
                            Store.delete(key).then(r => liElm.remove());
                            if (table == 'saves') {
                                Store.delete(key).then(r => liElm.remove());
                            }
                            break;
                        case 'replace':
                            var yes = window.confirm('这是直接替换,不会自动解压,确定替换吗');
                            if (yes) {
                                VBA.upload(files => Store.get(key).then(async result => {
                                    result.contents = await I.U8(files[0]);
                                    Store.put(result, key).then(v => alert('替换成功' + v))
                                }));
                            }
                            break;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return !1;
                }
            });
            /**
             * 开始游戏
             */
            $('.wel-start-btn').on('click', async function (e) {
                $$('.wel-start-ready button').forEach(btn=>btn.disabled=!0);
                $('.wel-index').hidden = !0;
                $('.wel-start').hidden = !1;
                var gamelist = $('.wel-game-list');
                var CorePath;
                var STORE, images;
                switch (VBA.corename) {
                    case 'vbanext':
                        STORE = MyTable('rooms').index('system').cursor('timestamp', IDBKeyRange.only('gba'));
                        images = MyTable('images').index('system').cursor(undefined, IDBKeyRange.only('gba'));
                        CorePath = 'VBA Next/';
                        break;
                    case 'mgba':
                        STORE = MyTable('rooms').cursor('timestamp');
                        images = MyTable('images').cursor();
                        CorePath = 'mGBA/';
                        break;
                    case 'gb':
                        STORE = MyTable('rooms').index('system').cursor('timestamp', IDBKeyRange.only('gb'));
                        images = MyTable('images').index('system').cursor(undefined, IDBKeyRange.only('gb'));
                        CorePath = 'Gambatte/';
                        break;
                }
                VBA.FSROOT.saves += CorePath;
                VBA.FSROOT.cheat += CorePath;
                VBA.DBKEY += VBA.corename;
                VBA.OptionsData = JSON.parse(localStorage.getItem(VBA.DBKEY + '-core-options') || '{"gambatte_gb_colorization":"internal","mgba_sgb_borders":"OFF"}');
                var optData = Object.entries(VBA.OptionsData).map(optionItem => `${optionItem[0]} = "${optionItem[1] || ''}"`).join('\n');
                var Module = new emuModulle(VBA);
                var asmElm = document.createElement('div');
                gamelist.appendChild(asmElm);
                if(await Module.onRuntimeAsmJs(optData, a => asmElm.innerHTML = a)){
                    return;
                }
                asmElm.remove();
                images = await images;
                ToArr(await STORE, rooms => {
                    var [name, time] = rooms;
                    var imageshtml = '';
                    var sorttime = [time];
                    var li = document.createElement('li');
                    var roomsFileName = name.replace(VBA.EXTREGX, '');
                    ['', '-state', '-last'].forEach(v => {
                        var keyname = `${VBA.corename}-${roomsFileName}${v}.png`;
                        if (images[keyname]) {
                            var image_time = images[keyname].timestamp;
                            imageshtml += `<li><img src="${ImageURL(images[keyname].contents)}" style="width:100%;max-width:100%;"><p>${!v ? '电子存档' : v == '-state' ? '状态储存' : '最后状态'}|${image_time.toLocaleString()}</p></li>`;
                            sorttime.push(image_time);
                        }
                    });
                    if (imageshtml) imageshtml = `<ul class="wel-game-item">${imageshtml}</ul>`;
                    li.style.order = T.time - (sorttime.sort().pop()).getTime();
                    li.innerHTML += imageshtml;
                    var btn = document.createElement('button');
                    var p = document.createElement('p');
                    btn.innerHTML = name;
                    li.appendChild(btn);
                    p.innerHTML = time.toLocaleString();
                    li.appendChild(p);
                    btn.dataset.rungame = name;
                    btn.on('click', async function (e) {
                        var romsName = this.dataset.rungame;
                        MyTable('rooms').getdata(romsName).then(buffer => VBA.StartGame(romsName, buffer));
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    gamelist.appendChild(li);
                });
                images = null;
                STORE = null;
                $$('.wel-start-ready button').forEach(btn =>{
                    btn.disabled = !1;
                    btn.on('click', async function (e) {
                        var elmdo = this.dataset && this.dataset.do;
                        if (elmdo == 'shaders2'||elmdo == 'bios2') {
                            this.disabled = !0;
                            var div = document.createElement('div');
                            var gamelist = $('.wel-game-list');
                            if (gamelist.children.length) {
                                gamelist.insertBefore(div, gamelist.children[0])
                            } else {
                                gamelist.appendChild(div);
                            }
                            ToArr(await T.FetchItem({
                                url: JSpath + (elmdo == 'shaders2'?'shaders.zip':'gba.zip'),
                                unpack: !0,
                                progress(e) {
                                    div.innerHTML = e;
                                }
                            }), entry => {
                                if(elmdo == 'shaders2'){
                                    VBA.Module.toShaderAdd(GetName(entry[0]), entry[1]);
                                }else{
                                    VBA.Module.toBiosAdd(GetName(entry[0]), entry[1]);
                                }
                            });
                            div.remove();
                            return;
                        }
                        VBA.upload(files =>
                            ToArr(files).map(async file => {
                                var div = document.createElement('div');
                                var gamelist = $('.wel-game-list');
                                var filename = file.name;
                                if (gamelist.children.length) {
                                    gamelist.insertBefore(div, gamelist.children[0])
                                } else {
                                    gamelist.appendChild(div);
                                }
                                
                                    T.unFile(file, e => {
                                        div.innerHTML = e;
                                    }).then(buf => {
                                        div.remove();
                                        switch (elmdo) {
                                            case 'import':
                                                if (I.obj(buf)) {
                                                    ToArr(buf, uitem => VBA.WriteRooms(uitem[0], uitem[1], gamelist));
                                                } else {
                                                    VBA.WriteRooms(filename, buf, gamelist);
                                                }
                                                break;
                                            case 'shaders':
                                                if (I.obj(buf)) {
                                                    ToArr(buf, uitem => {
                                                        if (/\.(glsl|glslp)$/.test(uitem[0])) {
                                                            VBA.Module.toShaderAdd(GetName(uitem[0]), uitem[1]);
                                                        }
                                                    });
                                                } else {
                                                    if (/\.(glsl|glslp)$/.test(filename)) {
                                                        VBA.Module.toShaderAdd(GetName(filename), buf);
                                                    }
                                                }
                                                break;
                                            case 'bios':
                                                if (I.obj(buf)) {
                                                    ToArr(buf, uitem => {
                                                        if (/\.bin$/.test(uitem[0])) {
                                                            VBA.Module.toBiosAdd(GetName(uitem[0]), uitem[1]);
                                                        }
                                                    });
                                                } else {
                                                    if (/\.bin$/.test(filename)) {
                                                        VBA.Module.toBiosAdd(GetName(filename), buf);
                                                    }
                                                }
                                                break;
                                            default:
                                                if (I.obj(buf)) {
                                                    ToArr(buf, uitem => {
                                                        if (/\.bin$/.test(uitem[0])) {
                                                            VBA.Module.writeFile(GetName(uitem[0]), uitem[1]);
                                                        }
                                                    });
                                                } else {
                                                    if (/\.bin$/.test(filename)) {
                                                        VBA.Module.writeFile(GetName(filename), buf);
                                                    }
                                                }
                                                break;
                                        }
                                    });

                            })
                        );
                    })
            });

            });
            $$('.wel-core-mod button').forEach(elm => elm.on('click', function (e) {
                VBA.corename = this.dataset.mod;
                localStorage.setItem('gba_core_mod', VBA.corename);
                $$('.wel-core-mod button').forEach(ei => ei.classList.remove('active'))
                this.classList.add('active');
            })
            );
            this.corename = localStorage.getItem('gba_core_mod') || 'mgba';
            $('.wel-core-mod button[data-mod="' + this.corename + '"]').classList.add('active');

        }
        WriteRooms(romname, data, gamelist) {
            var VBA = this;
            var li = document.createElement('li');
            if (gamelist.children.length) {
                gamelist.insertBefore(li, gamelist.children[0])
            } else {
                gamelist.appendChild(li);
            }
            var romsName = GetName(romname);
            if ((this.EXTREGX).test(romsName) && data.byteLength > 0x10000) {
                var system = GetExt(romsName);
                system = system == 'gba' ? 'gba' : 'gb';
                MyTable('rooms').put({ contents: data, system, timestamp: new Date }, romsName);
                Module.writeFile(romsName, data);
                li.innerHTML = romsName + ' 已保存至数据库,点击运行';
                li.dataset.rungame = romsName;
                li.onclick = function () {
                    VBA.StartGame(this.dataset.rungame);
                }
            } else {
                li.innerHTML = romsName + ' 非GBA后缀跳过';

            }
        }
        StartGame(name, data) {
            clearImages();
            $('.welcome').remove();
            $('.gba-body').hidden = !1;
            $('.gba-ui').hidden = !1;
            this.Module.toStartGame(name, data);
            this.buttons = this.Module.ButtonsInput;
            this.isRunning = !0;
            this.setCoreOption();
            this.setShaderOption();
            this.setMenuEvent();
            this.setGamePadKEY();
            this.setTouchKey();
            return;
        }
        setCoreOption() {
            var VBA = this;
            var Module = this.Module;
            var coreElm = $('.gba-options-coreoptons');
            Object.entries(Module.toReadCoreOption() || {}).forEach(opt => {
                var [key, opts] = opt;
                var optkeyname = VBA.OptionsData[key];
                var btn = document.createElement('button');
                var keyname = key.replace(/[-\s]/, '_');
                btn.dataset.go = key;
                if (optkeyname == undefined) {
                    optkeyname = '未定义';
                } else if (optkeyname == '') {
                    optkeyname = '未启用';

                }
                btn.innerHTML = `<strong>${keyname}:</strong><span class="status">${optkeyname}</span>`;
                coreElm.appendChild(btn);
                var div = document.createElement('div');
                div.classList.add(`gba-options-${keyname}`);
                div.classList.add(`gba-options`);
                div.classList.add(`gba-flex-1`);
                div.hidden = !0;
                ToArr(opts, value => {
                    var optElem = document.createElement('button');
                    optElem.dataset.corename = key;
                    optElem.dataset.act = value || '';
                    optElem.innerHTML = value || '不启用';
                    optElem.on('pointerup', function (e) {
                        var { corename, act } = this.dataset;
                        VBA.OptionsData[corename] = act;
                        VBA.Module.toSetVariable(corename, act);
                        localStorage.setItem(VBA.DBKEY + '-core-options', JSON.stringify(VBA.OptionsData));
                        VBA.GO_STATUS(corename.replace(/[-\s]/, '_'), act || '不启用');
                        VBA.GO_MENU('coreoptons');
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    div.appendChild(optElem);
                });
                $('.gba-menu-win .gba-mask').appendChild(div);
            });
            this.GO_HomeEvent('coreoptons');
        }
        setShaderOption() {
            var VBA = this;
            var Module = this.Module;
            var shaders = Module.toShaderList();
            var shadersData = shaders || [];
            var resultElm = $('.gba-options-shaders');
            shadersData.splice(0, 0, '');
            shadersData.forEach(shader => {
                var btn = document.createElement('button');
                btn.dataset.act = shader;
                btn.innerHTML = T.GL(shader || '关闭滤镜');
                btn.on('pointerup', function (e) {
                    var act = this.dataset.act;
                    VBA.GO_STATUS('shaders', act || '未启用');
                    Module.toShaderSet(act);
                    VBA.GO_MENU('home');
                    VBA.GO_HIDDEN();
                    e.preventDefault();
                    e.stopPropagation();
                    return false;

                });
                resultElm.appendChild(btn);
            });
            var nowsharders = Module.toShaderText();
            if (nowsharders) {
                var mshaders = nowsharders.match(/shader\d+\s*=\s*"(\w+\.glsl)"/g);
                if (mshaders && mshaders[0]) {
                    var mshadersName = mshaders[0].match(/(\w+)\.glsl/)[1];
                    if (shaders.includes(mshadersName)) {
                        Module.toEnableShader(!0);
                        VBA.GO_STATUS('shaders', mshadersName);
                    }

                }
            }
            shadersData = null;
            shaders = null;
        }
        setMenuEvent() {
            var VBA = this;
            $$('.gba-menu-top button').forEach(elm => elm.on('pointerup', function (e) {
                return VBA.GO_MENU(this.dataset.go, e);
            }));
            VBA.GO_HomeEvent('home');
            VBA.GO_HomeEvent('base');
            VBA.GO_BUTTON('autosave', function (e) {
                var act = this.dataset.act;
                if (act == 'now') {
                    VBA.saveSRM();
                } else if (act == 'imports') {
                    VBA.upload(async files => {
                        VBA.Module.toSaveSRM(await I.U8(files[0]));
                        VBA.Module.toEventLoadSRM();
                        VBA.Module.toSysReset();

                    });
                } else if (act == 'exports') {
                    T.download(VBA.Module.GameFileName + '.srm', VBA.Module.toReadSRM());
                } else if (act == '0' || !act) {
                    clearInterval(VBA.Timer_autoSave);
                } else if (act) {
                    VBA.Timer_autoSave = setInterval(() => VBA.saveSRM(), act * 1000);
                }
                VBA.GO_HIDDEN();
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            VBA.GO_BUTTON('videosize', function (e) {
                var act = this.dataset.act;
                VBA.videoSize = parseInt(act);
                VBA.GO_STATUS('videosize', act + 'P');
                Module.setCanvasSize(VBA.videoSize * VBA.wh, VBA.videoSize);
                VBA.GO_MENU('base');
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            VBA.GO_BUTTON('time', function (e) {
                var act = this.dataset.act;
                if (act == 'thistime') {
                    var valueElm = $('.gba-options-time input[data-act="time"]');
                    var value = valueElm.value.replace(/[^0-9\:]/g, '').split(':').map((v, k) => {
                        v = v.padStart(2, '0');
                        if (k == 0 && v * 1 > 23) v = '23';
                        else if (k > 0 && v * 1 > 60) v = '59';
                        return v;
                    });
                    if (value.length < 3) {
                        for (var i = 0; i < 3 - value.length; i++) {
                            value.push('00');
                        }
                    }
                    value = value.join(':');
                    valueElm.value = value;
                    VBA.Module.timeMode = Date.parse(new Date().toString().replace(/\d+:\d+:\d+/, value));
                } else {
                    VBA.Module.timeMode = act || undefined;
                }
                VBA.GO_MENU('close');
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            VBA.GO_BUTTON('backupstate', function (e) {
                clearImages();
                var pos = parseInt(this.parentNode.dataset.pos);
                if (this.dataset.act == 'write') {
                    VBA.Module.toSaveState(pos, imagebuf => {
                        var stateimg = this.parentNode.nextElementSibling;
                        if ($('img', stateimg)) {
                            $('img', stateimg).src = ImageURL(imagebuf);
                            $('p', stateimg).innerHTML = new Date().toLocaleString();
                        } else {
                            stateimg.innerHTML = `<img src="${ImageURL(imagebuf)}"><p class="state-time">${new Date().toLocaleString()}</p>`;
                        }
                    });
                } else {
                    VBA.Module.toLoadState(pos).then(m => VBA.GO_HIDDEN());
                }
            });
            $(`.gba-options-backupstate`).on('menuopen', async function (e) {
                if (!this.dataset.ready) {
                    this.dataset.ready = !0;
                    var datas = await MyTable('states').index('GameName').cursor(null, IDBKeyRange.only(VBA.Module.GameName));
                    ToArr(datas, dataItem => {
                        var [name, { images, timestamp, pos }] = dataItem;
                        if (!pos) pos = name.replace(VBA.Module.GameName);
                        $(`.state-btn[data-pos="${pos}"]`, this).nextElementSibling.innerHTML = `<img src="${ImageURL(images)}"><p class="state-time">${timestamp.toLocaleString()}</p>`;
                    })
                }
            });
            function cheatButton(e) {
                var act = this.dataset.act;
                switch (act) {
                    case 'reset':
                        VBA.Module.toResetCheat();
                        break;
                    case 'add':
                        $('.gba-cheat-edit').hidden = !1;
                        $('.gba-cheat-list').hidden = !0;
                        break;
                    case 'open':
                        var { pos, keyname } = this.parentNode.dataset;
                        VBA.Module.toEnableCheat(pos, 1, VBA.cheats[keyname]);
                        VBA.GO_HIDDEN();
                        break;
                    case 'edit':
                        var { pos, keyname } = this.parentNode.dataset;
                        $('.gba-cheat-edit').hidden = !1;
                        $('.gba-cheat-list').hidden = !0;
                        $('.gba-cheat-edit input').value = keyname;
                        $('.gba-cheat-edit textarea').value = VBA.cheats[keyname];
                        Object.assign($('.gba-cheat-edit').dataset, { pos, keyname })
                        break;
                    case 'del':
                        var { pos, keyname } = this.parentNode.dataset;
                        delete VBA.cheats[keyname];
                        this.parentNode.remove();
                        VBA.Module.toSaveCheat(VBA.cheats);
                        break;
                    case 'submit':
                        var { pos, keyname } = $('.gba-cheat-edit').dataset;
                        var title = $('.gba-cheat-edit input').value;
                        if (!title) return;
                        var value = $('.gba-cheat-edit textarea').value;
                        if (!value) return;
                        if (keyname) {
                            if (keyname != title) {
                                delete VBA.cheats[keyname];
                                $('.gba-cheat-list li[data-pos="' + pos + '"] span').innerHTML = `#${pos} ${title}`;
                            } else {
                                cheatItem([title, value], $(`.gba-options-cheat`).dataset.len, $('.gba-cheat-list'));
                                $(`.gba-options-cheat`).dataset.len += 1;
                            }
                        }
                        keyname = title;
                        VBA.cheats[keyname] = value;
                        VBA.Module.toSaveCheat(VBA.cheats);
                        $('.gba-cheat-edit').hidden = !0;
                        $('.gba-cheat-list').hidden = !1;
                        $('.gba-cheat-edit input').value = '';
                        $('.gba-cheat-edit textarea').value = '';
                        $('.gba-cheat-edit').dataset.pos = '';
                        $('.gba-cheat-edit').dataset.keyname = '';
                        break;


                }
            }
            function cheatItem(value, key, result) {
                var div = document.createElement('li');
                div.dataset.pos = key;
                div.dataset.keyname = value[0];
                var span = document.createElement('span');
                span.innerHTML = '#' + key + ' ' + value[0];
                div.appendChild(span);
                var optbtn = document.createElement('button');
                var editbtn = document.createElement('button');
                var deletebtn = document.createElement('button');
                optbtn.innerHTML = '开启';
                editbtn.innerHTML = '编辑';
                deletebtn.innerHTML = '删除';
                optbtn.dataset.act = 'open';
                editbtn.dataset.act = 'edit';
                deletebtn.dataset.act = 'del';
                div.appendChild(optbtn);
                div.appendChild(editbtn);
                div.appendChild(deletebtn);
                result.appendChild(div);
            }
            VBA.GO_BUTTON('cheat', cheatButton);
            $(`.gba-options-cheat`).on('menuopen', async function (e) {
                $('.gba-cheat-edit').hidden = !0;
                $('.gba-cheat-list').hidden = !1;
                if (!this.dataset.ready) {
                    this.dataset.ready = !0;
                    VBA.cheats = VBA.Module.toReadCheat();
                    var cheatlist = ToArr(VBA.cheats);
                    cheatlist.forEach((value, key) => cheatItem(value, key, $('.gba-cheat-list')));
                    $$('.gba-cheat-list button').forEach(elm => elm.on('pointerup', cheatButton));
                    this.dataset.len = cheatlist.length;
                    $('.gba-cheat-edit textarea').on('click', async function (e) {
                        if (!this.value) {
                            this.value = await navigator.clipboard.readText();
                        }
                    });
                    $('.gba-cheat-edit textarea').on('blur', async function (e) {
                        this.value = this.value.replace(/[^0-9A-F\n\-\+\s\t]/g, '').trim();
                    });

                }
            });
            $$('.gba-mobile-menu button').forEach(elm => elm.on('pointerup', function (e) {
                var act = this.dataset.act;
                switch (act) {
                    case 'loadState':
                        VBA.loadState();
                        break;
                    case 'saveState':
                        VBA.saveState();
                        break;
                    case 'openmenu':
                        VBA.GO_MENU('home');
                        break;
                    case 'fastForward':
                        VBA.fastForward();
                        break;
                }
                e.preventDefault();
                e.stopPropagation();
                return false;
            }));
            $('.gba-mobie').on('touchstart', e => e.preventDefault());
            $('.gba-body').on('touchstart', e => e.preventDefault());
            document.documentElement.style.setProperty('--bh', VBA.Module.canvas.offsetHeight + 'px');
            window.addEventListener('resize', function (e) {
                VBA.Module.canvas.scrollIntoView();
                document.documentElement.style.setProperty('--bh', VBA.Module.canvas.offsetHeight + 'px');
            });
            var audioState = VBA.Module.toAudioChange(function (event) {
                if (event.target.state != 'running') {
                    VBA.Module.pauseMainLoop();
                    VBA.GO_MENU('audio');
                }
            });
            if (audioState) {
                VBA.GO_BUTTON('audio', function (e) {
                    VBA.Module.toAudioResume(function () {
                        VBA.GO_MENU('close');
                        VBA.Module.resumeMainLoop();
                    });
                });
            }
        }
        setGamePadKEY() {
            var VBA = this;
            var { buttons, Module } = this;
            var ctrlElm = {};
            var ElmCtrlData = ToArr($('.gba-ctrl-data').children);
            ElmCtrlData.shift();
            ElmCtrlData.forEach(elm => {
                var elmlist = elm.children;
                var elmkey = elmlist[0].textContent.trim();
                var num = buttons.indexOf(elmkey);
                ctrlElm[elmkey] = [elmlist[1], elmlist[2]];
                if (num >= 0) ctrlElm[elmkey][2] = num;
            });
            var ctrlbase = {};
            var dbkey = VBA.DBKEY + '-ctrl';
            var ctrlset = localStorage.getItem(dbkey) || {};
            if (ctrlset && I.str(ctrlset)) {
                ctrlset = JSON.parse(ctrlset);
            }
            ToArr(ctrlElm, entry => {
                var [id, [keyelm, padelm]] = entry;
                ctrlbase[id] = [keyelm.value, padelm.value];
                if (!ctrlset[id]) ctrlset[id] = [keyelm.value, padelm.value];
                else {
                    keyelm.value = ctrlset[id][0] || '';
                    padelm.value = ctrlset[id][1] || '';
                }
                keyelm.on('keydown', e => {
                    var haveelm = ToArr(ctrlElm).filter(v => v[1][0].value == e.code)[0];
                    if (haveelm) {
                        haveelm[1][0].classList.add('ctrl-have');
                        setTimeout(() => haveelm[1][0].classList.remove('ctrl-have'), 600);
                    } else {
                        keyelm.value = e.code;
                        ctrlset[id][0] = keyelm.value;
                        localStorage.setItem(dbkey, JSON.stringify(ctrlset));
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                keyelm.on('keyup', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                keyelm.disabled = !1;
            });
            $('.ctrl-reset').on('click', e => {
                Object.assign(ctrlset, ctrlbase);
                localStorage.setItem(dbkey, JSON.stringify(ctrlset));
                ToArr(ctrlElm, elmItem => {
                    var [keyelm, padelm, num] = elmItem[1];
                    keyelm.value = ctrlset[elmItem[0]][0];
                    padelm.value = ctrlset[elmItem[0]][1];
                });

            });
            var KeyFunction = e => {
                var elm = e.target;
                if (elm instanceof HTMLInputElement) return;
                if (elm instanceof HTMLTextAreaElement) return;
                if (elm instanceof HTMLSelectElement) return;
                var code = e.code;
                ToArr(ctrlset, ctrlItem => {
                    if (ctrlItem[1][0] == code) {
                        var num = ctrlElm[ctrlItem[0]][2];
                        if (num >= 0) {
                            Module.toRunButton(0, num, e.type === 'keydown' ? 1 : 0);
                        } else if (e.type === 'keyup') {
                            if (ctrlItem[0] == 'loadState') {
                                VBA.loadState();
                            } else if (ctrlItem[0] == 'saveState') {
                                VBA.saveState();
                            } else if (ctrlItem[0] == 'fastForward') {
                                VBA.fastForward();
                            }
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                });
            };
            window.addEventListener('keydown', e => KeyFunction(e));
            window.addEventListener('keyup', e => KeyFunction(e));
            window.addEventListener("gamepadconnected", e => {
                console.log("连接手柄", e.gamepad.id);
                $('.gamepad_connect').innerHTML = e.id;
                var GAMEPAD = new Gamepad();
                var { TICK, BUTTON_DOWN } = Gamepad.Event;
                GAMEPAD.PadFunction = e => {
                    var key = e.control;
                    var gamepad = e.gamepad;
                    var value = gamepad.state[key] === 1;
                    if (value) {
                        if (key == ctrlset['saveState'][1]) {
                            if (VBA.IsOnState) return alert('存档保存中');
                            VBA.saveState()
                        } else if (key == ctrlset['loadState'][1]) {
                            VBA.loadState()
                        } else if (key == ctrlset['fastForward'][1]) {
                            VBA.fastForward();
                        }
                    };
                }
                GAMEPAD.bind(TICK, e => {
                    var newState = [];
                    e.forEach(gamepad => {
                        var lastState = gamepad.lastState;
                        ToArr(ctrlset, entry => {
                            var gamepadkey = lastState[entry[1][1]];
                            if (gamepadkey) {
                                var num = ctrlElm[entry[0]][2];
                                if (I.num(num)) {
                                    newState.push(ctrlElm[entry[0]][2]);
                                }
                            }
                        });
                        var Y = lastState['LEFT_STICK_Y'];
                        var X = lastState['LEFT_STICK_X'];
                        if (Y < -0.4) {
                            newState.push(4);
                        } else if (Y > 0.4) {
                            newState.push(5);
                        }
                        if (X < -0.4) {
                            newState.push(6);
                        } else if (X > 0.4) {
                            newState.push(7);
                        }

                    });
                    if (newState != gamepadState.join(',')) {
                        gamepadState.forEach(v => {
                            if (!newState.includes(v)) {
                                Module.toRunButton(0, v, 0);
                            }
                        });
                        newState.forEach(v => Module.toRunButton(0, v, 1));
                        gamepadState = newState;
                    }
                });
                GAMEPAD.bind(BUTTON_DOWN, PadFunction);
                ToArr(ctrlElm, ElmItem => {
                    var padelm = ElmItem[1][1];
                    padelm.on('keydown', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    padelm.on('keyup', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    padelm.on('click', function (e) {
                        GAMEPAD.listeners[BUTTON_DOWN][0] = e => {
                            this.value = e.control;
                            ctrlset[id][1] = e.control;
                            localStorage.setItem(dbkey, JSON.stringify(ctrlset));
                        };
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    padelm.on('focusout', function (e) {
                        GAMEPAD.listeners[BUTTON_DOWN][0] = GAMEPAD.PadFunction;
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    padelm.disabled = !1;
                });
                GAMEPAD.init();
                this.GAMEPAD = GAMEPAD;
            });
            window.addEventListener('gamepaddisconnected', e => {
                console.log("断开手柄", e.gamepad.id);
                $('.gamepad_connect').innerHTML = '未连接';
            });

        }
        setTouchKey() {
            var { buttons, Module } = this;
            var gamepad = nipplejs.create({
                zone: $('.gamepad-left-dp'),
                'mode': 'static',
                'position': {
                    'left': '50%',
                    'top': '50%'
                },
                'color': 'red'
            });
            $('.gamepad-left').on('contextmenu', e => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            var gamepadState = [];
            var arrow = [buttons.indexOf('UP'), buttons.indexOf('DOWN'), buttons.indexOf('LEFT'), buttons.indexOf('RIGHT')];
            gamepad.on('end', e => {
                gamepadState.forEach(v => Module.toRunButton(0, v, 0));
                gamepadState = [];
            });
            gamepad.on('move', (event, detail) => {
                var newState = [];
                if (detail.vector.x > 0.5) {
                    newState.push(arrow[3]);
                } else if (detail.vector.x < -0.5) {
                    newState.push(arrow[2]);
                }
                if (detail.vector.y > 0.5) {
                    newState.push(arrow[0]);
                } else if (detail.vector.y < -0.5) {
                    newState.push(arrow[1]);
                }
                if (newState != gamepadState.join(',')) {
                    gamepadState.forEach(v => {
                        if (!newState.includes(v)) {
                            Module.toRunButton(0, v, 0);
                        }
                    });
                    newState.forEach(v => Module.toRunButton(0, v, 1));
                    gamepadState = newState;
                }
            });
            $$('.gba-mobile-ctrl .gamepad-btn').forEach(elm => {
                var value = elm.innerHTML.trim();
                var num = buttons.indexOf(value);
                if (num >= 0) {
                    ['pointerdown', 'pointerup', 'pointerleave', 'pointerover'].forEach(
                        evt => elm.on(evt, function (e) {
                            var bool = 0;
                            if (['pointerdown', 'pointerover'].includes(e.type)) bool = 1;
                            Module.toRunButton(0, num, bool);
                            e.preventDefault();
                            e.stopPropagation();
                            return false;

                        })
                    );
                }
            });
            if (!T.mobile) {
                $('button[data-act="pad"]').click();
            }
        }
        GO_HomeEvent(name) {
            var VBA = this;
            VBA.GO_BUTTON(name, function (e) {
                var data = this.dataset;
                if (data) {
                    if (data.act) {
                        switch (data.act) {
                            case 'pad':
                                var mctrl = $('.gba-mobile-ctrl');
                                mctrl.hidden = !mctrl.hidden;
                                VBA.GO_STATUS(data.go, mctrl.hidden ? '隐藏' : '显示');
                                VBA.GO_MENU('base');
                                break;
                            case 'reload':
                                location.reload();
                                break;
                            case 'restart':
                                VBA.Module.toSysReset();
                                VBA.GO_MENU('base');
                                break;
                            case 'fastForward':
                                VBA.fastForward();
                                VBA.GO_MENU('base');
                                break;
                        }
                        VBA.GO_HIDDEN();
                    } else if (data.go) {
                        return VBA.GO_MENU(data.go);
                    };
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
        }
        GO_HIDDEN() {
            $('.gba-menu-win').hidden = !0;
            this.Module.canvas.scrollIntoView()
        }
        GO_STATUS(name, act) {
            $(`.gba-menu-win button[data-go="${name}"] .status`).innerHTML = act
        }
        GO_BUTTON(name, fn) {
            $$(`.gba-options-${name} button`).forEach(elm => elm.on('click', fn));
        }
        GO_MENU(name, e) {
            if (name == 'close') {
                this.GO_MENU('home');
                this.GO_HIDDEN();
            } else {
                var elmwin = $('.gba-menu-win');
                elmwin.hidden = !1;
                $$('.gba-options', elmwin).forEach(elm => {
                    elm.hidden = !0;
                });
                if (name != 'home') {
                    $('.gba-menu-win-gohome').hidden = !1;
                } else {
                    $('.gba-menu-win-gohome').hidden = !0;
                }
                $('.gba-options-' + name).hidden = !1;
                $('.gba-options-' + name).dispatchEvent(new CustomEvent('menuopen', {}));
            }
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
        upload(fn) {
            var input = document.createElement('input');
            input.type = 'file';
            input.onchange = e => {
                e.target.files.length && fn && fn(e.target.files);
                input.remove();
            }
            input.click();
        }
        saveState(name) {
            if (!this.isRunning) return;
            if (this.IsOnState) return;
            this.IsOnState = !0;
            $('.gba-mobile-saveState').classList['add']('active');
            this.Module.toSaveState(name, e => {
                $('.gba-mobile-saveState').classList['remove']('active');
                this.IsOnState = !1;
            });
        }
        async loadState(name) {
            if (this.IsOnState) return;
            this.IsOnState = !0;
            $('.gba-mobile-loadState').classList['remove']('active');
            await this.Module.toLoadState(name);
            $('.gba-mobile-loadState').classList['remove']('active');
            this.IsOnState = !1;

        }
        fastForward() {
            this.Module.toggleFastForward(bool => {
                $('.gba-mobile-fastForward').classList[bool ? 'add' : 'remove']('active');
            });
        }
        saveSRM() {
            if (!this.isRunning) return;
            this.Module.toSaveSaves(e => {
                console.log('电子存档');
            });
        }
        getCheat() {
            var data = this.Module.toReadText
        }

    }
    var platform = navigator.userAgentData&&navigator.userAgentData.platform||navigator.platform;
    var isIPhone = platform=='iPhone';
    var isPWA = !1;
    var isstandalone = navigator.standalone;
    if(isstandalone&&isIPhone||!isIPhone){
        if(navigator.serviceWorker){
            isPWA = !0;
            T.openServiceWorker('sw.js');
        }
    }
    Object.assign(gbawasm.prototype,{
        isIPhone,
        isstandalone,
        isPWA
    });
    exports.EMU = new gbawasm();
    indexedDB.databases().then(list => {
        list.forEach(async v => {
            if (v.name == 'NengeNet_VBA-Next') {
                var ok = confirm('发现旧数据,是否转换到VBANEXT核心??');
                if (ok) {
                    var store = T.getStore('NengeNet_VBA-Next');
                    var rooms = await store.table('ROOMS').cursor();
                    await Promise.all(ToArr(rooms).map(async entry => {
                        return MyTable('rooms').put({
                            contents: entry[1].gba,
                            system: 'gba',
                            timestamp: new Date()
                        }, entry[0]);
                    }));
                    var images = await store.table('INFO').cursor();
                    await Promise.all(ToArr(images).map(async entry => {
                        if (entry[1].img) {
                            var gamename = entry[0].replace(/\.gba$/i, '');
                            await MyTable('images').put({
                                contents: entry[1].img,
                                GameName: entry[0],
                                system: 'gba',
                                timestamp: new Date()
                            }, 'vbanext-' + gamename + '-last.png');
                        }
                    }));
                    var states = await store.table('STATE').cursor();
                    await Promise.all(ToArr(states).map(async entry => {
                        var gamename = entry[0].replace(/\.gba$/i, '');
                        for (var i = 0; i < 10; i++) {
                            if (entry[1]['state' + i]) {
                                var pos = i + 1;
                                await MyTable('states').put({
                                    contents: entry[1]['state' + i],
                                    images: entry[1]['stateimg' + i] || new Uint8Array(0),
                                    pos,
                                    GameName: entry[0],
                                    system: 'gba',
                                    timestamp: new Date()
                                }, 'vbanext-' + gamename + '-' + pos + '.state');
                                if (!entry[1]['state' + pos]) break;
                            } else {
                                break;
                            }
                        }
                    }));
                    setTimeout(() => {
                        var ok2 = confirm('转换完成,是否删除?不可恢复!');
                        if (ok2) {
                            store.clear();
                        }
                    }, 2000);
                } else {
                    setTimeout(() => {
                        var ok3 = confirm('是否不保留,直接删除?');
                        if (ok3) {
                            T.getStore('NengeNet_VBA-Next').clear();
                        }
                    }, 2000);
                }
            }
        });
    })
});