/**
 * @name Module
 */
new class {
    TOTAL_MEMORY = 0x10000000;
    noInitialRun = !0;
    SRM_POS = 658768;
    SRM_LEN = 131072;
    SRM_XLEN = 139264;
    ROOM_POS = 6647264;
    STATE_POST = 8787512;
    CanvasWidth = 600;
    CanvasHeight = 400;
    arguments = [];
    preRun = [];
    postRun = [];
    print = e => console.log(e);
    printErr = e => console.log(e);
    totalDependencies = 0;
    monitorRunDependencies = e => console.log("屏幕初始化");
    onRuntimeInitialized = e => console.log("就绪!加载游戏!");
    preMainLoop = e => {};
    constructor(N) {
        N.Module = this;
    }
}(NengeApp)
/**
 * @name KEY
 */
new class {
    constructor(N) {
        this.Module = N.Module;
        N.KEY = this;
        for (let i in this.KeyMap) {
            if (i == 'length') continue;
            let key = this.KeyMap[i].toLowerCase();
            this._NumToKey[i] = key;
            this._NumState[i] = 0;
            this._KeyToNum[key] = i;
        }
        if (N.CONFIG['KeyCode']) this._KeyCode = N.CONFIG['KeyCode'];
        else this.resetKeyBoard();
    }
    _NumToKey = {};
    _KeyToNum = {};
    _NumState = {};
    SetState(obj) {
        for (let keyNum in this._NumState) {
            if (obj[keyNum]) {
                this._NumState[keyNum] = 1;
                this.sendState(keyNum, 1);
            } else if (this._NumState[keyNum] != 0) {
                this._NumState[keyNum] = 0;
                this.sendState(keyNum, 0);
            }
        }
        obj = null;
    }
    clearState() {
        for (var i in this._NumState) this._NumState[i] = 0;
        return {};
    }
    SendKey(key, bool) {
        key = this._KeyToNum[key.toLowerCase()];
        if (key != undefined) this.SetState(key, bool);
    }
    sendState(key, bool) {
        this.Module['cwrap']('simulate_input', 'null', ['number', 'number', 'number'])(0, key, bool)
    }
    get(key) {
        return this._KeyToNum[key.toLowerCase()];
    }
    resetKeyBoard() {
        let arr = this.Keyboard;
        this._KeyCode = {};
        for (let i = 0; i < arr.length; i++) {
            let keycode = this.Keyboard[i];
            this._KeyCode[keycode] = this._KeyToNum[this.KeyboardIndex[i % 10]];

        }
        return this._KeyCode;
    }
    KeyCodetoArr() {
        let arr = Array(20);
        for (var i in this._KeyCode) {
            let num = this._KeyCode[i],
                key = this._NumToKey[num],
                index = this.KeyboardIndex.indexOf(key);
            if (!arr[index]) arr[index] = i;
            else arr[index + 10] = i;
        }
        return arr;
    }
    ELMsetKeyBoard() {
        let _KeyCode = {};
        document.querySelectorAll('[data-key-index]').forEach(elm => {
            let index = elm.getAttribute('data-key-index');
            _KeyCode[elm.value] = this._KeyToNum[this.KeyboardIndex[Number(index) % 10]];;
        });
        this._KeyCode = _KeyCode;
        return _KeyCode;
    }
    Keyboard = [
        "Numpad2",
        "Numpad1",
        "Numpad0",
        "NumpadDecimal",
        "ArrowRight",
        "ArrowLeft",
        "ArrowUp",
        "ArrowDown",
        "Numpad6",
        "Numpad3",
        "KeyU",
        "KeyY",
        "KeyH",
        "KeyJ",
        "KeyD",
        "KeyA",
        "KeyW",
        "KeyS",
        "KeyT",
        "KeyI",
    ];
    KeyboardIndex = ["a", "b", "select", "start", "right", "left", 'up', 'down', 'r', 'l'];
    KeyGamePad = {
        0: 8, //※ A
        1: 0, //● B
        2: 2, //■ selete
        3: 3, //▲ start
        4: '加速', //L1 LB =>L
        5: '切换', //R1 RB =>R
        6: "即读", //L2 LT 加速
        7: "即存", //R2 RT 重启
        8: null, //SHARE
        9: null, //OPTION
        10: null, //L L3
        11: null, //R R3
        12: 4, //上
        13: 5, //下
        14: 6, //左
        15: 7, //右
        16: null, //PS键
        17: null, //触摸板按下
    };
    KeyGamePadMap = {
        0: '✘:A', //※ A
        1: '◉:B', //● B
        2: '▢:X', //■ selete
        3: '△:Y', //▲ start
        4: 'L1:LB', //L1 LB =>L
        5: 'R1:RB', //R1 RB =>R
        6: "L2:LT", //L2 LT 加速
        7: "R2:RT", //R2 RT 重启
        8:'SHARE:截屏' , //SHARE
        9: 'OPTION', //OPTION
        10: 'L3:L摇杆', //L L3
        11: 'R3:R摇杆', //R R3
        12: 'UP', //上
        13: 'DOWN', //下
        14: 'LEFT', //左
        15: 'RIGHT', //右
        16: 'PS', //PS键
        17: '触摸板', //触摸板按下
    };
    KeyMap = {
        0: 'B',
        1: 'Y',
        2: 'SELECT',
        3: 'START',
        4: 'UP',
        5: 'DOWN',
        6: 'LEFT',
        7: 'RIGHT',
        8: 'A',
        9: 'X',
        10: 'L',
        11: 'R',
        12: 'L2',
        13: 'R2',
        14: 'L3',
        15: 'R3',
        19: 'L STICK UP',
        18: 'L STICK DOWN',
        17: 'L STICK LEFT',
        16: 'L STICK RIGHT',
        23: 'R STICK UP',
        22: 'R STICK DOWN',
        21: 'R STICK LEFT',
        20: 'R STICK RIGHT',
        'length': 21
    };
}(NengeApp);
/**
 * @name ELM
 */
