import { copyText } from '../utils/clipboard';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Terminal,
  Cpu,
  Layers,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  Key,
  Database,
  Radio,
  BookOpen
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Footer } from '../components/common/Footer';
import { LegalModal } from '../components/common/LegalModal';

interface CodeSnippet {
  language: string;
  code: string;
  title: string;
}

const SNIPPETS: Record<string, CodeSnippet> = {
  createRoom: {
    title: '1. Khởi tạo phiên họp (REST API)',
    language: 'bash',
    code: `curl -X POST https://api.layameet.com/api/meetings \\
  -H "Content-Type: application/json" \\
  -H "X-Host-Key: your_enterprise_host_key" \\
  -d '{
    "name": "Global Polyglot Standup"
  }'`,
  },
  wsConnect: {
    title: '2. Kết nối luồng phụ đề WebSocket Real-time',
    language: 'javascript',
    code: `// Kết nối WebSocket Audio Streaming & Subtitle Stream
const ws = new WebSocket("wss://api.layameet.com/ws/transcribe?room=ROOM_CODE");

ws.onopen = () => {
  // Gửi Auth Frame với Admission Token & Cấu hình ngôn ngữ
  ws.send(JSON.stringify({
    type: "auth",
    token: "SUBTITLE_ACCESS_TOKEN",
    spoken_language: "vi",      // Ngôn ngữ nói của bạn (vi, ja, en, zh, th, la...)
    target_language: "en"       // Ngôn ngữ bạn muốn nhận phụ đề
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "subtitle_broadcast") {
    console.log(\`[\${msg.speaker_name}]: \${msg.original_text}\`);
    console.log(\`-> Dịch (\${msg.target_language}): \${msg.translated_text}\`);
    console.log(\`-> Độ trễ: \${msg.latency_ms}ms | IsFinal: \${msg.is_final}\`);
  }
};`,
  },
  audioChunking: {
    title: '3. Truyền Audio Stream 350ms (Linear PCM 16kHz)',
    language: 'javascript',
    code: `// Trích xuất mic stream từ AudioWorklet
// Định dạng: 16000Hz, 16-bit Mono, Little-Endian PCM
workletNode.port.onmessage = (e) => {
  const pcm16Chunk = e.data; // Float32Array converted to Int16Array (350ms ~ 11.200 bytes)
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(pcm16Chunk.buffer);
  }
};`,
  },
  dockerDeploy: {
    title: '4. Tự triển khai On-Premise (Docker Compose)',
    language: 'yaml',
    code: `# docker-compose.yml - LayaMeet Enterprise Edge
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:v1.13.7
    command: --config /etc/livekit.yaml
    ports: ["7880:7880", "7882:7882/udp"]

  layameet-api:
    image: ghcr.io/du-hieu/layameet-api:latest
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - LiveKit__ApiKey=\${LIVEKIT_API_KEY}
      - LiveKit__ApiSecret=\${LIVEKIT_API_SECRET}

  layameet-ai-engine:
    image: ghcr.io/du-hieu/layameet-ai-service:latest
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu] # Tùy chọn tăng tốc CUDA cho Whisper

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly no --maxmemory 1gb`,
  },
};

