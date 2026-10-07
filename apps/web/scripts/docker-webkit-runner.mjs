import net from 'node:net';
import { spawn } from 'node:child_process';
// Pure TCP forwarding makes the existing localhost URLs reachable in the Linux
// browser container. No API response, token, media or business logic is mocked.
const ports = [5173, 4173, 4183, 4184, 4185, 4186, 7880, 7881, 5000, 8000];
for (const port of ports) {
  const server = net.createServer(socket => {
    const upstream = net.connect(port, 'host.docker.internal');
    socket.pipe(upstream); upstream.pipe(socket);
    socket.on('error',()=>upstream.destroy()); upstream.on('error',()=>socket.destroy());
  });
  await new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(port,'127.0.0.1',resolve); });
}
const child = spawn('node',[process.env.QA_SCRIPT || 'scripts/mobile-e2e.mjs'],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));
