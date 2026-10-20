/* SK-골프캐디 오프라인 저장 담당 파일
   - 저장소 이름에 앱 버전을 넣는다. 버전을 올리면 옛 저장분은 지워지고 새 파일을 받는다.
   - 앱 본체(index.html)는 인터넷이 되면 새것을 먼저 받고, 안 되면 저장분을 쓴다.
   - LocalStorage(설정·수정 카드·즐겨찾기)는 이 파일이 건드리지 않으므로 업데이트해도 유지된다. */
const CACHE_NAME = "sk-golf-caddie-v1.2";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  const isPage = e.request.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/sw.js");
  if (isPage) {
    /* 본체는 인터넷 우선: 새 버전이 오래된 저장분에 막히지 않게 한다 */
    e.respondWith(
      fetch(e.request).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (m) { return m || caches.match("./index.html"); });
      })
    );
  } else {
    /* 나머지 파일은 저장분 우선, 없으면 인터넷에서 받아 저장 */
    e.respondWith(
      caches.match(e.request).then(function (m) {
        return m || fetch(e.request).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
          return res;
        });
      })
    );
  }
});