new class {
    constructor(N) {
        N.ELM = this;
        this.config = e => N.CONFIG[e];
        if(this.config('do-hideui')){
            document.querySelector('.gba-ctrl').classList.add('hideui');
        }
    }
    BAIDU_HTML(translate) {
        return `<div class="gba-translate-set"><h3>翻译API 目前使用百度</h3><p>申请地址:<a href="https://api.fanyi.baidu.com/product/22">https://api.fanyi.baidu.com/product/22</a></p><p>申请成功后点击<a href="https://api.fanyi.baidu.com/manage/developer">开发者信息</a></p>` +
            `<p><label>APPID:<input type="text" class="gba-translate-id" tabindex="1" value="${translate.id||''}"></label></p>` +
            `<p><label>密 钥：<input type="text" class="gba-translate-key" tabindex="2" value="${translate.key||''}"></label></p>` +
            `<p><label>来 源：<input type="text" class="gba-translate-from" tabindex="3" value="${translate.from||'auto'}"></label></p>` +
            `<p><label>目 标：<input type="text" class="gba-translate-to" tabindex="4" value="${translate.to||'zh'}"></label></p>` +
            `<p><label>跨域：<input type="text" class="gba-translate-host" tabindex="5" value="${translate.host||'https://api.nenge.net/translateBaidu.php'}"></label><br>https://api.nenge.net/translateBaidu.php</p><p><label><button data-btn="translate-save">保存</button></p><p>跨域服务器由能哥网自由服务提供（使用期限不确定！），如果有服务器资源的朋友，可以自己搭建下方是PHP代码！百度翻译月免费1万次，多出部分四毛钱一次！</p>` +
            `<h3>translateBaidu.php</h3><textarea><?php\nheader("Access-Control-Allow-Origin:*"); \nheader("Content-type: text/html; charset=utf-8");\nerror_reporting(E_ALL & ~E_NOTICE);\nclass NengeApp{\n    function __construct(){\n        $this->API = array(\n            "baidu" => array (\n                "txt"=>"https://fanyi-api.baidu.com/api/trans/vip/translate?",\n                "img"=>"https://fanyi-api.baidu.com/api/trans/sdk/picture?"\n            )\n        );\n        $this->getRequest(empty($_GET["q"])&&isset($_FILES["image"]) ? "POST":"GET","baidu");\n    }\n    function getRequest($method="GET",$sitename,$timeout = 20){\n        $isGET = $method=="GET" ;\n        $query =$_SERVER["QUERY_STRING"];\n        $url = $this->API[$sitename][$isGET?"txt":"img"];\n        $ssl = parse_url($url)["scheme"] == "https" ? false : null;\n        $bodyDate = array();\n        foreach($_POST as $k=>$v){\n            $bodyDate[$k] = $v;\n        }\n        foreach($_FILES as $k=>$v){\n            $bodyDate[$k] = new CURLFile($v["tmp_name"],$v["type"],$v["name"]);//"@".$v["tmp_name"].";type=".$v["type"].";filename=".$v["name"];\n        }\n        $curlObj = curl_init();\n        $options = [\n            CURLOPT_URL => $url.$query,\n            CURLOPT_RETURNTRANSFER => 1,\n            CURLOPT_FOLLOWLOCATION => 1,\n            CURLOPT_AUTOREFERER => 1,\n            CURLOPT_USERAGENT => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",\n            CURLOPT_TIMEOUT => $timeout,\n            //CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_0,\n            //请求头\n            CURLOPT_HTTPHEADER => array(\n                "User-Agent"      => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) baidu-music/1.2.1 Chrome/66.0.3359.181 Electron/3.0.5 Safari/537.36",\n                "Accept"          => "*/*",\n                //"text/html;charset=UTF-8",\n                "Content-type"    => "application/json;charset=UTF-8",\n                "Accept-Language" => "zh-CN",\n            ),\n            //IP4\n            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,\n            //CURLOPT_REFERER => isset($api["refer"])?$api["refer"]:$url_info["host"], //伪造来路\n            //CURLOPT_COOKIEFILE=>dirname(__FILE__)."/kugou.cookies.txt",\n            //CURLOPT_COOKIEJAR=>dirname(__FILE__)."/kugou.cookies.txt",\n            CURLOPT_POST=>$isGET ?false:true,\n            CURLOPT_POSTFIELDS => $isGET? null:$bodyDate,\n            CURLOPT_SSL_VERIFYHOST => $ssl,\n            CURLOPT_SSL_VERIFYPEER => $ssl,\n            CURLOPT_COOKIE=>null,\n        ];\n        //print_r($options);exit;\n        curl_setopt_array($curlObj, $options);\n        $returnData = curl_exec($curlObj);\n        if (curl_errno($curlObj)) {\n            //error message\n            $returnData = curl_error($curlObj);\n        }\n        curl_close($curlObj);\n        echo $returnData;\n    }\n}\nnew NengeApp();\n?></textarea></div>`;
    }
    ROOMS_LIST(rooms,mode) {
        mode = mode||'rooms';
        let tophtml = mode =='rooms'? '<p><button type="button" data-btn="rooms-upload">添加游戏</button></p><p>vbanext-wasm.7z为运行核心文件,不可删除!如果出现奇异问题可以尝试删除!</p>':'<p><button data-btn="state-clear">清空本游戏状态</button></p><p><button data-btn="state-allclear">清空所有游戏即时状态</button></p>',
            HTML = '';
        for(let name in rooms){
            let room = rooms[name],
            dataKey = ` data-keyname="${room.name}"`,
            title = room.title||room.name;
            HTML +=  `<div class="gba-roomslist" ${dataKey}><h3>${title}</h3><img src="${room.img? `data:image/jpeg;base64,${window.btoa(String.fromCharCode.apply(null,room.img))}`:`icon/gba2.png`}" title="${room.name}" alt="${name}"><p>${room.time.toLocaleString()}</p><p class="gba-result-roomctr"><button type="button" data-btn="${mode}-load" ${dataKey}>${room.title?'读取':'打开'}</button> | <button type="button" data-btn="${mode}-down" ${dataKey}>下载</button>${room.title?'':` | <button type="button" data-btn="${mode}-delete" ${dataKey}>删除</button>`}</p></div>`;;
        }
        return `${tophtml}<div class="gba-rooms">${HTML}</div>${tophtml}`+this.ABOUT;
    }
    KEY_HTML(Keyboard, KeyboardIndex) {
        let HTML = '<div class="gba-keyMap"><h3>键位 ESC加速 Backspace重启 TAB 翻译 F1读取 F4记录</h3><table border="1" class="gba-table"><tr><th>键位</th><th>键值</th><th>键值</th></tr>',
            Keyboard_html = index => {
                return `<td><input type="text" value="${Keyboard[index]}" data-key-index="${index}" tabindex="${index+1}" required></td>`;
            };
        for (let i = 0; i < KeyboardIndex.length; i++) {
            HTML += `<tr><td>${KeyboardIndex[i].toLocaleUpperCase()}</td>${Keyboard_html(i)+Keyboard_html(i + 10)}</tr>`;
        }
        HTML += '</table><button type="button" data-btn="key-save">保存键值</button> | |<button type="button" data-btn="key-reset">恢复默认</button></div>';
        return HTML;
    }
    GAMEPAD_HTML(KeyGamePad, KeyGamePadMap, KeyMap) {
        let HTML = '<div class="gba-flex" style="align-items: flex-start;"><div class="gba-list-pad"><h3>手柄参数,基于我的廉价PS4手柄（百元不到）</h3>' +
            '<table border="1" class="gba-table"><tr><th>键位</th><th>键值</th></tr>';
        for (let i in KeyGamePadMap) {
            if (i == 'length') continue;
            let num = Number(i)+1;
            HTML += `<tr><td>${KeyGamePadMap[i]}</td><td><input type="text" value="${KeyGamePad[i]}" data-gamepad-index="${i}" tabindex="${num}" required></td></tr>`;
        }
        let keylength = 0;
        return HTML + `</table></div><div class="gba-list-pad">${Array.from(KeyMap,x=>x.toLowerCase()+'=>'+(keylength++)).join('<br>')}</div></div>`;
    }
    NOTGBA_HTML(name){
        return `<p class="gba-notgba">${name}<b>不是GBA文件</b></p>`;
    }
    RAR_HTML(message){
        return `<div class="gba-rar"><h3>${message}</h3><p><input value="" class="gba-rar-password" placeholder="输入密码 Enter password"></p><p><button data-btn="unrar">解压 Uncompress</button> | <button data-btn="exitrar">取消 Cancel</button></p><p class="gba-tl"><b>Uncaught Missing password:</b>需要密码</p><p class="gba-tl"><b>Uncaught File CRC error:</b>密码可能不正确！ password erro!</p></div>`;
    }
    get MENU_HTML() {
        let HTML = '',
            func = (key, value) => {
                let HTML = '',
                    active = this.config(key);
                if (typeof value == 'string') {
                    HTML += `<button type="button" data-btn="${key}"${active?' class="active"':''}>${value}</button>`;
                } else if (value instanceof Array) {
                    if (value[0] == 'radio') {
                        HTML += ` <div class="gba-w100m5">${key}:`;
                        for (let index = value[3]; index < value[4]; index++) {
                            HTML += `<label><input type="${value[0]}" name="${value[1]}" value="${index}" data-state-key="${index}" ${this.config(value[1])==index?'checked = true':''}>${value[2]}${index}</label>`;
                        }
                        HTML += `</div>`;
                    } else if(value[0] == 'option'){
                        let thiskey = this.config(key);
                        for (let index = 1; index < value.length; index++) {
                            let subvalue = value[index],
                            active = thiskey&&thiskey.includes(subvalue[1]) ? ' class="active"':'';
                            if (subvalue) HTML += `<button type="button" data-btn="${key}" data-${value[0]}="${subvalue[1]}" ${active}>${subvalue[0]}</button>`;
                        }

                    }
                } else {
                    HTML += ` <div class="gba-w50m5">${key}:`;
                    for (let subkey in value) {
                        HTML += func(subkey, value[subkey]) + '&nbsp;&nbsp;&nbsp;';
                    }
                    HTML += `</div>`
                }
                return HTML;
            };
        for (let name in this.MENU_DATA) {
            HTML += `<h3 class="gba-w100m5">${name}</h3><div class="gba-w100m5 gba-flex">`;
            let MENU_DATA = this.MENU_DATA[name];
            if (MENU_DATA instanceof Array) {
                HTML += func(key, MENU_DATA);
            } else {
                for (let key in MENU_DATA) {
                    HTML += func(key, MENU_DATA[key]);
                }
            }
            HTML += '</div>';
        }
        return HTML+this.ABOUT;
    }
    MENU_DATA = {
        "数据": {
            "rooms-show": "游戏列表",
            "state-show": "即时存档",
            "rooms-save": "储存快照"
        },
        "操作": {
            "do-forward": "加速游戏",
            "cheat-show": "作弊代码",
            "rooms-upload": "添加游戏",
            "do-downscreen": "下载截图",
            "translate-show": "翻译API",
            "key-key": "键位设置",
            "key-gamepad": "手柄设置",
            "do-getinfo": "信息下载",
            "do-sw": "离线开关",
            "do-loop": "画面继续",
            "do-hideui": "UI开关",
            "do-record": "录制视频",
        },
        "文件处理": {
            "游戏": {
                "state-load": "即读",
                "state-save": "即存",
                "translate-load": "翻译"
            },
            "重设": {
                "do-reset": "重启",
                "do-music": "音乐",
                "do-reload": "刷新",
            },
            "存档": {
                "srm-up": "载入",
                "srm-down": "下载",
                "srm-down128": "128K"
            },
            "即时": {
                "state-up": "载入",
                "state-down": "下载"
            },
            "档位": ['radio', 'stateKey', '位置', 0, 3],
        },
        //"档位": ['radio','stateKey', '位置', 0,2],
        "屏幕": {
            'do-shader': [
                'option',
                ['2倍柔化', '2xScaleHQ.glsl'],
                ['4倍柔化', '4xScaleHQ.glsl'],
                ['CRT模式', 'crt-aperture.glsl'],
                ['CRT简化', 'crt-easymode.glsl'],
                ['CRT模糊', 'crt-geom.glsl'],
            ]
        }
    };
    ABOUT = '<div class="gba-about"><h3>说明</h3>'
    +'<p class="gba-tl"><b>作弊代码:</b>目前测试成功的只有 类似这种"F3A9A86D 4E2629B4" 如果代码前面有#那么该行不会生效！</p>'
    +'<p class="gba-tl"><b>翻译API:</b>目前的跨域接口是我之前服务搭建的的，如果我的服务器到期将无法使用，如果资源的朋友，不妨共享个接口。</p>'
    +'<p>有兴趣搭建并分享请到<a href="https://github.com/nenge123/vba_next_wasm/issues" target="_blank">https://github.com/nenge123/vba_next_wasm/issues</a></p>'
    +'<p class="gba-tl"><b>离线开关:开启后,即便无网络也会运行，相反不会再更新最新文件。</b></p>'
    +'<p class="gba-tl"><b>快照:</b>保存当前的room的默认初始状态</p>'
    +'<p class="gba-tl"><b>RTC:</b>必须首次运行绿宝石或者红宝石,如果默认启动了怎么办？点击“刷新”按钮即可。</p>'
    +'<p class="gba-tl"><b>手柄设置:</b>请根据右侧提示设置</p>'
    +'<p class="gba-tl"><h3>视频录制:只有电脑可用！</h3>无声音的，不要问原因，我这三流水平折腾了好几天，结果还是得个吉，那就把这个吉送给各位吧，祝各位玩的开心，新年大吉大利。凑合着用吧。</p>'
    +'<p><br><br><br><br><br><img src="zan.jpg" title=""></p>'
            +'</div>';
}(NengeApp);
/**
 * @name DATA
 * 
 */
