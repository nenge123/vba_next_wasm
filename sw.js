let CACHE_NAME = 'NengeApp_VBA';
let urlsToCache = [
    './js/NengeApp.min.js',
    './css/style.css',
    './js/dexie.worker.js',
	'./icon/gba2.png',
    './manifest.json',
    './zan.jpg',
    './',
    './index.html',
];
let MyWIN,postMessage = e=>console.log(e);
setMessage = (event)=>{
    console.log('web=>sw 通信建立!');
    MyWIN = event.ports[0];
    postMessage = e=> MyWIN.postMessage(e);
    MyWIN.postMessage('install');
    MyWIN.onmessage = e=>{
        console.log(e);
        self.onmessage(e);
    };
}
self.onmessage = e=>{
    let result = e.data;
    if(result == "install"&&e.ports[0])setMessage(e);
    else if(result){
        if(result = 'delete'){
            caches.delete(CACHE_NAME).then(result=>{
                console.log(result);caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache).then(result=>postMessage('reload')))
            });
        }
    }
};
self.addEventListener('install',event=>{
    //注册
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                postMessage({message:'SW下载缓存所需文件！'});
                return cache.addAll(urlsToCache);
            }).then(()=>{
                postMessage({message:'SW缓存文件下载完毕！'})
                self.skipWaiting()
            })
    );
});
self.addEventListener('fetch', event=>{
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                postMessage('cache miss'+event.request.url);
                return fetch(event.request.url);
            })
    );
});
self.addEventListener('activate', event=>{
    /*
    console.log('activated, remove unused cache...')
    var cacheAllowlist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheAllowlist.indexOf(cacheName) === -1) {
						console.log(cacheName)
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    */
    clients.matchAll({includeUncontrolled:true,type:'window'}).then((arr) => {
		for (client of arr) {
			client.postMessage({message:'sw已激活！'});
		}
	})
});