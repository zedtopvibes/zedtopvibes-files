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

      // VIEW / DOWNLOAD FILE
      if (path.startsWith("/file/")) {
        const key = decodeURIComponent(path.replace("/file/", ""));
        const file = await env.recycle.get(key);
        if (!file) return new Response("Not found", { status: 404 });

        return new Response(file.body, {
          headers: {
            "Content-Type": file.httpMetadata?.contentType || "application/octet-stream",
            ...cors()
          }
        });
      }

      // LIST ACTIVE FILES
      if (path === "/list") {
        const list = await env.recycle.list();
        const files = list.objects
          .map(o => o.key)
          .filter(k => !k.startsWith("trash/"));
        return json(files);
      }

      // LIST TRASH
      if (path === "/trash") {
        const list = await env.recycle.list({ prefix: "trash/" });
        return json(list.objects.map(o => o.key));
      }

      // UPLOAD
      if (path === "/upload" && request.method === "POST") {
        const form = await request.formData();
        const file = form.get("file");
        if (!file) return error("No file");

        await env.recycle.put(file.name, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        return json({ success: true });
      }

      // DELETE → move to trash/
      if (path === "/delete" && request.method === "POST") {
        const { key } = await request.json();
        if (!key) return error("Missing key");

        const file = await env.recycle.get(key);
        if (!file) return error("Not found");

        await env.recycle.put("trash/" + key, file.body);
        await env.recycle.delete(key);

        return json({ success: true });
      }

      // RESTORE
      if (path === "/restore" && request.method === "POST") {
        const { key } = await request.json();
        if (!key) return error("Missing key");

        const file = await env.recycle.get(key);
        if (!file) return error("Not found in trash");

        const original = key.replace(/^trash\//, "");
        await env.recycle.put(original, file.body);
        await env.recycle.delete(key);

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

function html() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Public R2 File Manager</title>
<style>
body{font-family:Arial;padding:20px}
ul{list-style:none;padding:0}
button{margin-left:6px}
a{margin-left:6px}
</style>
</head>
<body>

<h2>Upload File</h2>
<form id="upload">
<input type="file" name="file" required>
<button>Upload</button>
</form>

<h2>Files</h2>
<ul id="files"></ul>

<h2>Trash</h2>
<ul id="trash"></ul>

<script>
async function api(url,opt){
  const r=await fetch(url,opt);
  return r.json();
}

async function load(){
  const files=await api('/list');
  const trash=await api('/trash');

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