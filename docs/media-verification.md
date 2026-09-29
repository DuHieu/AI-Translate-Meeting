# Local meeting media verification

## Compatibility

Docker pins LiveKit server v1.13.7 for the installed JavaScript client 2.21.0.
With server v1.7.2, Chrome joined the room and the server logged an audio
publication, but the client timed out waiting for negotiation to complete.
Publishing microphone and camera sequentially alone did not fix that failure.
Keeping the frontend unchanged and upgrading the server made initial publication
and two microphone/camera off-on cycles pass without negotiation errors.

The installed client waits for an acknowledged offer ID greater than its negotiation
checkpoint (`PCTransportManager.negotiate`). This explains why signaling connectivity
and server-side publication logs alone are insufficient proof of usable media.

## Local verification scope

- Real Docker API and LiveKit, Chrome with synthetic microphone/camera devices.
- Preview, join, initial media publication, two off-on cycles per device.
- Subtitle fixture injected over the browser WebSocket route checks rendering only.
- This does not prove physical device drivers, two-person audio quality, production
  NAT/TURN connectivity, or real speech recognition/translation accuracy.

Use http://127.0.0.1:3000 locally. The configured advertised loopback address is
for browsers on the Docker host; LAN/remote clients require an appropriate reachable
server address and HTTPS plus correct ICE/TURN configuration.

## Agent coordination

Antigravity CLI returned a static review after scoped read permissions were configured.
Its findings informed the shared publication lock and permission retry simplification.
The CLI attempted an artifact write which was denied; do not treat its SUCCESS status
as proof that every requested action succeeded. The wrapper rejects denied actions
and empty responses with exit code 2.
