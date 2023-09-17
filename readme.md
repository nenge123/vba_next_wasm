这是一款网页版 GBA模拟器

this is gba wasm emulator by retroarch vba-next!

你可以运行加速,SL大法,RTC,金手指!

### 私有部署 ###

- gbawasm#welcome() 直接启动某ROM
    ```javascript
    var VBA = this;
    var buffer;
    var romsName;
    if (this.isIPhone && !this.isstandalone) {
        /**
         * 阻止苹果手机浏览器
            */
        $('.wel-index').innerHTML = '<p style="color:red">检测到你是苹果手机.<br>请点击状态栏的"更多"<br>下翻后的"添加到主屏幕".</p>';
        return;
    }
    $('.wel-index').innerHTML = '';
    var progressElm = document.createElement('div');
    progressElm.innerHTML = '请稍等!';
    progressElm.classList.add('download-progress');
    progressElm.style.cssText='color: #3643e9;font-size: 1rem;font-weight: bold;text-shadow: 2px 2px 3px #8b7b7b;';
    $('.wel-index').appendChild(progressElm);
    if (VBA.isPWA) {
        if (!navigator.serviceWorker.controller) {
            progressElm.innerHTML = 'serviceWorker 未完全加载!稍后替你刷新页面';
            return;
        }
    }
    /**
     * 锁定核心
     */
    CorePath = 'mGBA/';
    VBA.corename = 'mgba';
    VBA.FSROOT.saves += CorePath;
    VBA.FSROOT.cheat += CorePath;
    VBA.DBKEY += VBA.corename;
    /**
     * 加载模拟器Module类
        */
    var Module = new emuModulle(VBA,TXT => progressElm.innerHTML = TXT);
    if(await Module.isRuntimeInitialized){
        progressElm.innerHTML = '模拟器核心下载失败,请确保已经联网!下载过慢建议下载加速器加速任意外服游戏!';
        return;
    }
    /**
     * 需要注意必须通过事件运行,否则音频事件在手机不会初始化
     */
    /**
     * 运行指定url
     */
    romsName = 'xxx.gba';
    var buffer = await  MyTable('rooms').getdata(romsName);
    if(!buffer){
        ToArr(await T.FetchItem({
            url:romsName.replace(/\.gba$/i,'.zip'), // xxx.zip
            unpack:!0,
        }),
        entry=>{
            if(this.EXTREGX.test(entry[0])&&entry.length>0x2000){
                //entry.length 过滤某些系统生成的奇怪文件 例如苹果压缩的文件
            buffer = entry[1];
            romsName = entry[0];
            }
        });
        await  MyTable('rooms').put({
            contents:buffer,
            system:GetExt(romsName),
            timestamp: new Date,
        },romsName);
    }
    var progressbtn = document.createElement('button');
    progressbtn.innerHTML = '开始游戏';
    progressElm.remove();
    $('.wel-index').appendChild(progressbtn);
    /**
     * 绑定点击事件
     */
    progressbtn.on('click',e=>{
         VBA.StartGame(romsName, buffer);
    });
    /*************/
    /**
     * 上传游戏
     */
    var progressbtn = document.createElement('button');
    progressbtn.innerHTML = '浏览游戏';
    $('.wel-index').appendChild(progressbtn);
    /**
     * 绑定点击事件
     */
    progressbtn.on('click',e=>{
        VBA.upload(async files=>{
            var file = files[0];
            var u8 = await T.unFile(file,(a,b,c)=>progressElm.innerHTML = `解压进度:${c} ${I.PER(a,b)}`);
            if(u8 instanceof Uint8Array){
                romsName = file.name;
                buffer = u8;
            }else if(I.obj(u8)){
                ToArr(u8,entry=>{
                        if(this.EXTREGX.test(entry[0])&&entry.length>0x2000){
                            //entry.length 过滤某些系统生成的奇怪文件 例如苹果压缩的文件
                            buffer = entry[1];
                            romsName = entry[0];
                        }
                })
            }
            if(romsName&&buffer)VBA.StartGame(romsName, buffer);
        });
    });
    ```