new class {
    constructor(N) {
        N.DATA = this;
        this.Module = N.Module;
        this.config = (e)=>N.CONFIG[e];
        this.music = N.CONFIG['do-music'];
        this.setGameName = name => {
            N.GameName = name
        };
    }
    get cwrap() {
        return this.Module.cwrap;
    }
    get FS() {
        return this.Module.FS;
    }
    get HEAPU8() {
        return this.Module.HEAPU8;
    }
    get STATE() {
        let len = this.cwrap('get_state_info', 'string', [])().split('|');
        if (!len[1]) return null;
        return new Uint8Array(this.HEAPU8.subarray(len[1] >> 0, (len[0] >> 0) + (len[1] >> 0)));
    }
    set STATE(state) {
        this.stateFile = true;
        this.FS['writeFile']('/' + this.stateName, state);
        state = null;
        this.loadState();
        this.Module.resumeMainLoop();
    }
    get SRM() {
        //this.cwrap('cmd_savefiles','','')();
        //let buf = 
        //return this.FS.readFile('/'+this.srmName);
        return new Uint8Array(this.HEAPU8.subarray(this.Module.SRM_POS, this.Module.SRM_POS + 139264));
        //this.FS['unlink']('/game.');

    }
    set SRM(srm) {
        this.FS.createDataFile('/', this.srmName, srm ? srm : new Uint8Array(139264), !0x0, !0x1);
        this.Module._event_load_save_files();
        this.FS['unlink']('/' + this.srmName);
        this.Module._system_restart();
        //this.HEAPU8.set(buf ? buf : new Uint8Array(139264), this.Module.SRM_POS);
    }
    get SCREEN() {
        //this.ShaderEnable(0);
        this.cwrap('cmd_take_screenshot', '', [])();
        //this.ShaderEnable();
        let u8 = this.FS.readFile('screenshot.png');
        this.FS['unlink']('/screenshot.png');
        return u8;
    }
    get stateName() {
        return this.gameName.replace('.gba', '.state');
    }
    get srmName() {
        return this.gameName.replace('.gba', '.srm');
    }
    loadState(other) {
        if (this.stateFile) {
            this.cwrap('load_state', 'number', ['string', 'number'])(this.stateName, 0);
            this.FS.unlink('/' + this.stateName);
            this.stateFile = false;
        }
        if (other) {
            this.FS['unlink']('/' + this.gameName);
            this.FS['unlink']('/' + this.srmName);
        }
    }
    AddROOM(u8, srm, state, gamename) {
        if (gamename) this.setGameName(gamename);
        if (!this.gameName) {
            this.gameName = 'game.gba';
            this.Module.ROOM_POS += u8.length + 32;
            this.FS['createDataFile']('/', this.gameName, new Uint8Array(u8), !0x0, !0x1);
            this.AddSRM(srm, state, true);
            let GameInfo = ['/' + this.gameName, "2b35cacf70aef5cbb3f38c0bb20e488cc8ad0c350400499a0"];
            'undefined' != typeof EJS_DEBUG_XX && !0 === EJS_DEBUG_XX && GameInfo.unshift('-v');
            this.Module.callMain(GameInfo);
            this.SetShader();
            this.loadState(true);
            this.Module.resumeMainLoop();
        } else {
            this.Module.pauseMainLoop();
            this.HEAPU8.set(new Uint8Array(u8), this.Module["ROOM_POS"]);
            this.AddSRM(srm, state, false);
            this.Module.resumeMainLoop();
        }
        u8 = null, srm = null, state = null;
    }
    AddSRM(srm, state, isload) {
        if (isload) {
            this.FS.createDataFile('/', this.srmName, srm ? srm : new Uint8Array(139264), !0x0, !0x1);
            if (state) {
                this.stateFile = true;
                this.FS['writeFile']('/' + this.stateName, state);
            }
        } else {
            if (!state) {
                this.SRM = srm;
                //this.HEAPU8.set(srm ? srm : new Uint8Array(139264), this.Module.SRM_POS);
                //this.Module._system_restart();
            }
            if (state) this.STATE = state;
            else this.Module.resumeMainLoop();
        };
        srm = null, state = null;
    }
    SHADER_MODE = {
        "2xScaleHQ.glsl": ['false', 'source'],
        "4xScaleHQ.glsl": ['false', 'source'],
        "crt-aperture.glsl": ['false', 'source'],
        "crt-easymode.glsl": ['false', 'source'],
        "crt-geom.glsl": ['false', 'source']
    }
    SetShader() {
        let shaders = this.config('do-shader');
        if(!shaders)return;
        let str = 'shaders = ' + shaders.length + '\n';
        for (let i = 0; i < shaders.length; i++) {
            let shader = shaders[i];
            if(shader)str += `shader${i} = "${shader}"\n` +
                `filter_linear${i} = ${this.SHADER_MODE[shader][1]}\n` +
                `scale_type_${i} = ${this.SHADER_MODE[shader][2]}\n`;
        }
        this.FS.writeFile('/shader/shader.glslp', str);
        this.ShaderEnable(shaders.length > 0 ? 1 : 0);
    }
    ShaderEnable(NUM) {
        let shaders = this.config('do-shader');
        if (NUM == undefined) NUM = shaders&&shaders.length > 0 ? 1 : 0;
        this.cwrap('shader_enable', 'null', ['number'])(NUM);
    }
}(NengeApp);
/**
 * @name EVENT
 */
