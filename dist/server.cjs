var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
async function startServer() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Accept, Origin, Cache-Control, Pragma");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  app.get("/api/version", (req, res) => {
    res.json({
      currentVersion: "1.0.5",
      minRequiredVersion: "1.0.5",
      updateUrl: "https://cehri50-iptv-proxy-production.up.railway.app",
      // Can be set to APK download link or forum post
      messageTr: "Cehri50 IPTV Player i\xE7in yeni bir g\xFCncelleme mevcut! L\xFCtfen en iyi performans, yeni \xF6zellikler ve kanal y\xFCkleme d\xFCzeltmeleri i\xE7in uygulamay\u0131 g\xFCncelleyin.",
      messageEn: "A new update is available for Cehri50 IPTV Player! Please update for optimal performance, new features, and channel loading fixes.",
      forceUpdate: true
      // If set to true, it blocks access on older versions
    });
  });
  function convertSharingUrl(urlStr) {
    let normalized = urlStr.trim();
    const fileDMatch = normalized.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${fileDMatch[1]}`;
    }
    const idMatch = normalized.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    const docsDMatch = normalized.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (docsDMatch && docsDMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${docsDMatch[1]}`;
    }
    if (normalized.includes("dropbox.com")) {
      normalized = normalized.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "?dl=1");
    }
    if (normalized.includes("github.com/") && normalized.includes("/blob/")) {
      normalized = normalized.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    }
    return normalized;
  }
  app.get("/api/m3u/proxy", async (req, res) => {
    let m3uUrl = req.query.url;
    if (!m3uUrl) {
      return res.status(400).json({ error: "URL parameter is required" });
    }
    m3uUrl = convertSharingUrl(m3uUrl);
    try {
      console.log(`[Proxy] Fetching M3U from: ${m3uUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      let response = await fetch(m3uUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      clearTimeout(timeoutId);
      const finalUrl = response.url || m3uUrl;
      const convertedUrl = convertSharingUrl(finalUrl);
      if (convertedUrl !== finalUrl) {
        console.log(`[Proxy] Redirect resolved to a sharing URL: ${finalUrl}. Re-fetching raw content from: ${convertedUrl}`);
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 3e4);
        response = await fetch(convertedUrl, {
          signal: controller2.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        clearTimeout(timeoutId2);
      }
      if (!response.ok) {
        throw new Error(`IPTV provider returned status ${response.status}`);
      }
      let content = await response.text();
      let isHtml = content.trim().startsWith("<") || content.includes("<html") || (response.headers.get("content-type") || "").includes("text/html");
      const isGoogleDrive = m3uUrl.includes("google.com") || response.url && response.url.includes("google.com");
      if (isHtml && isGoogleDrive) {
        if (content.includes("accounts.google.com") || content.includes("signin") || content.includes("ServiceLogin")) {
          throw new Error('Google Drive dosyan\u0131z "K\u0131s\u0131tl\u0131" (\xD6zel) durumdad\u0131r. L\xFCtfen Google Drive \xFCzerinden payla\u015F\u0131m ayar\u0131n\u0131 "Ba\u011Flant\u0131ya sahip olan herkes g\xF6r\xFCnt\xFCleyebilir" olarak de\u011Fi\u015Ftirin.');
        }
        const confirmMatch = content.match(/confirm=([^&"'\s<>]+)/i);
        const idMatch = m3uUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || m3uUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || response.url && (response.url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || response.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/));
        const fileId = idMatch ? idMatch[1] : null;
        if (confirmMatch && fileId) {
          const confirmToken = confirmMatch[1];
          const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
          console.log(`[Proxy] Google Drive safety warning detected. Token: ${confirmToken}. Re-fetching directly from: ${downloadUrl}`);
          const controllerGD = new AbortController();
          const timeoutIdGD = setTimeout(() => controllerGD.abort(), 3e4);
          const gdResponse = await fetch(downloadUrl, {
            signal: controllerGD.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "*/*",
              "Accept-Language": "en-US,en;q=0.9,tr;q=0.8"
            }
          });
          clearTimeout(timeoutIdGD);
          if (gdResponse.ok) {
            content = await gdResponse.text();
            console.log(`[Proxy] Google Drive file content successfully fetched after passing warning page.`);
            isHtml = content.trim().startsWith("<") || content.includes("<html") || (gdResponse.headers.get("content-type") || "").includes("text/html");
          } else {
            console.warn(`[Proxy] Failed to fetch Google Drive file content after passing warning. Status: ${gdResponse.status}`);
          }
        }
      }
      if (isHtml) {
        if (isGoogleDrive) {
          if (content.includes("not found") || content.includes("Bulunamad\u0131") || content.includes("g\xF6r\xFCn\xFC\u015Fe g\xF6re bu dosya yok") || content.includes("g\xF6r\xFCnm\xFCyor") || content.includes("Bulunam\u0131yor") || content.includes("Bulunamad\u0131")) {
            throw new Error("Google Drive dosyas\u0131 bulunamad\u0131! L\xFCtfen dosya ID'sinin do\u011Fru oldu\u011Fundan ve dosyan\u0131n silinmedi\u011Finden emin olun.");
          }
          if (content.includes("denied") || content.includes("yetkiniz yok") || content.includes("eri\u015Fim") || content.includes("access") || content.includes("accounts.google.com") || content.includes("ServiceLogin") || content.includes("signin")) {
            throw new Error('Google Drive dosyan\u0131z "K\u0131s\u0131tl\u0131" (\xD6zel) veya korumal\u0131 durumdad\u0131r. L\xFCtfen Google Drive \xFCzerinden payla\u015F\u0131m ayar\u0131n\u0131 "Ba\u011Flant\u0131ya sahip olan herkes g\xF6r\xFCnt\xFCleyebilir" olarak de\u011Fi\u015Ftirin.');
          }
          throw new Error("Google Drive ge\xE7erli bir M3U dosyas\u0131 yerine bir HTML web sayfas\u0131 d\xF6nd\xFCrd\xFC. L\xFCtfen dosyan\u0131n herkese a\xE7\u0131k payla\u015F\u0131ld\u0131\u011F\u0131ndan emin olun.");
        } else {
          throw new Error("Sa\u011Flay\u0131c\u0131 M3U dosyas\u0131 yerine bir HTML web sayfas\u0131 d\xF6nd\xFCrd\xFC. Girdi\u011Finiz URL do\u011Frudan canl\u0131 liste indirme ba\u011Flant\u0131s\u0131 olmal\u0131d\u0131r, bir web sitesi veya portal adresi de\u011Fil.");
        }
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(content);
    } catch (err) {
      console.error(`[Proxy Error] Failed to fetch M3U: ${err.message}`);
      res.status(502).json({
        error: err.message,
        details: err.message
      });
    }
  });
  const handleXtreamProxy = async (req, res) => {
    const params = { ...req.query, ...req.body };
    const { serverUrl, ...otherParams } = params;
    if (!serverUrl) {
      return res.status(400).json({ error: "serverUrl parameter is required" });
    }
    let normalizedUrl = serverUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "http://" + normalizedUrl;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, "");
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(otherParams)) {
      if (value !== void 0 && value !== null) {
        queryParams.set(key, String(value));
      }
    }
    const targetUrl = `${normalizedUrl}/player_api.php?${queryParams.toString()}`;
    try {
      console.log(`[Xtream Proxy Tunneled] Forwarding request to: ${targetUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2e4);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*"
        }
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Xtream target server returned HTTP ${response.status}`
        });
      }
      const contentType = response.headers.get("content-type") || "";
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (contentType.includes("application/json") || contentType.includes("text/plain") || contentType.includes("text/javascript")) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch (_) {
          res.setHeader("Content-Type", contentType || "text/plain");
          return res.send(text);
        }
      } else {
        const buffer = await response.arrayBuffer();
        res.setHeader("Content-Type", contentType || "application/octet-stream");
        return res.send(Buffer.from(buffer));
      }
    } catch (err) {
      console.error(`[Xtream Proxy Tunneled Error]: ${err.message}`);
      return res.status(502).json({
        error: "Failed to tunnel request to target Xtream server",
        details: err.message
      });
    }
  };
  app.get("/api/xtream/proxy", handleXtreamProxy);
  app.post("/api/xtream/proxy", handleXtreamProxy);
  app.get("/api/image/proxy", async (req, res) => {
    let imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ error: "URL parameter is required" });
    }
    imageUrl = convertSharingUrl(imageUrl);
    try {
      console.log(`[Image Proxy] Fetching logo from: ${imageUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1e4);
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/*"
        }
      });
      clearTimeout(timeoutId);
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      } else {
        res.setHeader("Content-Type", "image/png");
      }
      res.setHeader("Cache-Control", "public, max-age=86400");
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error(`[Image Proxy Error] Failed to load image: ${imageUrl}. Error: ${err.message}`);
      return res.redirect("https://images.unsplash.com/photo-1542204172-e7052809a8a7?w=128&auto=format&fit=crop&q=60");
    }
  });
  app.post("/api/xtream/channels", async (req, res) => {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: "serverUrl, username, and password are required" });
    }
    let normalizedUrl = serverUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "http://" + normalizedUrl;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, "");
    try {
      console.log(`[Xtream Proxy] Authenticating with: ${normalizedUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12e3);
      const authUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}`;
      const authResponse = await fetch(authUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!authResponse.ok) {
        return res.status(authResponse.status).json({
          error: `Xtream server returned HTTP ${authResponse.status}`
        });
      }
      const authData = await authResponse.json();
      if (!authData || !authData.user_info || authData.user_info.auth === 0) {
        return res.status(401).json({
          error: "Authentication failed. Check your Xtream Codes username, password, and URL."
        });
      }
      console.log(`[Xtream Proxy] Fetching channels and categories...`);
      const streamsController = new AbortController();
      const streamsTimeoutId = setTimeout(() => streamsController.abort(), 15e3);
      const categoriesUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
      const streamsUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
      const [categoriesResponse, streamsResponse] = await Promise.all([
        fetch(categoriesUrl, { signal: streamsController.signal }).catch(() => null),
        fetch(streamsUrl, { signal: streamsController.signal })
      ]);
      clearTimeout(streamsTimeoutId);
      if (!streamsResponse.ok) {
        return res.status(502).json({ error: "Failed to retrieve streams from Xtream server." });
      }
      let categories = [];
      if (categoriesResponse && categoriesResponse.ok) {
        try {
          categories = await categoriesResponse.json();
        } catch (_) {
          categories = [];
        }
      }
      const streams = await streamsResponse.json();
      if (!Array.isArray(streams)) {
        return res.status(502).json({ error: "Xtream server returned invalid stream format." });
      }
      const categoryMap = /* @__PURE__ */ new Map();
      if (Array.isArray(categories)) {
        categories.forEach((cat) => {
          if (cat && cat.category_id && cat.category_name) {
            categoryMap.set(String(cat.category_id), String(cat.category_name));
          }
        });
      }
      const xtreamPlaylistId = `xtream-${Date.now()}`;
      const mappedChannels = streams.map((stream, index) => {
        const streamId = stream.stream_id;
        const categoryId = String(stream.category_id || "");
        const groupName = categoryMap.get(categoryId) || "Genel (General)";
        const extension = stream.container_extension || "m3u8";
        const streamUrl = `${normalizedUrl}/live/${username}/${password}/${streamId}.${extension}`;
        return {
          id: `${xtreamPlaylistId}-ch-${streamId}-${index}`,
          name: stream.name || `Channel ${streamId}`,
          logo: stream.stream_icon || "",
          url: streamUrl,
          group: groupName,
          epgId: stream.epg_channel_id || void 0,
          playlistId: xtreamPlaylistId
        };
      });
      console.log(`[Xtream Proxy] Successfully retrieved ${mappedChannels.length} streams.`);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json({
        playlistId: xtreamPlaylistId,
        channels: mappedChannels,
        userInfo: {
          status: authData.user_info.status,
          expiry: authData.user_info.exp_date,
          maxConnections: authData.user_info.max_connections
        }
      });
    } catch (err) {
      console.error(`[Xtream Proxy Error]: ${err.message}`);
      res.status(502).json({
        error: "Failed to establish connection with Xtream Codes server.",
        details: err.message
      });
    }
  });
  function rewritePlaylist(content, originalUrl, proxyBaseUrl) {
    const lines = content.split(/\r?\n/);
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          try {
            if (uri.startsWith("data:") || uri.includes("/api/stream/proxy")) {
              return match;
            }
            const resolvedUri = new URL(uri, originalUrl).href;
            const proxiedUri = `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUri)}`;
            return `URI="${proxiedUri}"`;
          } catch (_) {
            return match;
          }
        });
      }
      try {
        if (trimmed.includes("/api/stream/proxy")) {
          return line;
        }
        const resolvedUrl = new URL(trimmed, originalUrl).href;
        return `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUrl)}`;
      } catch (_) {
        return line;
      }
    });
    return rewrittenLines.join("\n");
  }
  app.get("/api/stream/proxy", async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) {
      return res.status(400).send("URL parameter is required");
    }
    try {
      console.log(`[Stream Proxy] Request starting for: ${streamUrl}`);
      const controller = new AbortController();
      req.on("close", () => {
        console.log("[Stream Proxy] Connection closed by client, aborting stream fetch");
        controller.abort();
      });
      const response = await fetch(streamUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      console.log(`[Stream Proxy] Fetch completed. Status: ${response.status} (${response.statusText})`);
      if (!response.ok) {
        console.log(`[Stream Proxy] Error response received from provider. Status: ${response.status}`);
        return res.status(response.status).send(`Provider returned status ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || response.headers.get("Content-Type") || "";
      console.log(`[Stream Proxy] Provider Content-Type: "${contentType}"`);
      const isM3U8 = streamUrl.toLowerCase().includes(".m3u8") || contentType.toLowerCase().includes("mpegurl") || contentType.toLowerCase().includes("m3u8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      if (isM3U8) {
        console.log(`[Stream Proxy] Detected playlist file (.m3u8), initiating text parsing...`);
        console.log(`[Stream Proxy] Playlist rewrite ba\u015Flang\u0131c\u0131 for: ${streamUrl}`);
        const contentText = await response.text();
        console.log(`[Stream Proxy] Playlist content fetched. Length: ${contentText.length} characters.`);
        const isLocalhost = req.headers.host && (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1") || req.headers.host.includes("192.168."));
        const protocol = isLocalhost ? "http" : "https";
        const host = req.headers.host || "localhost:3000";
        const proxyBaseUrl = `${protocol}://${host}/api/stream/proxy`;
        const rewrittenContent = rewritePlaylist(contentText, streamUrl, proxyBaseUrl);
        console.log(`[Stream Proxy] Playlist rewrite biti\u015Fi. Rewritten length: ${rewrittenContent.length} characters.`);
        res.setHeader("Content-Type", "application/x-mpegURL");
        console.log(`[Stream Proxy] Sending rewritten playlist content and ending response...`);
        return res.send(rewrittenContent);
      }
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      } else {
        if (streamUrl.includes(".ts")) {
          res.setHeader("Content-Type", "video/mp2t");
        } else {
          res.setHeader("Content-Type", "video/mp2t");
        }
      }
      if (response.body) {
        console.log(`[Stream Proxy] Initiating binary chunk streaming. Target: ${streamUrl}`);
        const reader = response.body.getReader();
        let totalBytesStreamed = 0;
        let chunkCount = 0;
        try {
          while (true) {
            console.log(`[Stream Proxy] Calling reader.read() for chunk #${chunkCount + 1}...`);
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[Stream Proxy] Stream reading complete (done: true). Total chunks: ${chunkCount}, Total bytes: ${totalBytesStreamed}`);
              break;
            }
            chunkCount++;
            totalBytesStreamed += value.length;
            console.log(`[Stream Proxy] res.write() ba\u015Flang\u0131c\u0131 - Chunk #${chunkCount} received. Size: ${value.length} bytes. Total so far: ${totalBytesStreamed} bytes.`);
            const writeSuccess = res.write(value);
            if (!writeSuccess) {
              console.log(`[Stream Proxy] res.write() buffer full for chunk #${chunkCount}, waiting for drain...`);
            }
          }
        } catch (readError) {
          console.error(`[Stream Proxy] EXCEPTION while reading stream body!`);
          console.error(`[Stream Proxy] Stack trace:
${readError?.stack || readError}`);
        } finally {
          console.log(`[Stream Proxy] Releasing lock on response body reader.`);
          reader.releaseLock();
        }
        console.log(`[Stream Proxy] Calling res.end() to complete response...`);
        res.end();
        console.log(`[Stream Proxy] res.end() called successfully.`);
      } else {
        console.log(`[Stream Proxy] Provider stream body is null!`);
        res.status(502).send("Provider stream body is empty");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("[Stream Proxy] Stream fetch aborted gracefully");
      } else {
        console.error(`[Stream Proxy Error]: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).send(`Stream Proxy connection failed: ${err.message}`);
        }
      }
    }
  });
  const xmltvCache = /* @__PURE__ */ new Map();
  function safeBase64Decode(str) {
    if (!str) return "";
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (base64Regex.test(str) && str.length % 4 === 0) {
      try {
        return Buffer.from(str, "base64").toString("utf-8");
      } catch (_) {
        return str;
      }
    }
    return str;
  }
  const extractTime = (dateStr) => {
    const match = dateStr.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "00:00";
  };
  function decodeXmlEntities(str) {
    return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  }
  function formatXmltvDate(dateStr) {
    if (dateStr && dateStr.length >= 12) {
      const hh = dateStr.substring(8, 10);
      const mm = dateStr.substring(10, 12);
      return `${hh}:${mm}`;
    }
    return "00:00";
  }
  function parseXMLTV(xmlText) {
    const programsByChannel = /* @__PURE__ */ new Map();
    const programmeRegex = /<programme\s+([^>]+)>([\s\S]*?)<\/programme>/g;
    let match;
    let index = 0;
    while ((match = programmeRegex.exec(xmlText)) !== null) {
      const attrs = match[1];
      const body = match[2];
      const channelMatch = attrs.match(/channel="([^"]+)"/);
      if (!channelMatch) continue;
      const channelId = channelMatch[1];
      const startMatch = attrs.match(/start="([^"]+)"/);
      const stopMatch = attrs.match(/stop="([^"]+)"/);
      if (!startMatch || !stopMatch) continue;
      const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : "No Title";
      const descMatch = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/);
      const desc = descMatch ? decodeXmlEntities(descMatch[1].trim()) : "";
      const startTime = formatXmltvDate(startMatch[1]);
      const stopTime = formatXmltvDate(stopMatch[1]);
      const prog = {
        id: `xmltv-${channelId}-${index++}`,
        title,
        start: startTime,
        end: stopTime,
        description: desc
      };
      if (!programsByChannel.has(channelId)) {
        programsByChannel.set(channelId, []);
      }
      programsByChannel.get(channelId).push(prog);
      if (index > 8e4) break;
    }
    return programsByChannel;
  }
  function generateFallbackEPG(channelId) {
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    const showConfigs = {
      "trt-haber": {
        tr: ["G\xFCn\xFCn Geli\u015Fmeleri", "Haber B\xFClteni", "Sat\u0131r Ba\u015F\u0131", "Ekonomi Raporu", "D\xFCnya G\xFCndemi", "Spor Penceresi"],
        en: ["Daily News", "Global Headlines", "Economic Report", "Sports Tonight", "Documentary Hour", "Debate"]
      },
      "trt-belgesel": {
        tr: ["Do\u011Fan\u0131n Mucizeleri", "Vah\u015Fi Ya\u015Fam", "Anadolu Co\u011Frafyas\u0131", "Mavi D\xFCnya", "Tarihin \u0130zinde", "Gezginin G\xFCnl\xFC\u011F\xFC"],
        en: ["Wonders of Nature", "Wilderness Diaries", "Hidden Geography", "Secrets of the Deep", "Footsteps of History", "Traveler Journal"]
      },
      "trt-spor": {
        tr: ["Spor St\xFCdyosu", "Transfer G\xFCnl\xFC\u011F\xFC", "Akt\xFCel Futbol", "Avrupa Kupalar\u0131 \xD6zet", "Klasik Ma\xE7lar", "Amat\xF6r Bran\u015Flar"],
        en: ["Sports Studio", "Transfer Central", "Football Analysis", "Euro Cup Highlights", "Classic Reels", "Olympic Sports"]
      },
      "trt-cocuk": {
        tr: ["Rafadan Tayfa", "K\xF6stebekgiller", "Maysa ve Bulut", "Ege ile Gaga", "\u0130stanbul Muhaf\u0131zlar\u0131", "Kelo\u011Flan"],
        en: ["Cartoon Club", "Puppet Land", "Tales of Magic", "Curious Detective", "City Protectors", "Heroic Kids"]
      },
      "nasa-tv": {
        tr: ["ISS Canl\u0131 Yay\u0131n", "Mars Ara\u015Ft\u0131rmalar\u0131", "Apollo Misyonlar\u0131", "Derin Uzay Teleskoplar\u0131", "Hubble G\xFCnl\xFCkleri", "Astronot E\u011Fitimi"],
        en: ["ISS Live Feed", "Mars Exploration Rover", "Apollo Missions Archive", "Deep Space Telescopes", "Hubble Chronicles", "Astronaut Training"]
      },
      "redbull-tv": {
        tr: ["X-Fighters Ar\u015Fiv", "U\xE7urum Atlay\u0131\u015F\u0131", "Formula 1 Analiz", "Da\u011F Bisikleti D\xFCnya Kupas\u0131", "S\xF6rf Maceralar\u0131", "S\u0131n\u0131rlar\u0131 Zorlayanlar"],
        en: ["X-Fighters Classic", "Cliff Diving World Series", "Formula 1 Masterclass", "MTB World Cup Highlights", "Surf Adventures", "Pushing Boundaries"]
      },
      "default": {
        tr: ["G\xFCndem \xD6zel", "Haber Ku\u015Fa\u011F\u0131", "Canl\u0131 Yay\u0131n", "D\xFCnya Turu", "Ak\u015Fam Raporu", "G\xFCn\xFCn \xD6zeti"],
        en: ["Global Perspective", "Live Broadcast", "World Tour", "Evening Report", "Day in Review", "Current Affairs"]
      }
    };
    const cleanId = channelId.toLowerCase().replace(/^(local-|xtream-|m3u-|demo-)/, "").replace(/-\d+.*$/, "");
    const config = showConfigs[cleanId] || showConfigs["default"];
    const programs = [];
    const baseTime = /* @__PURE__ */ new Date();
    baseTime.setMinutes(0);
    baseTime.setSeconds(0);
    baseTime.setHours(currentHour - 2);
    for (let i = 0; i < 6; i++) {
      const progStart = new Date(baseTime.getTime() + i * 1.5 * 60 * 60 * 1e3);
      const progEnd = new Date(progStart.getTime() + 1.5 * 60 * 60 * 1e3);
      const pad = (num) => String(num).padStart(2, "0");
      const startStr = `${pad(progStart.getHours())}:${pad(progStart.getMinutes())}`;
      const endStr = `${pad(progEnd.getHours())}:${pad(progEnd.getMinutes())}`;
      const trTitle = config.tr[i % config.tr.length];
      const enTitle = config.en[i % config.en.length];
      programs.push({
        id: `${channelId}-fallback-prog-${i}`,
        title: trTitle,
        start: startStr,
        end: endStr,
        description: `Bu program, ${trTitle} / ${enTitle} yay\u0131n\u0131d\u0131r. Android TV Box deneyiminiz i\xE7in optimize edilmi\u015F y\xFCksek \xE7\xF6z\xFCn\xFCrl\xFCkl\xFC yay\u0131nd\u0131r.`
      });
    }
    return programs;
  }
  app.post("/api/epg", async (req, res) => {
    const { playlistType, serverUrl, username, password, streamId, epgId, urlTvg, channelId } = req.body;
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (playlistType === "xtream" && serverUrl && username && password && streamId) {
      try {
        let normalizedUrl = serverUrl.trim();
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
          normalizedUrl = "http://" + normalizedUrl;
        }
        normalizedUrl = normalizedUrl.replace(/\/+$/, "");
        const epgUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${streamId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6e3);
        const response = await fetch(epgUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.epg_listings)) {
            const programs = data.epg_listings.map((item, idx) => {
              const title = safeBase64Decode(item.title || "Live Stream");
              const desc = safeBase64Decode(item.description || "");
              const start = item.start ? extractTime(item.start) : "00:00";
              const end = item.end ? extractTime(item.end) : "00:00";
              return {
                id: `xtream-epg-${streamId}-${idx}`,
                title,
                start,
                end,
                description: desc || `Canl\u0131 Yay\u0131n. Ba\u015Flang\u0131\xE7 saati: ${start}`
              };
            });
            if (programs.length > 0) {
              return res.json({ source: "xtream", programs });
            }
          }
        }
      } catch (err) {
        console.warn(`[EPG Service] Xtream short EPG retrieval failed: ${err.message}`);
      }
    }
    if (urlTvg && epgId) {
      try {
        let cached = xmltvCache.get(urlTvg);
        if (!cached || Date.now() - cached.fetchedAt > 60 * 60 * 1e3) {
          console.log(`[EPG Service] Ingesting XMLTV feed from: ${urlTvg}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12e3);
          const response = await fetch(urlTvg, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            const text = await response.text();
            const parsed = parseXMLTV(text);
            cached = {
              fetchedAt: Date.now(),
              programsByChannel: parsed
            };
            xmltvCache.set(urlTvg, cached);
          }
        }
        if (cached) {
          const programs = cached.programsByChannel.get(epgId);
          if (programs && programs.length > 0) {
            return res.json({ source: "xmltv", programs });
          }
        }
      } catch (err) {
        console.warn(`[EPG Service] XMLTV ingestion failed: ${err.message}`);
      }
    }
    const fallbackPrograms = generateFallbackEPG(channelId || "default");
    return res.json({ source: "fallback", programs: fallbackPrograms });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[Dev Server] Mounting Vite dev middleware.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("[Prod Server] Serving built client files from dist.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[IPTV Server] Running on http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
