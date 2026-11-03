const http=require('http');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'dist');
http.createServer((req,res)=>{
  const route=req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0].replace(/^\/+/, '');
  const file=path.join(root,decodeURIComponent(route));
  if(!file.startsWith(root)){res.writeHead(403);return res.end()}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(data)
  })
}).listen(8765,'127.0.0.1',()=>console.log('http://127.0.0.1:8765'));
