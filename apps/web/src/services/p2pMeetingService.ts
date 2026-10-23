import { joinRoom, selfId, type Room, type MessageAction } from 'trystero';
import { ChatMessage, SupportedLanguage } from '../types/meeting';
import { SubtitleMessage } from '../types/subtitle';
import {
  classifySubtitleLayaTags,
  translateTextP2P,
  type P2PTranslationEngineName,
} from './p2pAiTranslatorService';

export interface P2PPeerParticipant {
  peerId: string;
  participantId: string;
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  raisedHand: boolean;
  joinedAt: string;
  transport: 'internet-webrtc' | 'local-webrtc';
  cameraStream?: MediaStream | null;
  screenStream?: MediaStream | null;
}

export interface P2PPresencePayload {
  [key: string]: string | boolean;
  packetId: string;
  peerId: string;
  participantId: string;
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  raisedHand: boolean;
  joinedAt: string;
}

export interface P2PSubtitleWirePayload {
  [key: string]: string | number | boolean | string[] | null;
  id: string;
  meetingId: string;
  peerId: string;
  participantId: string;
  participantName: string;
  sourceLanguage: SupportedLanguage;
  originalText: string;
  preTranslatedTarget: string;
  preTranslatedText: string;
  isFinal: boolean;
  confidence: number;
  timestamp: string;
  sentAtMs: number;
  tags: string[];
  isActionItem: boolean;
  isDecision: boolean;
  topic: string | null;
}

export interface P2PChatWirePayload {
  [key: string]: string | number | null;
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  attachmentName: string | null;
  attachmentSize: number | null;
}

export interface P2PReactionWirePayload {
  [key: string]: string;
  id: string;
  emoji: string;
  senderName: string;
}

interface LocalSignalEnvelope {
  type: 'hello' | 'sdp-offer' | 'sdp-answer' | 'ice-candidate' | 'leave' | 'data-packet';
  fromPeerId: string;
  toPeerId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  streamRole?: 'camera' | 'screen';
  packetKind?: 'presence' | 'subtitle' | 'chat' | 'reaction';
  payload?: unknown;
}

export interface P2PMeetingCallbacks {
  onPeersUpdated: (peers: P2PPeerParticipant[]) => void;
  onSubtitleReceived: (subtitle: SubtitleMessage, engine?: P2PTranslationEngineName) => void;
  onChatReceived: (message: ChatMessage) => void;
  onReactionReceived: (emoji: string, senderName: string) => void;
  onTransportStatusChange?: (status: {
    connectedPeers: number;
    internetRelaysReady: boolean;
    localBridgeActive: boolean;
  }) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

const PUBLIC_NOSTR_RELAYS: string[] = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.snort.social',
];

