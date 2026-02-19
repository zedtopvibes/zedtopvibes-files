export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    try {

      // UI
      if (path === "/") {
        return new Response(html(), {
          headers: { "Content-Type": "text/html" }
        });
      }

      // VIEW FILE
      if (path.startsWith("/file/")) {
        const key = decodeURIComponent(path.replace("/file/", ""));
        const file = await env.recycle.get(key);
        if (!file) return new Response("Not found", { status: 404 });

        await log(env, "download", key, request);

        return new Response(file.body, {
          headers: {
            "Content-Type": file.httpMetadata?.contentType || "application/octet-stream",
            ...cors()
          }
        });
      }

      // LIST FILES
      if (path === "/list") {
        const list = await env.recycle.list();
        const files = list.objects
          .map(o => o.key)
          .filter(k => !k.startsWith("trash/") && !k.startsWith("_logs/"));
        return json(files);
      }

      // LIST TRASH
      if (path === "/trash") {
        const list = await env.recycle.list({ prefix: "trash/" });
        return json(list.objects.map(o => o.key));
      }

      // GET LOGS
      if (path === "/logs") {
        const logFile = await env.recycle.get("_logs/activity.json");
        if (!logFile) return json([]);
        return new Response(logFile.body, {
          headers: { "Content-Type": "application/json", ...cors() }
        });
      }

      // UPLOAD
      if (path === "/upload" && request.method === "POST") {
        const form = await request.formData();
        const file = form.get("file");
        if (!file) return error("No file");

        await env.recycle.put(file.name, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        await log(env, "upload", file.name, request);

        return json({ success: true });
      }

      // DELETE
      if (path === "/delete" && request.method === "POST") {
        const { key } = await request.json();
        if (!key) return error("Missing key");

        const file = await env.recycle.get(key);
        if (!file) return error("Not found");

        await env.recycle.put("trash/" + key, file.body);
        await env.recycle.delete(key);

        await log(env, "delete", key, request);

        return json({ success: true });
      }

      // RESTORE
      if (path === "/restore" && request.method === "POST") {
        const { key } = await request.json();
        if (!key) return error("Missing key");

        const file = await env.recycle.get(key);
        if (!file) return error("Not found");

        const original = key.replace(/^trash\//, "");
        await env.recycle.put(original, file.body);
        await env.recycle.delete(key);

        await log(env, "restore", original, request);

        return json({ success: true });
      }

      return error("Not found", 404);

    } catch (err) {
      return error(err.message);
    }
  }
};

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

function error(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

async function log(env, action, file, request) {
  const logKey = "_logs/activity.json";
  const existing = await env.recycle.get(logKey);

  let logs = [];
  if (existing) {
    logs = JSON.parse(await existing.text());
  }

  logs.unshift({
    action,
    file,
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    time: new Date().toISOString()
  });

  // keep only latest 100 logs
  logs = logs.slice(0, 100);

  await env.recycle.put(logKey, JSON.stringify(logs), {
    httpMetadata: { contentType: "application/json" }
  });
}

function html() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Public R2 Manager</title>
<style>
body{font-family:Arial;padding:20px}
ul{list-style:none;padding:0}
button{margin-left:6px}
pre{background:#f4f4f4;padding:10px;overflow:auto}
</style>
</head>
<body>

<h2>Upload</h2>
<form id="upload">
<input type="file" name="file" required>
<button>Upload</button>
</form>

<h2>Files</h2>
<ul id="files"></ul>

<h2>Trash</h2>
<ul id="trash"></ul>

<h2>Activity Logs</h2>
<pre id="logs"></pre>

<script>
async function api(url,opt){
  const r=await fetch(url,opt);
  return r.json();
}

async function load(){
  const files=await api('/list');
  const trash=await api('/trash');
  const logs=await api('/logs');

  document.getElementById('files').innerHTML=
    files.map(f =>
      '<li>'+f+
      ' <a href="/file/'+encodeURIComponent(f)+'" target="_blank">View</a>'+
      ' <button onclick="del(\\''+f+'\\')">Delete</button></li>'
    ).join('');

  document.getElementById('trash').innerHTML=
    trash.map(f =>
      '<li>'+f+
      ' <button onclick="restore(\\''+f+'\\')">Restore</button></li>'
    ).join('');

  document.getElementById('logs').textContent=
    logs.map(l =>
      l.time+" | "+l.action+" | "+l.file+" | "+l.ip
    ).join("\\n");
}

async function del(key){
  await api('/delete',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key})
  });
  load();
}

async function restore(key){
  await api('/restore',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key})
  });
  load();
}

document.getElementById('upload').onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  await fetch('/upload',{method:'POST',body:fd});
  e.target.reset();
  load();
};

load();
</script>

</body>
</html>
`;
}