export const DevelopersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'createRoom' | 'wsConnect' | 'audioChunking' | 'dockerDeploy'>('createRoom');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  const handleCopy = async (key: string, code: string) => {
    const copied = await copyText(code);
    setCopyError(copied ? null : 'Không thể sao chép tự động. Hãy chọn và sao chép mã ví dụ bên dưới.');
    if (!copied) return;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="relative content-page min-h-dvh bg-zinc-50 dark:bg-[#0f0f10] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors overflow-x-hidden">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="h-12 border-b border-[#2e2e30]/80 dark:border-[#2e2e30] border-zinc-200 bg-[#0f0f10]/85 dark:bg-[#0f0f10]/85 bg-white/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" aria-label="Về trang chủ LayaMeet" className="flex items-center gap-2 group text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800" />
          <LayaMeetLogo size="md" showBadge={true} />
          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold">
            DevHub
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="https://github.com/DuHieu/AI-Translate-Meeting"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
            <Terminal className="w-3.5 h-3.5" />
            <span>LayaMeet Open Developer Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 dark:text-white tracking-tight">
            Tài liệu Tích hợp &amp; API dành cho <span className="text-blue-600 dark:text-blue-400">Nhà Phát Triển</span>
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-3xl leading-relaxed">
            Nhúng khả năng nhận dạng giọng nói đa ngôn ngữ, dịch trực tiếp song song (Any-to-Any) và Laya AI Meeting Minutes vào hệ thống họp trực tuyến hoặc CRM của bạn qua WebRTC và WebSocket.
          </p>
        </div>

        {/* Core Architecture Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] space-y-2">
            <Radio className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">LiveKit WebRTC</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Truyền âm thanh/video p2p &amp; SFU đa điểm với độ trễ dưới 50ms, tự động thích ứng băng thông.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] space-y-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Whisper int8 STT</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Engine nhận dạng giọng nói đa luồng CPU/GPU, VAD tích hợp lọc nhiễu, TTFS ~964ms.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] space-y-2">
            <Database className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Redis Polyglot Cache</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Lưu đệm bản dịch phân tán TTL 24h, độ trễ dịch &lt;350ms với 50+ cặp ngôn ngữ ma trận.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] space-y-2">
            <Layers className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Laya AI Sidecar</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Trích xuất Key Decisions và Action Items bất đồng bộ, không block critical path hiển thị phụ đề.
            </p>
          </div>
        </div>

        {/* Interactive Code Playground / Docs */}
        <div className="rounded-2xl border border-zinc-200 dark:border-[#2e2e30] bg-white dark:bg-[#141416] overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-[#2e2e30] bg-zinc-50/80 dark:bg-[#1a1a1b]/80 overflow-x-auto text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('createRoom')}
              className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'createRoom'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#141416] font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>1. Tạo phòng (API)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wsConnect')}
              className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'wsConnect'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#141416] font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>2. WebSocket Subtitle</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audioChunking')}
              className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'audioChunking'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#141416] font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>3. Audio Worklet 350ms</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dockerDeploy')}
              className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'dockerDeploy'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#141416] font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>4. On-Premise Docker</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                {SNIPPETS[activeTab].title}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(activeTab, SNIPPETS[activeTab].code)}
                className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-[#222224] px-2.5 py-1 rounded-md border border-zinc-200 dark:border-[#333336] transition-colors cursor-pointer"
              >
                {copiedKey === activeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {copyError && <p role="status" className="text-amber-300">{copyError}</p>}
            <pre tabIndex={0} aria-label="Mã ví dụ tích hợp" className="p-4 rounded-xl bg-zinc-900 text-zinc-100 dark:bg-[#0c0c0d] dark:text-zinc-200 text-xs font-mono leading-relaxed overflow-x-auto border border-zinc-800">
              <code>{SNIPPETS[activeTab].code}</code>
            </pre>
          </div>
        </div>

        {/* Open Source & Commercial Protection FAQ */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Mô hình Cấp phép (Licensing) &amp; Bảo vệ Quyền sở hữu trí tuệ</span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            LayaMeet áp dụng mô hình <strong>Open-Core (Dual-License)</strong>:
          </p>

          <ul className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Cộng đồng &amp; Nghiên cứu</strong>: Mã nguồn mở cho mục đích học tập, đánh giá PoC và tích hợp client SDK.
            </li>
            <li>
              <strong>Doanh nghiệp Thương mại</strong>: Các tính năng phân cấp quyền Host nâng cao, Laya Executive Decision Sidecar, SLA 99.9% và hỗ trợ triển khai On-Premise Air-gapped yêu cầu giấy phép thương mại <em>(Enterprise License Agreement)</em>.
            </li>
            <li>
              <strong>Bảo vệ Sản phẩm</strong>: Mọi giải pháp thương mại hóa hoặc cung cấp dịch vụ cạnh tranh trực tiếp đều yêu cầu hợp đồng cấp phép chính thức từ chủ sở hữu dự án.
            </li>
          </ul>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <Footer
        onOpenPrivacyModal={() => setLegalModalType('privacy')}
        onOpenTermsModal={() => setLegalModalType('terms')}
      />

      <LegalModal
        isOpen={legalModalType !== null}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
};