function createPacketId(prefix = 'p2p'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class P2PMeetingRoomController {
  public readonly localPeerId: string;
  private room: Room | null = null;
  private meetingCode = '';
  private localPresence: P2PPresencePayload;
  private peers: Map<string, P2PPeerParticipant> = new Map();
  private seenPacketIds: Set<string> = new Set();
  private callbacks: P2PMeetingCallbacks;

  // Trystero Internet WebRTC DataChannel actions
  private presenceAction: MessageAction<P2PPresencePayload> | null = null;
  private subtitleAction: MessageAction<P2PSubtitleWirePayload> | null = null;
  private chatAction: MessageAction<P2PChatWirePayload> | null = null;
  private reactionAction: MessageAction<P2PReactionWirePayload> | null = null;

  // Local BroadcastChannel + RTCPeerConnection bridge (for instant same-machine / offline multi-tab P2P)
  private localChannel: BroadcastChannel | null = null;
  private localConnections: Map<string, RTCPeerConnection> = new Map();

  private localCameraStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private heartbeatTimer: number | null = null;

  constructor(
    options: {
      meetingCode: string;
      participantId: string;
      displayName: string;
      spokenLanguage: SupportedLanguage;
      targetLanguage: SupportedLanguage;
      isMicOn: boolean;
      isCameraOn: boolean;
    },
    callbacks: P2PMeetingCallbacks,
  ) {
    this.localPeerId = `${selfId}-${Math.random().toString(36).slice(2, 6)}`;
    this.meetingCode = options.meetingCode.trim().toUpperCase();
    this.callbacks = callbacks;

    this.localPresence = {
      packetId: createPacketId('pres'),
      peerId: this.localPeerId,
      participantId: options.participantId,
      displayName: options.displayName || 'Participant',
      spokenLanguage: options.spokenLanguage,
      targetLanguage: options.targetLanguage,
      isMicOn: options.isMicOn,
      isCameraOn: options.isCameraOn,
      isScreenSharing: false,
      isSpeaking: false,
      raisedHand: false,
      joinedAt: new Date().toISOString(),
    };
  }

  connect(): void {
    const roomId = `layameet-room-${this.meetingCode.toLowerCase()}`;

    // 1. Connect via Trystero Internet Decentralized Relays (Nostr WebRTC Mesh)
    try {
      this.room = joinRoom(
        {
          appId: 'layameet-enterprise-p2p-v1',
          relayConfig: {
            urls: PUBLIC_NOSTR_RELAYS,
            redundancy: 3,
          },
          rtcConfig: {
            iceServers: DEFAULT_ICE_SERVERS,
          },
        },
        roomId,
      );

      this.presenceAction = this.room.makeAction<P2PPresencePayload>('lm-presence', {
        onMessage: (data, context) => {
          this.handleIncomingPresence(data, context.peerId, 'internet-webrtc');
        },
      });

      this.subtitleAction = this.room.makeAction<P2PSubtitleWirePayload>('lm-subtitle', {
        onMessage: (data) => {
          void this.handleIncomingSubtitle(data);
        },
      });

      this.chatAction = this.room.makeAction<P2PChatWirePayload>('lm-chat', {
        onMessage: (data) => {
          this.handleIncomingChat(data);
        },
      });

      this.reactionAction = this.room.makeAction<P2PReactionWirePayload>('lm-reaction', {
        onMessage: (data) => {
          this.handleIncomingReaction(data);
        },
      });

      this.room.onPeerJoin = (peerId: string) => {
        this.broadcastPresence(peerId);
        if (this.localCameraStream) {
          this.room?.addStream(this.localCameraStream, {
            target: peerId,
            metadata: { kind: 'camera', peerId: this.localPeerId },
          });
        }
        if (this.localScreenStream) {
          this.room?.addStream(this.localScreenStream, {
            target: peerId,
            metadata: { kind: 'screen', peerId: this.localPeerId },
          });
        }
        this.emitTransportStatus();
      };

      this.room.onPeerLeave = (peerId: string) => {
        let removed = false;
        for (const [key, peer] of this.peers.entries()) {
          if (key === peerId || peer.peerId === peerId) {
            this.peers.delete(key);
            removed = true;
          }
        }
        if (removed) {
          this.emitPeersUpdated();
          this.emitTransportStatus();
        }
      };

      this.room.onPeerStream = (stream: MediaStream, peerId: string, metadata) => {
        const metaObj =
          metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
        const logicalPeerId =
          typeof metaObj.peerId === 'string' && metaObj.peerId ? metaObj.peerId : peerId;
        const kind = metaObj.kind === 'screen' ? 'screen' : 'camera';
        this.attachRemoteStream(logicalPeerId, stream, kind, 'internet-webrtc');
      };
    } catch (err) {
      console.warn('[P2P] Internet relay room init warning:', err);
    }

    // 2. Connect Local BroadcastChannel + Direct WebRTC Bridge (instant multi-tab & offline LAN/loopback)
    this.initLocalWebRtcBridge(roomId);

    // 3. Periodic presence heartbeat so newly joined peers stay in sync
    this.broadcastPresence();
    this.heartbeatTimer = window.setInterval(() => {
      this.broadcastPresence();
    }, 6000);

    this.emitTransportStatus();
  }

  private initLocalWebRtcBridge(roomId: string) {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const channel = new BroadcastChannel(`layameet-p2p-bridge:${roomId}`);
      this.localChannel = channel;

      channel.onmessage = (event: MessageEvent<LocalSignalEnvelope>) => {
        const msg = event.data;
        if (!msg || msg.fromPeerId === this.localPeerId) return;
        if (msg.toPeerId && msg.toPeerId !== this.localPeerId) return;

        void this.handleLocalBridgeMessage(msg);
      };

      channel.postMessage({
        type: 'hello',
        fromPeerId: this.localPeerId,
      } satisfies LocalSignalEnvelope);
    } catch {
      // BroadcastChannel not supported
    }
  }

  private async handleLocalBridgeMessage(msg: LocalSignalEnvelope) {
    const remotePeerId = msg.fromPeerId;

    if (msg.type === 'hello') {
      this.broadcastPresence();
      await this.initiateLocalPeerConnection(remotePeerId);
      return;
    }

    if (msg.type === 'leave') {
      const pc = this.localConnections.get(remotePeerId);
      if (pc) {
        pc.close();
        this.localConnections.delete(remotePeerId);
      }
      if (this.peers.delete(remotePeerId)) {
        this.emitPeersUpdated();
        this.emitTransportStatus();
      }
      return;
    }

    if (msg.type === 'data-packet') {
      if (msg.packetKind === 'presence' && msg.payload) {
        this.handleIncomingPresence(msg.payload as P2PPresencePayload, remotePeerId, 'local-webrtc');
      } else if (msg.packetKind === 'subtitle' && msg.payload) {
        await this.handleIncomingSubtitle(msg.payload as P2PSubtitleWirePayload);
      } else if (msg.packetKind === 'chat' && msg.payload) {
        this.handleIncomingChat(msg.payload as P2PChatWirePayload);
      } else if (msg.packetKind === 'reaction' && msg.payload) {
        this.handleIncomingReaction(msg.payload as P2PReactionWirePayload);
      }
      return;
    }

    if (msg.type === 'sdp-offer' && msg.sdp) {
      const pc = this.getOrCreateLocalPeerConnection(remotePeerId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.localChannel?.postMessage({
          type: 'sdp-answer',
          fromPeerId: this.localPeerId,
          toPeerId: remotePeerId,
          sdp: pc.localDescription ? { type: pc.localDescription.type, sdp: pc.localDescription.sdp } : answer,
        } satisfies LocalSignalEnvelope);
      } catch {
        // Ignore renegotiation glare
      }
      return;
    }

    if (msg.type === 'sdp-answer' && msg.sdp) {
      const pc = this.localConnections.get(remotePeerId);
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } catch {
          // Ignore
        }
      }
      return;
    }

    if (msg.type === 'ice-candidate' && msg.candidate) {
      const pc = this.localConnections.get(remotePeerId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          // Ignore
        }
      }
    }
  }

  private getOrCreateLocalPeerConnection(remotePeerId: string): RTCPeerConnection {
    const existing = this.localConnections.get(remotePeerId);
    if (existing && existing.connectionState !== 'closed') {
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
    this.localConnections.set(remotePeerId, pc);

    if (this.localCameraStream) {
      this.localCameraStream.getTracks().forEach((track) => {
        if (this.localCameraStream) {
          pc.addTrack(track, this.localCameraStream);
        }
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.localChannel?.postMessage({
          type: 'ice-candidate',
          fromPeerId: this.localPeerId,
          toPeerId: remotePeerId,
          candidate: event.candidate.toJSON(),
        } satisfies LocalSignalEnvelope);
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      this.attachRemoteStream(remotePeerId, stream, 'camera', 'local-webrtc');
    };

    return pc;
  }

  private async initiateLocalPeerConnection(remotePeerId: string) {
    if (typeof RTCPeerConnection === 'undefined') return;
    const pc = this.getOrCreateLocalPeerConnection(remotePeerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.localChannel?.postMessage({
        type: 'sdp-offer',
        fromPeerId: this.localPeerId,
        toPeerId: remotePeerId,
        sdp: pc.localDescription ? { type: pc.localDescription.type, sdp: pc.localDescription.sdp } : offer,
      } satisfies LocalSignalEnvelope);
    } catch {
      // Ignore
    }
  }

  private markPacketSeen(id: string): boolean {
    if (!id) return false;
    if (this.seenPacketIds.has(id)) return true;
    if (this.seenPacketIds.size > 1000) {
      const oldest = this.seenPacketIds.values().next().value;
      if (oldest) this.seenPacketIds.delete(oldest);
    }
    this.seenPacketIds.add(id);
    return false;
  }

  private handleIncomingPresence(
    data: P2PPresencePayload,
    fallbackPeerId: string,
    transport: 'internet-webrtc' | 'local-webrtc',
  ) {
    if (!data || data.peerId === this.localPeerId) return;
    const key = data.peerId || fallbackPeerId;
    const existing = this.peers.get(key);

    const updated: P2PPeerParticipant = {
      peerId: key,
      participantId: data.participantId || key,
      displayName: data.displayName || 'Participant',
      spokenLanguage: data.spokenLanguage || 'vi',
      targetLanguage: data.targetLanguage || 'en',
      isMicOn: Boolean(data.isMicOn),
      isCameraOn: Boolean(data.isCameraOn),
      isScreenSharing: Boolean(data.isScreenSharing),
      isSpeaking: Boolean(data.isSpeaking),
      raisedHand: Boolean(data.raisedHand),
      joinedAt: data.joinedAt || existing?.joinedAt || new Date().toISOString(),
      transport: existing?.transport === 'internet-webrtc' ? 'internet-webrtc' : transport,
      cameraStream: existing?.cameraStream || null,
      screenStream: existing?.screenStream || null,
    };

    this.peers.set(key, updated);
    this.emitPeersUpdated();
    this.emitTransportStatus();
  }

  private attachRemoteStream(
    peerId: string,
    stream: MediaStream,
    kind: 'camera' | 'screen',
    transport: 'internet-webrtc' | 'local-webrtc',
  ) {
    const existing = this.peers.get(peerId) || {
      peerId,
      participantId: peerId,
      displayName: `Peer ${peerId.slice(0, 4)}`,
      spokenLanguage: 'vi' as SupportedLanguage,
      targetLanguage: 'en' as SupportedLanguage,
      isMicOn: true,
      isCameraOn: true,
      isScreenSharing: kind === 'screen',
      isSpeaking: false,
      raisedHand: false,
      joinedAt: new Date().toISOString(),
      transport,
      cameraStream: null,
      screenStream: null,
    };

    if (kind === 'screen') {
      existing.screenStream = stream;
      existing.isScreenSharing = true;
    } else {
      existing.cameraStream = stream;
    }

    this.peers.set(peerId, { ...existing });
    this.emitPeersUpdated();
  }

  private async handleIncomingSubtitle(wire: P2PSubtitleWirePayload) {
    if (!wire || wire.peerId === this.localPeerId) return;
    const dedupeKey = `${wire.id}:${wire.isFinal ? 'final' : wire.originalText}`;
    if (this.markPacketSeen(dedupeKey)) return;

    const myTargetLang = this.localPresence.targetLanguage;
    let translatedText = wire.originalText;
    let engineUsed: P2PTranslationEngineName = 'local-fallback';

    if (wire.sourceLanguage === myTargetLang) {
      translatedText = wire.originalText;
    } else if (wire.preTranslatedTarget === myTargetLang && wire.preTranslatedText) {
      translatedText = wire.preTranslatedText;
      engineUsed = 'neural-edge';
    } else {
      const res = await translateTextP2P(wire.originalText, wire.sourceLanguage, myTargetLang);
      translatedText = res.translatedText;
      engineUsed = res.engine;
    }

    const subtitle: SubtitleMessage = {
      id: wire.id,
      meetingId: wire.meetingId,
      participantId: wire.participantId,
      participantName: wire.participantName,
      sourceLanguage: wire.sourceLanguage,
      targetLanguage: myTargetLang,
      originalText: wire.originalText,
      translatedText,
      isFinal: wire.isFinal,
      timestamp: wire.timestamp,
      tags: Array.isArray(wire.tags) ? wire.tags : [],
      confidence: wire.confidence,
      latencyMs: Math.max(8, Date.now() - (wire.sentAtMs || Date.now())),
      layaMetadata: {
        isActionItem: Boolean(wire.isActionItem),
        isDecision: Boolean(wire.isDecision),
        topic: wire.topic || null,
      },
    };

    this.callbacks.onSubtitleReceived(subtitle, engineUsed);
  }

  private handleIncomingChat(wire: P2PChatWirePayload) {
    if (!wire || this.markPacketSeen(wire.id)) return;
    const msg: ChatMessage = {
      id: wire.id,
      senderId: wire.senderId,
      senderName: wire.senderName,
      text: wire.text,
      timestamp: wire.timestamp,
      attachment: wire.attachmentName
        ? {
            name: wire.attachmentName,
            size: wire.attachmentSize || 0,
          }
        : undefined,
    };
    this.callbacks.onChatReceived(msg);
  }

  private handleIncomingReaction(wire: P2PReactionWirePayload) {
    if (!wire || this.markPacketSeen(wire.id)) return;
    this.callbacks.onReactionReceived(wire.emoji, wire.senderName);
  }

  broadcastPresence(targetPeerId?: string) {
    this.localPresence.packetId = createPacketId('pres');
    try {
      void this.presenceAction?.send(
        this.localPresence,
        targetPeerId ? { target: targetPeerId } : undefined,
      );
    } catch {
      // Ignore
    }

    this.localChannel?.postMessage({
      type: 'data-packet',
      fromPeerId: this.localPeerId,
      toPeerId: targetPeerId,
      packetKind: 'presence',
      payload: this.localPresence,
    } satisfies LocalSignalEnvelope);
  }

  updateLocalState(
    patch: Partial<
      Pick<
        P2PPresencePayload,
        | 'displayName'
        | 'spokenLanguage'
        | 'targetLanguage'
        | 'isMicOn'
        | 'isCameraOn'
        | 'isScreenSharing'
        | 'isSpeaking'
        | 'raisedHand'
      >
    >,
  ) {
    Object.assign(this.localPresence, patch);
    this.broadcastPresence();
  }

  async setCameraStream(stream: MediaStream | null) {
    if (this.localCameraStream && this.room) {
      try {
        this.room.removeStream(this.localCameraStream);
      } catch {
        // Ignore
      }
    }
    this.localCameraStream = stream;

    if (stream && this.room) {
      try {
        this.room.addStream(stream, {
          metadata: { kind: 'camera', peerId: this.localPeerId },
        });
      } catch {
        // Ignore
      }
    }

    // Also update local BroadcastChannel WebRTC peers
    for (const [remotePeerId, pc] of this.localConnections.entries()) {
      const senders = pc.getSenders();
      senders.forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {
          // Ignore
        }
      });
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }
      await this.initiateLocalPeerConnection(remotePeerId);
    }
  }

  setScreenStream(stream: MediaStream | null) {
    if (this.localScreenStream && this.room) {
      try {
        this.room.removeStream(this.localScreenStream);
      } catch {
        // Ignore
      }
    }
    this.localScreenStream = stream;
    this.updateLocalState({ isScreenSharing: Boolean(stream) });

    if (stream && this.room) {
      try {
        this.room.addStream(stream, {
          metadata: { kind: 'screen', peerId: this.localPeerId },
        });
      } catch {
        // Ignore
      }
    }
  }

  async broadcastSubtitleUtterance(
    utteranceId: string,
    originalText: string,
    isFinal: boolean,
    confidence = 0.92,
  ): Promise<SubtitleMessage | null> {
    const clean = originalText.trim();
    if (!clean) return null;

    const sourceLang = this.localPresence.spokenLanguage;
    const myTargetLang = this.localPresence.targetLanguage;

    // Pick the most common target language among peers or our own targetLanguage for pre-translation
    const peerTargetLang =
      Array.from(this.peers.values())[0]?.targetLanguage ||
      (myTargetLang !== sourceLang ? myTargetLang : sourceLang === 'vi' ? 'en' : 'vi');

    const translationResult = await translateTextP2P(clean, sourceLang, peerTargetLang);
    const laya = isFinal
      ? classifySubtitleLayaTags(clean)
      : { tags: [], layaMetadata: { isDecision: false, isActionItem: false, topic: null } };

    const timestamp = new Date().toISOString();
    const wirePayload: P2PSubtitleWirePayload = {
      id: utteranceId,
      meetingId: this.meetingCode,
      peerId: this.localPeerId,
      participantId: this.localPresence.participantId,
      participantName: this.localPresence.displayName,
      sourceLanguage: sourceLang,
      originalText: clean,
      preTranslatedTarget: peerTargetLang,
      preTranslatedText: translationResult.translatedText,
      isFinal,
      confidence,
      timestamp,
      sentAtMs: Date.now(),
      tags: laya.tags,
      isActionItem: Boolean(laya.layaMetadata.isActionItem),
      isDecision: Boolean(laya.layaMetadata.isDecision),
      topic: laya.layaMetadata.topic || null,
    };

    try {
      void this.subtitleAction?.send(wirePayload);
    } catch {
      // Ignore
    }

    this.localChannel?.postMessage({
      type: 'data-packet',
      fromPeerId: this.localPeerId,
      packetKind: 'subtitle',
      payload: wirePayload,
    } satisfies LocalSignalEnvelope);

    const localSubtitle: SubtitleMessage = {
      id: utteranceId,
      meetingId: this.meetingCode,
      participantId: this.localPresence.participantId,
      participantName: this.localPresence.displayName,
      sourceLanguage: sourceLang,
      targetLanguage: peerTargetLang,
      originalText: clean,
      translatedText: translationResult.translatedText,
      isFinal,
      timestamp,
      tags: laya.tags,
      confidence,
      latencyMs: translationResult.latencyMs,
      layaMetadata: laya.layaMetadata,
    };

    this.callbacks.onSubtitleReceived(localSubtitle, translationResult.engine);
    return localSubtitle;
  }

  sendChatMessage(text: string, attachment?: ChatMessage['attachment']): ChatMessage {
    const msg: ChatMessage = {
      id: createPacketId('chat'),
      senderId: this.localPresence.participantId,
      senderName: this.localPresence.displayName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      attachment,
    };
    this.markPacketSeen(msg.id);

    const wire: P2PChatWirePayload = {
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
      timestamp: msg.timestamp,
      attachmentName: attachment?.name || null,
      attachmentSize: attachment?.size ?? null,
    };

    try {
      void this.chatAction?.send(wire);
    } catch {
      // Ignore
    }

    this.localChannel?.postMessage({
      type: 'data-packet',
      fromPeerId: this.localPeerId,
      packetKind: 'chat',
      payload: wire,
    } satisfies LocalSignalEnvelope);

    return msg;
  }

  sendReaction(emoji: string) {
    const wire: P2PReactionWirePayload = {
      id: createPacketId('react'),
      emoji,
      senderName: this.localPresence.displayName,
    };
    this.markPacketSeen(wire.id);

    try {
      void this.reactionAction?.send(wire);
    } catch {
      // Ignore
    }

    this.localChannel?.postMessage({
      type: 'data-packet',
      fromPeerId: this.localPeerId,
      packetKind: 'reaction',
      payload: wire,
    } satisfies LocalSignalEnvelope);
  }

  private emitPeersUpdated() {
    this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
  }

  private emitTransportStatus() {
    this.callbacks.onTransportStatusChange?.({
      connectedPeers: this.peers.size,
      internetRelaysReady: Boolean(this.room),
      localBridgeActive: Boolean(this.localChannel),
    });
  }

  disconnect() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    try {
      this.localChannel?.postMessage({
        type: 'leave',
        fromPeerId: this.localPeerId,
      } satisfies LocalSignalEnvelope);
      this.localChannel?.close();
    } catch {
      // Ignore
    }
    this.localChannel = null;

    for (const pc of this.localConnections.values()) {
      try {
        pc.close();
      } catch {
        // Ignore
      }
    }
    this.localConnections.clear();

    if (this.room) {
      try {
        void this.room.leave();
      } catch {
        // Ignore
      }
      this.room = null;
    }

    this.peers.clear();
  }
}
