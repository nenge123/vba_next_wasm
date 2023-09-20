(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : ((global = typeof globalThis !== "undefined" ? globalThis : global || self), factory((global)));
})(this, function (exports) {
    var T = Nenge,
        I = T.I,
        F = T.F,
        JSpath = document.currentScript.src.split('/').slice(0, -1).join('/') + '/',
        isLocal = location.host == '127.0.0.1';
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
    /**
     * Module类
     * @constructor
     */
    class emuModulle {
        /**
         * TOTAL_MEMORY/INITIAL_MEMORY 定义内存最大值
         */
        /*TOTAL_MEMORY: 0x10000000,*/
        /*INITIAL_MEMORY:167772160,*/
        /**
         * 定义wasm Module
         * @module emuModulle/callMain 不自动执行
         */
        noInitialRun = !0x0;
        /**
         * 启动参数
         */
        arguments = ['-v', '', 'c37f5e84f377fb892c851b364c55251132d57c66d2f3ea56d2af90bef14773f0'];
        /**
         * 破解原emulatorjs的时间验证码
         * 修改retroarch.js:function _gettimeofday(ptr)
         * var now = Module.HashTime||Date.now;
         */
        HashTime = 1690674045574;
        /**
         * 某些通讯使用
         */
        preRun = [];
        /**
         * 某些通讯使用
         */
        postRun = [];
        /**
         * 某些前置配置
         */
        totalDependencies = 0x0;
        /**
         *@property {Number} 电子存档地址位置
         */
        SRM_PTR = 0;
        /**
         * 电子存档长度
         */
        SRM_LEN = 0x8000;
        /**
         * 是否启用PWA缓存
         */
        isPWA = !1;
        /**
         * 载入对象
         * @param {Object} emu 
         */
        constructor(emu,progress) {
            var { MountConfig, FSROOT, EXTREGX, corename, isPWA} = emu;
            emu.Module = this;
            FSROOT.etc = '/etc/';
            Object.assign(this, {
                MountConfig,
                FSROOT,
                corename,
                EXTREGX,
                isPWA,
                isRuntimeInitialized:new Promise(re=>{
                    /**
                     * WASM加载完毕
                     */
                    this._isRuntimeInitialized = re;
                }),
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
            progress = progress||function(e){console.log(e);};
            this.readyASM =  this.onRuntimeAsmJs(progress);
        }
        /**
         * 是否本地环境
         */
        isLocal = location.host == '127.0.0.1';
        /**
         * 加载并初始化WASM
         * @module emuModulle/onRuntimeAsmJs
         * @param {json} optData 核心选项
         * @param {function} progress 进度函数
         * @returns {boolean} 是否异常
         */
        async onRuntimeAsmJs(progress) {
            if (this.isPWA) {
                await this.onRuntimeWorker(progress);
                //await T.addJS(JSpath + this.corename + '/retroarch.js?pack=getcore');
            } else {
                await this.onRuntimeLoadDB(progress);
            }
            /**
             * @namespace exports
             * @property {function} exports.EmulatorJS_ - fff
             * exports/EmulatorJS_ WASM启动JS载入
             */
            if (exports.EmulatorJS_&&exports.EmulatorJS_.constructor===Function) {
                exports.EmulatorJS_(this);
                await this.ready;
                this.toWriteStart();
                this._isRuntimeInitialized(!1);
                return !1;
            }
            this._isRuntimeInitialized(!0);
        }
        /**
         * PWA虚假地址加载 本地跳过
         * @param {function} progress 进度函数
         */
        async onRuntimeWorker(progress) {
            /**
             * 部署虚假地址
             */
            var asmJS = JSpath + this.corename + '/retroarch.js';
            if (!this.isLocal) {
                asmJS = JSpath + this.corename + '/retroarch.min.js?pack=getcore';
            }
            await T.addJS(asmJS);
        }
        /**
         * 读取indexedDB或者解压下载核心压缩包
         * @param {function} progress 
         */
        async onRuntimeLoadDB(progress) {
            var files = await T.FetchItem({
                url: JSpath + this.corename + '/' + this.corename + '.zip',
                unpack: !0,
                store: 'libjs',
                progress,
                unpackText:'解压:',
                downText:'下载:'
            });
            this.wasmBinary = files['retroarch.wasm'];
            await T.addJS(files['retroarch.min.js']);
            delete files['retroarch.wasm'];
            delete files['retroarch.min.js'];
        }
        /**
         * WASM加载完毕,初始化虚拟硬盘挂载,写入核心选项
         * @param {json} optData 核心选项
         */
        async toWriteStart() {
            var { MountConfig, FSROOT } = this;
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
            if(MountConfig){
                this.DISK = new NengeDisk(T.DB_NAME, MountConfig, this);
                await Promise.all(this.DISK.ready);
            }
            var optData = Object.entries(VBA.OptionsData).map(optionItem => `${optionItem[0]} = "${optionItem[1] || ''}"`).join('\n');
            this.mkdir(FSROOT.saves);
            this.writeFile(FSROOT.etc+'retroarch-core-options.cfg', optData);
            this.writeFile(FSROOT.etc+'retroarch.cfg',
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
        /**
         * 目录文件列表
         * @param {String} path 目录
         * @param {Boolean} bool 过滤非文件
         * @returns {JSON} 
         */
        toReadPath(path, bool) {
            if (this.DISK) {
                return this.DISK.getLocalList(path, bool);
            }
        }
        /**
         * 获取滤镜启用文件
         * @returns {String}
         */
        toShaderText() {
            return this.toReadText(this.FSROOT.shaderFile)
        }
        /**
         * 设置/移除滤镜
         * @param {String} name 
         * @returns 
         */
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
        /**
         * 写入滤镜文件
         * @param {String} name 
         * @param {Uint8Array|String} data 
         */
        toShaderAdd(name, data) {
            this.writeFile(this.FSROOT.shader + name, data);
        }
        /**
         * 移除并关闭滤镜
         */
        toShaderRemove() {
            this.writeFile(this.FSROOT.shaderFile, '#');
            this.toEnableShader(!1);
        }
        /**
         * 扫描滤镜列表
         * @returns {Array}
         */
        toShaderList() {
            return ToArr(this.toReadPath(this.FSROOT.shader)).filter(v => v && /\.glsl$/.test(v[0])).map(v => GetName(v[0]).replace(/\.glsl$/, ''));
        }
        /**
         * 写入固件
         * @param {String} name 
         * @param {Uint8Array} data 
         */
        toBiosAdd(name, data) {
            this.writeFile(this.FSROOT.system + name, data);
        }
        /**
         * 读取虚拟硬盘里面的文本
         * @param {String} name 
         * @returns {String}
         */
        toReadText(name) {
            if (!this.isPath(name)) return '';
            return new TextDecoder().decode(this.toReadFile(name))
        }
        /**
         * 读取虚拟硬盘里面的文件
         * @param {String} path 
         * @returns {Uint8Array}
         */
        toReadFile(path) {
            if (!this.isPath(path)) return;
            return this.FS.readFile(path)
        }
        /**
         * 判断文件/目录是否存在
         * @param {String} path 
         * @returns {Boolean}
         */
        isPath(path) {
            return this.FS.analyzePath(path).exists;
        }
        /**
         * 创建目录
         * @param {String} path 
         */
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
        /**
         * 删除文件
         * @param {String} path 
         */
        unlink(path) {
            if (this.isPath(path)) {
                this.FS.unlink(path);
            }
        }
        /**
         * 往虚拟硬盘写入文件
         * @param {String} path 
         * @param {Uint8Array|String} data 
         */
        writeFile(path, data) {
            let newpath = path.split('/').slice(0, -1).join('/');
            newpath && this.mkdir(newpath);
            this.FS.writeFile(path, data);
        }
        /**
         * 获取当前即时状态地址信息
         */
        get stateValue() {
            return (this.cwrap('get_state_info', 'string', [])() || '').split('|').map(v => parseInt(v));
        }
        /**
         * 获取截图数据
         * @returns {Uint8Array}
         */
        toReadScreenshot() {
            this.cwrap('cmd_take_screenshot', '', [])();
            var imagebuf = this.toReadFile('screenshot.png');
            this.unlink('screenshot.png');
            return imagebuf;

        }
        /**
         * 保存即时状态
         * @param {Number} name 状态位置
         * @param {function|undefined} fn 回调函数
         */
        async toSaveState(name, fn) {
            var statebuf = this.stateBuffer;
            var GameName = this.GameName;
            var imagebuf = new Uint8Array(this.toReadScreenshot());
            var system = this.system;
            var timestamp = new Date;
            if (name && name.constructor === Number) {
                var keyname = `${this.corename}-${this.RoomName}-${name}.state`;
                await MyTable('states').put({
                    contents: new Uint8Array(statebuf),
                    images: imagebuf,
                    GameName,
                    pos: name,
                    system,
                    timestamp,
                }, keyname);
                await MyTable('images').put({ contents: imagebuf, GameName, system, timestamp }, `${this.corename}-${this.RoomName}-last.png`);
                fn && fn(imagebuf);

            } else {
                var keyname = `${this.corename}-${this.RoomName}-state.png`;
                this.writeFile(this.FSROOT.saves + `/${this.RoomName}.state`, statebuf);
                MyTable('images').put({ contents: imagebuf, GameName, system, timestamp }, keyname).then(fn);

            }
        }
        /**
         * 读取即时状态
         * @param {Number} name 
         */
        async toLoadState(name,statebuf) {
            if (statebuf||name && name.constructor === Number) {
                if(!statebuf){
                    var keyname = `${this.corename}-${this.RoomName}-${name}.state`;
                    var statebuf = await MyTable('states').getdata(keyname);
                }
                if (statebuf instanceof Uint8Array) {
                    this.writeFile('/game.state', statebuf);
                    this.cwrap('load_state', 'number', ['string', 'number'])('game.state', 0);
                    this.unlink('game.state');
                }
            } else {
                this.cwrap('cmd_load_state', 'string', [])();
            }
        }
        /**
         * 保存电子存档
         * @param {function} fn 回调函数 
         */
        async toSaveSaves(fn) {
            var GameName = this.GameName;
            var system = this.system;
            this.cwrap('cmd_savefiles', 'string', [])();
            await MyTable('images').put({
                contents: this.toReadScreenshot(),
                timestamp: new Date,
                GameName,
                system
            }, `${this.corename}-${this.RoomName}.png`);
            fn && fn();
        }
        /**
         * 写入电子存档
         * @param {Uint8Array} data 
         */
        toSaveSRM(data) {
            this.writeFile(this.FSROOT.saves + `/${this.RoomName}.srm`, data);
        }
        /**
         * 写入存档
         * @param {*} name 
         * @param {*} data 
         */
        toWriteSaves(name,data){
            this.writeFile(this.FSROOT.saves + `/${name}`, data);

        }
        /**
         * 根据电子存档地址读取电子存档
         * @returns {Uint8Array}
         */
        toReadSRM() {
            return this.HEAPU8.slice(this.SRM_PTR, this.SRM_PTR + this.SRM_LEN);
        }
        /**
         * 载入电子存档到内存
         */
        toEventLoadSRM() {
            this.cwrap('event_load_save_files', '', [])();
        }
        /**
         * 启用加速一倍
         * @param {function} fn(Boolean) 回调函数
         * @param {Number} num 加速倍率?
         */
        toggleFastForward(fn, num) {
            this.__fastForwardState = !this.__fastForwardState;
            this.cwrap('fast_forward', 'string', ['number'])(this.__fastForwardState ? (num || 3) : 0);
            fn && fn(this.__fastForwardState);
        }
        /**
         * 读取模拟器核心选项
         * @returns {JSON}
         */
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
        /**
         * 读取配置文件的核心选项
         * @returns 
         */
        toReadOption() {
            var options = this.toReadText(this.FSROOT.etc+'retroarch-core-options.cfg');
            var result = {};
            if (options) {
                options.split('\n').filter(v => v.trim() != '').map(opt => {
                    opt = opt.split('=').map(v => v.trim());
                    result[opt[0]] = opt[1].replace(/^"/, '').replace(/"$/, '');
                });
            }
            return result;
        }
        /**
         * 开启或者关闭滤镜
         * @param {Boolean} bool 
         * @returns 
         */
        toEnableShader(bool) {
            this.cwrap('shader_enable', 'null', ['number'])(bool ? 1 : 0);
        }
        /**
         * 发送按键状态
         * @param {Number} index 玩家序列
         * @param {Number} btnpost 按键序列
         * @param {Number} state 1是/0否 按下
         */
        toRunButton(index, btnpost, state) {
            if (btnpost !== undefined && btnpost !== null && btnpost.constructor != Number) {
                if (isNaN(btnpost)) {
                    btnpost = this.ButtonsInput.indexOf(btnpost);
                } else {
                    btnpost = parseInt(btnpost);
                }
            }
            if (btnpost !== 0 && !btnpost) return;
            this.cwrap('simulate_input', 'null', ['number', 'number', 'number'])(index, btnpost, state);
        }
        /**
         * 模拟一次按键点击
         * @param {Number} num 
         */
        toClickButton(num) {
            this.toRunButton(0, num, 1);
            setTimeout(() => this.toRunButton(0, num, 0), 500);
        }
        /**
         * 设置核心选项
         */
        toSetVariable(optkey, optvalue) {
            this.cwrap('set_variable', 'null', ['string', 'string'])(optkey, optvalue);
        }
        /**
         * 启用一个金手指
         * @param {*} index 金手指序列
         * @param {*} bool 是否开启
         * @param {*} cheat 金手指代码
         */
        toEnableCheat(index, bool, cheat) {
            index = parseInt(index) || 0;
            this.cwrap('set_cheat', 'string', ['number', 'number', 'string'])(index, bool, cheat);
        }
        /**
         * 读取金手指代码
         * @returns {JSON} key->value
         */
        toReadCheat() {
            var cheatText = this.toReadText(this.FSROOT.cheat + this.RoomName + '.cht');
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
        /**
         * 保存修改的金手指
         * @param {JSON} data 
         */
        toSaveCheat(data) {
            var cht = '', lastkey = 0;
            var path = this.FSROOT.cheat + this.RoomName + '.cht';
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
        /**
         * 重置金手指
         */
        toResetCheat() {
            this.cwrap('set_cheat', 'string', [])();
        }
        /**
         * 重启模拟器
         */
        toSysReset() {
            this.cwrap('system_restart', '', [])();
        }
        /**
         * 运行游戏
         * @param {String|null} name 
         * @param {Uint8Array|null} data 
         */
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
        /**
         * 绑定音频变化事件 可有效防止手机出现卡顿异常
         * @param {function} fn 绑定事件函数
         * @returns 
         */
        toAudioChange(fn) {
            if (this.RA) {
                this.RA.context.addEventListener('statechange', fn);
                return !0;
            }
        }
        /**
         * 恢复音频
         * @param {function} fn 回调函数
         */
        toAudioResume(fn) {
            this.RA.context.resume().then(fn);
        }
        /**
         * 模拟器按键映射配置
         */
        get ButtonsInput() {
            return ["B", "Turbo B", "Select", "Start", "UP", "DOWN", "LEFT", "RIGHT", "A", "Turbo A", "L", "R"];
        }
        /**
         * 获取当前Rooms文件名
         */
         get GameName() {
            return this.arguments[1];
        }
        /**
         * 获取当前Rooms名,不含文件文件后缀
         */
        get RoomName() {
            return this.GameName.replace(this.EXTREGX, '');
        }
        /**
         * 获取当前即时状态Uint8Array
         */
        get stateBuffer() {
            var stateinfo = this.stateValue;
            return this.HEAPU8.slice(stateinfo[1], stateinfo[1] + stateinfo[0])

        }
        /**
         * 自定义时间
         * 需要修改retroarch.js: function _time(ptr) {
         *  var ret = (Module.NowTime||Date.now()) / 1e3 | 0;
         */
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
    /**
     * Module引导类
     */
    class gbawasm {
        /**
         * 是否已经运行
         */
        isRunning = !1;
        /**
         * 视频输出画布高 分辨率高度
         */
        videoSize = 720;
        /**
         * 数据键前缀
         */
        DBKEY = 'gba-wasm-';
        /**
         * 判断rooms正则
         */
        EXTREGX = /\.(gba|gbc|gb)/i;
        /**
         * 虚拟硬盘挂载数据库配置
         */
        MountConfig = {
            '/s': 'saves',
            '/u': 'retroarch',
        };
        /**
         * 虚拟硬盘配置路径
         */
        FSROOT = {
            saves: '/s/',
            shader: '/u/shaders/',
            shaderFile: '/u/shaders/shaderenable.glslp',
            system: '/u/system/',
            cheat: '/u/cheats/',
        }
        /**
         * 模拟器核心名
         */
        corename = 'mgba';
        /**
         * 初始化
         * @returns 
         */
        constructor() {
            if(this.isIPhone){
                this.videoSize = 480;
                this.GO_STATUS('videosize','480P');
                //$('canvas').classList.add('iphone');
            }
            if (document.readyState == 'complete') return T.welcome();
            document.addEventListener('DOMContentLoaded', e => {
                this.welcome();
            }, {
                passive: false,
                once: true
            });
        }
        /**
         * 欢迎页面事件处理
         * @returns 
         */
        async welcome() {
            /**设置 数据库管理 */
            var VBA = this;
            $('.wel-index').hidden = !1;
            if (this.isIPhone && !this.isstandalone) {
                /**
                 * 阻止苹果手机浏览器
                 */
                $('.wel-index').classList.add('state-tips');
                $('.wel-index').style.color = '#e1ff00';
                $('.wel-index').innerHTML = '检测到你是苹果手机.<br>请点击状态栏的"更多"<br>下翻后的"添加到主屏幕".';
                return;
            }
            if (VBA.isPWA) {
                if (!navigator.serviceWorker.controller) {
                    $('.wel-index').classList.add('state-tips');
                    $('.wel-index').innerHTML = 'serviceWorker 未完全加载!<br>稍后替你刷新页面!<br>核心下载过慢可以打开手游加速器,毕竟Github服务器在国内容易大姨妈';  
                    setTimeout(e=>location.reload(),5000);
                    return;
                }
            }
            /**
             * 数据库管理事件
             */
            $$('.wel-btn button[data-db]').forEach(elm => elm.on('click', async function (e) {
                var html = '';
                var table = this.dataset.db;
                ToArr(await MyTable(this.dataset.db).cursor('timestamp'), entry => {
                    var [key, time] = entry;
                    html += `<li data-key="${key}" data-table="${table}"><p class="db-key">${key}<button data-act="down">下载</button></p><p><button data-act="replace">替换</button>${time && time.toLocaleString() || ''}<button data-act="del">删除</button></p></li>`
                });
                $('.wel-result').innerHTML = `<ul class="wel-ul">${html}</ul>`;
            }));
            /**
             * 数据库内容处理事件
             */
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
             * 运行游戏前置配置事件
             */
            $('.wel-start-btn').on('click', async function (e) {
                $('.wel-index').hidden = !0;
                $('.wel-start').hidden = !1;
                $('.wel-start-ready').hidden = !0;
                $('.wel-start-tips').hidden = !0;
                var progressElm = document.createElement('div');
                var gamelist = $('.wel-game-list');
                var CorePath;
                var STORE, images;
                progressElm.innerHTML = '请稍等!';
                progressElm.classList.add('download-progress');
                progressElm.style.cssText='color: #3643e9;font-size: 1rem;font-weight: bold;text-shadow: 2px 2px 3px #8b7b7b;';
                gamelist.appendChild(progressElm);
                /**
                 * 根据核心配置基础信息
                 */
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
                /**
                 * 读取已保存的模拟器核心选项设置
                 */
                VBA.OptionsData = JSON.parse(localStorage.getItem(VBA.DBKEY + '-core-options') || '{"gambatte_gb_colorization":"internal","mgba_sgb_borders":"OFF"}');
                /**
                 * 加载模拟器Module类
                 */
                var Module = new emuModulle(VBA,TXT => progressElm.innerHTML = TXT);
                if(await Module.isRuntimeInitialized){
                    progressElm.innerHTML = '模拟器核心下载失败,请确保已经联网!下载过慢建议下载加速器加速任意外服游戏!';
                    return;
                }
                progressElm.remove();
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
                $('.wel-start-ready').hidden = !1;
                $('.wel-start-tips').hidden = !1;
                $$('.wel-start-ready button').forEach(btn => {
                    btn.on('click', async function (e) {
                        var elmdo = this.dataset && this.dataset.do;
                        if (elmdo == 'shaders2' || elmdo == 'bios2') {
                            this.disabled = !0;
                            var div = document.createElement('div');
                            var gamelist = $('.wel-game-list');
                            if (gamelist.children.length) {
                                gamelist.insertBefore(div, gamelist.children[0])
                            } else {
                                gamelist.appendChild(div);
                            }
                            ToArr(await T.FetchItem({
                                url: JSpath + (elmdo == 'shaders2' ? 'shaders.zip' : 'gba.zip'),
                                unpack: !0,
                                progress(e) {
                                    div.innerHTML = e;
                                },
                                unpackText:'解压:',
                                downText:'下载:'
                            }), entry => {
                                if (elmdo == 'shaders2') {
                                    VBA.Module.toShaderAdd(GetName(entry[0]), entry[1]);
                                } else {
                                    VBA.Module.toBiosAdd(GetName(entry[0]), entry[1]);
                                }
                            });
                            this.remove();
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

                                T.unFile(file, (current,total,name) => {
                                    div.innerHTML = (name||file.name)+I.PER(current,total);
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
        WriteRooms(name, data, gamelist) {
            var VBA = this;
            var li = document.createElement('li');
            if (gamelist.children.length) {
                gamelist.insertBefore(li, gamelist.children[0])
            } else {
                gamelist.appendChild(li);
            }
            var romsName = GetName(name);
            if (VBA.EXTREGX.test(romsName) && data.byteLength > 0x10000) {
                var system = GetExt(romsName);
                system = system == 'gba' ? 'gba' : 'gb';
                MyTable('rooms').put({ contents: data, system, timestamp: new Date }, romsName);
                Module.writeFile(romsName, data);
                li.innerHTML = romsName + ' 已保存至数据库,点击运行';
                li.dataset.rungame = romsName;
                li.onclick = function () {
                    VBA.StartGame(this.dataset.rungame);
                }
            }else if(/\.srm$/i.test(romsName)&&data.byteLength > 0x8000){
                VBA.Module.toWriteSaves(romsName,data)
            } else if(/\.state$/i.test(romsName)&&data.byteLength > 0x8000){
                VBA.Module.toWriteSaves(romsName,data)
            } else {
                li.innerHTML = romsName + ' 非GBA后缀跳过';

            }
        }
        StartGame(name, data) {
            clearImages();
            $('.welcome').remove();
            $('.gba-body').hidden = !1;
            this.Module.toStartGame(name, data);
            this.buttons = this.Module.ButtonsInput;
            this.isRunning = !0;
            this.setCoreOption();
            this.setShaderOption();
            this.setMenuEvent();
            setTimeout(()=>{
                $('.gba-ui').hidden = !1;
                this.setGamePadKEY();
                this.setTouchKey();
            },500);
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
                    T.download(VBA.Module.RoomName + '.srm', VBA.Module.toReadSRM());
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
                if(this.dataset.act=='import'){
                    VBA.upload(async files=>{
                        var u8 = await  T.unFile(files[0],(a,b,c)=>this.innerHTML=`${c}(${a}/${b})`);
                        if(I.obj(u8)){
                            ToArr(u8,entry=>{
                                if(/\.state$/.test(entry[0])){
                                    VBA.Module.toLoadState(1,entry[1]);
                                }
                            });
                        }else{
                            VBA.Module.toLoadState(1,u8);
                        }
                        this.innerHTML = '导入存档';
                        VBA.GO_HIDDEN();
                    });
                }else if (this.dataset.act == 'write') {
                    VBA.Module.toSaveState(pos, imagebuf => {
                        var stateimg = this.parentNode.nextElementSibling;
                        if ($('img', stateimg)) {
                            $('img', stateimg).src = ImageURL(imagebuf);
                            $('p', stateimg).innerHTML = new Date().toLocaleString();
                        } else {
                            stateimg.innerHTML = `<img src="${ImageURL(imagebuf)}"><p class="state-time">${new Date().toLocaleString()}</p>`;
                        }
                        VBA.GO_HIDDEN();
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
                        VBA.GO_MENU();
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
            var portrait = window.matchMedia("(orientation: portrait)").matches;
            document.documentElement.style.setProperty('--bh', (portrait ? VBA.Module.canvas.offsetHeight : VBA.Module.canvas.offsetHeight / VBA.wh) + 'px');
            var audioState = VBA.Module.toAudioChange(function (event) {
                console.log(event);
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
                    } else if(e.code){
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
                if(!code) return;
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
            if(document.ontouchstart===undefined){
                $('.gba-mobile-ctrl').hidden = !0;
                $('.gba-options-base button[data-act="pad"]').hidden = !0;
                $('.gba-options-base button[data-act="arrow"]').hidden = !0;
                return ;
            }
            $('.gba-mobile-ctrl').hidden = !1;
            var { buttons, Module } = this;
            var gamepadState = [];
            var arrow = [buttons.indexOf('UP'), buttons.indexOf('DOWN'), buttons.indexOf('LEFT'), buttons.indexOf('RIGHT')];
            var gamepad = nipplejs.create({
                zone: $('.gamepad-left-dp'),
                'mode': 'static',
                'position': {
                    'left': '50%',
                    'top': '50%'
                },
                restJoystick:!0,
                color: '#0057b3c2',
            });
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
            $('.gamepad-left').on('contextmenu', e => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            $$('.gba-mobile-ctrl .gamepad-btn').forEach(elm => {
                var value = elm.dataset.act||elm.innerHTML.trim();
                var num = buttons.indexOf(value);
                elm.dataset.keyname = value;
                if (num >= 0) {
                    elm.dataset.keynum = num;
                }
            });
            var touchList = {};
            function getKeyValue(elm){
                return (elm instanceof Element)&&elm.dataset&&parseInt(elm.dataset.keynum);
            }
            function touchEvent(e){
                var newlist=[];
                var arrowlist = touchList[this.dataset.id]||[];
                if (e.type == 'touchstart') {
                    var keynum = getKeyValue(e.target);
                    if(keynum!=undefined){
                        newlist.push(keynum);
                    }
                } else if (e.touches) {
                    if (e.touches.length) {
                        newlist = ToArr(e.touches).map(entry => getKeyValue(document.elementFromPoint(entry.pageX, entry.pageY)))||[];
                    }
                }
                newlist = newlist.filter(v=>v!=undefined&&!isNaN(v));
                if (newlist != arrowlist.join(',')) {
                    arrowlist.forEach(v => {
                        if (!newlist.includes(v)) {
                            Module.toRunButton(0, v, 0);
                            $('.gamepad-btn[data-keynum="'+v+'"]').classList.remove('active');
                        }
                    });
                    newlist.forEach(v => {
                        Module.toRunButton(0, v, 1);
                        $('.gamepad-btn[data-keynum="'+v+'"]').classList.add('active');
                    });
                    touchList[this.dataset.id] = newlist;
                }
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            $('.gamepad-left-arrow').dataset.id = 'arrow';
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(v=>$('.gamepad-left-arrow').on(v,touchEvent));
            $('.gamepad-right').dataset.id = 'ab';
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(v=>$('.gamepad-right').on(v,touchEvent));
            $('.gamepad-bottom').dataset.id = 'ss';
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(v=>$('.gamepad-bottom').on(v,touchEvent));
            $('.gamepad-top').dataset.id = 'lr';
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(v=>$('.gamepad-top').on(v,touchEvent));
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
                                case 'arrow':
                                    var mctrl = $('.gba-mobile-ctrl');
                                    var html = VBA.GO_STATUS(data.go);
                                    var bool = html=='十字键';
                                    VBA.GO_STATUS(data.go, bool?'摇杆':'十字键');
                                    if(bool){
                                        $('.gamepad-left-arrow').style.visibility = 'hidden';
                                        $('.gamepad-left-dp').style.visibility = '';
                                    }else{
                                        $('.gamepad-left-arrow').style.visibility = '';
                                        $('.gamepad-left-dp').style.visibility = 'hidden';
                                    }
                                    VBA.GO_HIDDEN;
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
            var elm = $(`.gba-menu-win button[data-go="${name}"] .status`);
            if(act)elm.innerHTML = act;
            else return elm.innerHTML;
        }
        GO_BUTTON(name, fn) {
            $$(`.gba-options-${name} button`).forEach(elm => elm.on('click', fn));
        }
        GO_MENU(name, e) {
            if(name == 'hidden'){
                this.GO_HIDDEN();
            }else if (name == 'close') {
                this.GO_MENU('home');
                this.GO_HIDDEN();
            } else {
                var elmwin = $('.gba-menu-win');
                var elmOpen;
                elmwin.hidden = !1;
                $$('.gba-options', elmwin).forEach(elm => {
                    if(name)elm.hidden = !0;
                    else if(!elm.hidden)elmOpen = elm;
                });
                if(!name&&!elmOpen) name='home';
                if (name != 'home') {
                    $('.gba-menu-win-gohome').hidden = !1;
                } else {
                    $('.gba-menu-win-gohome').hidden = !0;
                }
                if(name){
                    $('.gba-options-' + name).hidden = !1;
                    $('.gba-options-' + name).toEvent('menuopen',{});
                }else{
                    elmOpen.toEvent('menuopen',{});
                }
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
        saveState() {
            if (!this.isRunning) return;
            if (this.IsOnState) return;
            this.IsOnState = !0;
            $('.gba-mobile-saveState').classList['add']('active');
            this.Module.toSaveState(0, e => {
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
    var platform = navigator.userAgentData && navigator.userAgentData.platform || navigator.platform;
    var isIPhone = platform == 'iPhone';
    var isPWA = !1;
    var isstandalone = navigator.standalone;
    if (isstandalone && isIPhone || !isIPhone) {
        if (navigator.serviceWorker) {
            Object.assign(T.action,{
                /**
                 * 回调函数 表示PWA已经激活
                 * @returns 
                 */
                pwa_activate(d){
                    console.log(d);
                    setTimeout(e=>location.reload(),1000);
                },
                pwa_error(d){
                    console.log(d);
                },
                pwa_updatefound(d){
                    console.log(d);
                },
                pwa_statechange(d){
                    console.log(d);
                },
                /**
                 * PWA回调函数 pack=getcore
                 * @param {json} data worker消息
                 * @returns {boolean}
                 */
                async getcore(data){
                    var {url} = data;
                    var Module = VBA.Module;
                    var files = await T.FetchItem({
                        url: JSpath + Module.corename + '/' + Module.corename + '.zip',
                        unpack: !0,
                        progress:(e)=>{
                            if(isLocal)console.log(e);
                            $('.download-progress').innerHTML = e;
                        },
                        unpackText:'解压:',
                        downText:'下载:'
                    });
                    var CACHE = await caches.open('GBA-WASM');
                    var filename = GetName(url);
                    await Promise.all(ToArr(files).map(entry => {
                        var ext = GetExt(entry[0]);
                        var mime = "application/" + (ext == "js" ? "javascript" : "wasm");
                        var path = ext == 'js' ? url : url.replace(/(\.min)?\.js.+$/, '.wasm');
                        var file = new File([entry[1]], entry[0], { type: mime });
                        var reponse = new Response(
                            file,
                            {
                                headers: {
                                    "Content-Type": file.type, "Content-Length": file.size,
                                    'Date': new Date().toGMTString()
                                }
                            });
                        return CACHE.put(path, reponse);
                    }));
                    return !0;
                }
            });
            isPWA = !0;
            T.openServiceWorker('sw.js');
        }
    }
    Object.assign(gbawasm.prototype, {
        isIPhone,
        isstandalone,
        isPWA
    });
    var VBA  = new gbawasm();
    exports.VBA = VBA;
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