new class {
    constructor(N) {
        this.BTN = N.BtnMap;
        this.RUNBTN = e=>{
            let s = e.split('-');
            if(this.BTN[s[0]]){
                if(s[1])this.BTN[s[0]][s[1]]();
                else this.BTN[s[0]]();
            }
        };
        if(N.CONFIG['KeyGamePad'])N.KEY.KeyGamePad = N.CONFIG['KeyGamePad'];
        this.KEY = N.KEY;
        N.upload = cb=>{
            let cbkey = Math.random(),
                ELM = document.querySelector('.gba-file-upload');
                this.cbkey[cbkey] = cb;
                ELM.setAttribute('data-upload',cbkey);
                ELM.click();
        }
        this.upLoad = (ELM)=>{
            let file = ELM.files[0],cbkey=ELM.getAttribute('data-upload');
            ELM.removeAttribute('data-upload');
            if (!file) return;
            ELM.value = '';
            let reader = new FileReader();
            reader.onload = e => {
                N.CheckFile(e.target.result, file.name).then(result=>{
                    if(cbkey&&this.cbkey[cbkey]){
                        this.cbkey[cbkey](result,file.name);
                        delete this.cbkey[cbkey];
                    }
                    e.target.result - null;
                    reader = null, file = null;
                });
            };
            reader.readAsArrayBuffer(file);
        }
        let Module = N.Module;
        this.gamepadStr = {
            '加速': e => this.BTN['do']['forward'](),
            '切换': e => this.BTN['state']['switch'](),
            "即读": e => this.BTN['state']['load'](),
            "即存": e => this.BTN['state']['save'](),
            "重启": e => this.BTN['state']['reset'](),
            "快照": e => this.BTN['db']['UpdateRoom'](),
        };
        window.addEventListener("gamepadconnected", e => {
            console.log("连接手柄", e.gamepad.id);
            Module.preMainLoop = e => {
                this.gamepad();
            }
        });
        window.addEventListener('gamepaddisconnected', e => {
            console.log("断开手柄", e.gamepad.id);
            let GamePads = navigator.getGamepads();
            if (GamePads) {
                for (var i in GamePads) {
                    if (GamePads[i].connected) return;
                }
            }
            Module.preMainLoop = e => {};
        });
        window.addEventListener("change", e => {
            let elm = e.target;
            if (elm) {
                let gamepadIndex = this.ELM_ATTR(elm, 'data-gamepad-index'),
                    stateKey = this.ELM_ATTR(elm, 'data-state-key'),
                    upload = this.ELM_ATTR(elm, 'data-upload');
                if (gamepadIndex != undefined) {
                    let value = elm.value;
                    if (value == "" || value == "null") value = null;
                    if (value != null) {
                        if (Number(value) != NaN) {
                            value = this.KEY.KeyMap[value] ? Number(value) : null;
                        } else if (!this.gamepadStr[value]) {
                            value = null;
                        }
                    }
                    elm.value = value || 'null';
                    N.KEY.KeyGamePad[gamepadIndex] = elm.value;
                    N.setConfig({KeyGamePad:this.KEY.KeyGamePad});
                    return false;
                } else if (stateKey != undefined) {
                    N.setConfig({
                        stateKey
                    });
                    this.BTN['closelist']();
                } else if (upload != undefined) {
                    this.upLoad(elm);
                }
            }

        },false);
        let CodeMap = {
            'Escape':'do-forward',
            'Tab':'translate-load',
            'Backspace':'do-reset',
            'F1':'state-load',
            'F4':'state-save',
        };
        ['keyup', 'keydown'].forEach(val => document.addEventListener(val, (e) => {
            let code = this.KEY._KeyCode[e.code];
            if (e.target) {
                let elm = e.target,
                    index = this.ELM_ATTR(elm, 'data-key-index');
                if (index != undefined) {
                        if (!['Escape', 'Tab', 'F1', 'F4',"Backspace"].includes(e.code)){
                            elm.value = e.code;
                            this.stopEvent(e);
                        }else if(['Escape', 'F1', 'F4',"Backspace"].includes(e.code)) this.stopEvent(e);
                    return ;
                }
            }
            if(document.querySelector('.gba-result').childNodes[0]) return;
            if(CodeMap[e.code]){
                this.stopEvent(e);
                if(e.type == 'keyup') return this.RUNBTN(CodeMap[e.code]);
            }
            if (code != undefined) {
                this.stopEvent(e);
                this.KEY.sendState(code, e.type == 'keyup' ? 0 : 1);
            }
        }, {
            passive: false
        }));
        window.addEventListener('beforeunload', e => {
            return this.BTN['db']['UpdateRoom']();
        });
        //pagehide
        if (document.visibilityState != undefined) {
            document.addEventListener('visibilitychange', (e) => {
                if (!this.Module || !this.Module.noExitRuntime || this.Module.runMusic) return;
                if ('hidden' === document.visibilityState) {
                    this.BTN['db']['UpdateRoom']();
                    console.log('隐藏');
                }else{
                    console.log('显示');
                }
            },false);

        } else {
            window.addEventListener("pagehide", event => {
                if (event.persisted) {
                    return this.BTN['db']['UpdateRoom']();
                }
            }, false);

        }
        /*
        window.onbeforeunload = e=>{
            return this.BTN['db']['UpdateRoom'](e);
        };
        */
        this.clickEvent();
    }
    cbkey={};
    Timer = {};
    ELM_ATTR(elm, key) {
        if (elm!=undefined &&elm!=null&& elm.nodeType == 1) return elm.getAttribute(key);
    }
    stopEvent(e,bool) {
        if(!bool)e.preventDefault();
        e.stopPropagation();
        return false;
    }
    clickEvent() {
        let ETYPE = ['mousedown', 'mouseup', 'mouseout', 'mousemove'],
            noelmclass = ['gba-pic', 'gba-body', 'gba-ctrl', 'gba-msg'];
        if ("ontouchstart" in document) {
            ETYPE = ['touchstart', 'touchmove', 'touchcancel', 'touchend'];
        }
        ETYPE.forEach(val => document.addEventListener(val, (event) => {
            let ct = event.changedTouches && event.changedTouches[0],
                cte = ct && document.elementFromPoint(ct.pageX, ct.pageY),
                elm = cte ||event.target,
                keyState = {},
                type = event.type,
                key = this.ELM_ATTR(elm, 'data-k'),
                btn = this.ELM_ATTR(elm, 'data-btn');
            if (btn) {
                if (["mouseup", "touchend"].includes(type)) {
                    if (type != "touchend" || elm == event.target) {
                        btn = btn.toLowerCase();
                        let btnkey = btn.split('-');
                        if (btnkey[1]) this.BTN[btnkey[0]][btnkey[1]](event);
                        else this.BTN[btn](event);
                    }

                }
                return this.stopEvent(event,1);
            } else if (key) {
                if (event.touches && event.touches.length > 0) {
                    for (var i = 0; i < event.touches.length; i++) {
                        var t = event.touches[i];
                        var k = this.ELM_ATTR(document.elementFromPoint(t.pageX, t.pageY), 'data-k');
                        if (k) {
                            let index = this.KEY.get(k);
                            if (index != undefined) {
                                keyState[index] = 1;
                            } else {
                                if (k == 'ul') {
                                    keyState[4] = 1;
                                    keyState[6] = 1;
                                } else if (k == 'ur') {
                                    keyState[4] = 1;
                                    keyState[6] = 1;
                                } else if (k == 'dl') {
                                    keyState[5] = 1;
                                    keyState[7] = 1;
                                } else if (k == 'dr') {
                                    keyState[5] = 1;
                                    keyState[7] = 1;
                                }
                            }
                        }
                    }
                    this.stopEvent(event);
                } else {
                    if (type == "mouseup") {
                        this.mousedownHold = false;
                    } else if (this.mousedownHold == true || type == 'mousedown') {
                        this.mousedownHold = true;
                        keyState[this.KEY.get(key)] = 1;
                        this.KEY.SetState(keyState);
                        return this.stopEvent(event);
                    }
                }
            }
            this.KEY.SetState(keyState);
            if (noelmclass.includes(elm.className) || ['body', 'html'].includes(elm.tagName.toLowerCase())) return this.stopEvent(event);
        }, {
            'passive': false
        }));
    }
    gamepad() {
        let GamePads = navigator.getGamepads(),
            keyState;
        for (let GamePadId = 0; GamePadId < GamePads.length; GamePadId++) {
            let Gamepad = GamePads[GamePadId];
            if (Gamepad && Gamepad.connected) {
                let AXE = Gamepad.axes,
                    Buttons = Gamepad.buttons;
                //connected = Gamepad.connected,
                //GamepadName = Gamepad.id;
                for (let btnid = 0; btnid < Buttons.length; btnid++) {
                    //12上 13下 14 左 15右
                    //L1/4  R1/5  L2/6 L3/7   L/10 R11
                    //0 X 1 O 2 ▲ 3 SHARE 8 option 9 PS 16 触摸板按下17
                    //value 越大压力越强
                    let MapTemp = this.KEY.KeyGamePad[btnid],
                        elm = document.querySelector(`[data-gamepad-index="${btnid}"]`);
                    if (Buttons[btnid].value > 0.5) {
                        if (elm) {
                            elm.classList.add('active');
                        } else if (typeof MapTemp == 'number') {
                            if (!keyState) keyState = {};
                            keyState[MapTemp] = 1;
                        } else {
                            if (typeof MapTemp == 'string' && this.gamepadStr[MapTemp]) {
                                clearTimeout(this.Timer[MapTemp]);
                                this.Timer[MapTemp] = setTimeout(
                                    () => {
                                        this.gamepadStr[MapTemp]();
                                    },
                                    60
                                )
                            }
                        }
                    } else {
                        if (elm) {
                            elm.classList.remove('active');
                        }
                    }
                }
                for (let axeid = 0; axeid < AXE.length; axeid++) {
                    let axe = parseFloat(AXE[axeid]),
                        axeS = 0;
                    //1 左摇杆 左右 2 上下 3右摇杆 左右 上下
                    //key 4右 5左  6上 7下
                    if (axe < -0.5) axeS += 1; //1 or0
                    if (axe > 0.5) axeS += 2; //2 or 0
                    //axeS1左 上 axeS2右 下
                    //axeid%2 0左右
                    //axeid%2 1上下
                    if (axeS != 0) {
                        if (axeid % 2 == 0) {

                            if (!keyState) keyState = {};
                            axeS + 5 == 6 ? (keyState[6] = 1) : (keyState[7] = 1)
                            //console.log(axeS+5);
                        } else if (axeid % 2 == 1) {

                            if (!keyState) keyState = {};
                            axeS + 3 == 4 ? (keyState[4] = 1) : (keyState[5] = 1)
                            //console.log(axeS+3);
                            //上下
                        }
                    }
                }
            }
        }
        if (keyState) {
            this.KEY.SetState(keyState);
            this.keyState = keyState;
        } else if (this.keyState) {
            this.keyState = null;
            this.KEY.SetState({});
        }
        keyState = null;
    }
}(NengeApp);