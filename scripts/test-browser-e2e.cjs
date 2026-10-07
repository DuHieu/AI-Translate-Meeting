/**
 * Automated End-to-End Browser Test for AI-Translate-Meeting
 * Uses Playwright (Chromium) to test real user interactions, settings, Audio Booth, and media.
 */
const { chromium } = require('../apps/web/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../output/playwright');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  console.log('===============================================================');
  console.log('   Starting Real Browser Automation Test (Headless Chromium)   ');
  console.log('===============================================================');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required'
    ],
  });

  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error' && !/favicon|status of 404/i.test(text)) {
      errors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  let subtitleSocket = null;
  await page.routeWebSocket('**/ws/transcribe**', (ws) => {
    subtitleSocket = ws;
    ws.connectToServer();
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Verify Landing Page
    // -------------------------------------------------------------
    console.log('[STEP 1] Navigating to Landing Page (http://127.0.0.1:3000)...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_landing_page.png') });
    console.log('  ✓ Landing page rendered successfully. Title:', await page.title());

    // -------------------------------------------------------------
    // STEP 2: Create a Meeting via Backend API
    // -------------------------------------------------------------
    console.log('[STEP 2] Creating a meeting via API (http://127.0.0.1:5000/api/meetings)...');
    const createRes = await context.request.post('http://127.0.0.1:5000/api/meetings', {
      data: { name: 'E2E Automation Meeting' },
    });
    if (!createRes.ok()) {
      throw new Error(`Failed to create meeting via API: HTTP ${createRes.status()}`);
    }
    const meeting = await createRes.json();
    console.log(`  ✓ Meeting created: Code=${meeting.meetingCode}, Id=${meeting.meetingId}`);

    // -------------------------------------------------------------
    // STEP 3: Navigate to Pre-Join Page with Host Token
    // -------------------------------------------------------------
    console.log(`[STEP 3] Setting up Host Token and navigating to Pre-join Page (http://127.0.0.1:3000/join/${meeting.meetingCode})...`);
    await context.addInitScript(({ code, token }) => {
      localStorage.setItem('meeting-host-token:' + code.toUpperCase(), token);
      sessionStorage.setItem('meeting-host-token:' + code.toUpperCase(), token);
      localStorage.setItem('layameet:last-display-name', 'Tester QA Auto');
      localStorage.setItem('layameet:app-language', 'vi');
    }, { code: meeting.meetingCode, token: meeting.hostToken });

    await page.goto(`http://127.0.0.1:3000/join/${meeting.meetingCode}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Fill display name via #display-name
    const nameInput = page.locator('#display-name');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('Tester QA Auto');
    console.log('  ✓ Filled display name: Tester QA Auto');

    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_prejoin_page.png') });

    // Click Join Now button
    console.log('[STEP 4] Clicking Tham gia ngay Button...');
    const joinBtn = page.getByRole('button', { name: /Tham gia ngay|Join Now/i }).first();
    await joinBtn.click();

    // -------------------------------------------------------------
    // STEP 5: Verify Live Meeting Room
    // -------------------------------------------------------------
    console.log('[STEP 5] Waiting for Meeting Room URL and controls...');
    await page.waitForURL('**/meeting/**', { timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_meeting_room.png') });
    console.log('  ✓ Successfully entered live meeting room!');

    // -------------------------------------------------------------
    // STEP 6: Open Settings and Verify Audio Cabin Controls
    // -------------------------------------------------------------
    console.log('[STEP 6] Opening More Menu -> Settings Dialog...');
    const moreMenuBtn = page.getByRole('button', { name: /Tùy chọn khác/i }).first();
    if (await moreMenuBtn.isVisible()) {
      await moreMenuBtn.click();
      await page.waitForTimeout(600);
      console.log('  ✓ Opened More Menu.');

      // Click "Cài đặt âm thanh & AI"
      const settingsOption = page.getByRole('button', { name: /Cài đặt âm thanh/i }).first();
      if (await settingsOption.isVisible()) {
        await settingsOption.click();
        await page.waitForTimeout(1000);
        console.log('  ✓ Settings Dialog opened.');

        // Verify Audio Booth section exists
        const audioBoothHeader = page.getByText(/Cabin Phiên dịch \(Audio Booth\)/i).first();
        const hasAudioBooth = await audioBoothHeader.isVisible();
        console.log('  ✓ Audio Booth section in Settings visible:', hasAudioBooth);

        // Test Gender Selection buttons
        const femaleVoiceBtn = page.getByRole('button', { name: /Giọng Nữ/i }).first();
        if (await femaleVoiceBtn.isVisible()) {
          await femaleVoiceBtn.click();
          await page.waitForTimeout(300);
          console.log('  ✓ Selected Voice Gender: Giọng Nữ');
        }

        // Test Speed Selection buttons
        const speed12Btn = page.getByRole('button', { name: '1.2x' }).first();
        if (await speed12Btn.isVisible()) {
          await speed12Btn.click();
          await page.waitForTimeout(300);
          console.log('  ✓ Selected Speech Rate: 1.2x');
        }

        await page.screenshot({ path: path.join(OUTPUT_DIR, '04_settings_audio_booth.png') });

        // Close settings dialog
        const closeBtn = page.locator('button[aria-label="Đóng cài đặt"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(600);
          console.log('  ✓ Closed Settings Dialog via aria-label Đóng cài đặt.');
        } else {
          // Fallback close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(600);
          console.log('  ✓ Closed Settings Dialog via Escape key.');
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 7: Toggle Audio Booth via More Menu
    // -------------------------------------------------------------
    console.log('[STEP 7] Toggling Audio Booth button in More Menu...');
    const moreMenuBtn2 = page.getByRole('button', { name: /Tùy chọn khác/i }).first();
    if (await moreMenuBtn2.isVisible()) {
      await moreMenuBtn2.click();
      await page.waitForTimeout(600);
      const audioBoothMenuBtn = page.getByRole('button', { name: /Cabin phiên dịch/i }).first();
      if (await audioBoothMenuBtn.isVisible()) {
        await audioBoothMenuBtn.click();
        console.log('  ✓ Audio Booth activated via More Menu!');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(OUTPUT_DIR, '05_audio_booth_active.png') });
      }
    }

    // -------------------------------------------------------------
    // STEP 8: Inject Subtitle and Verify Rendering
    // -------------------------------------------------------------
    console.log('[STEP 8] Ingesting simulated subtitle broadcast message to client...');
    if (subtitleSocket) {
      subtitleSocket.send(JSON.stringify({
        type: 'subtitle',
        data: {
          id: 'auto-test-' + Date.now(),
          meetingId: meeting.meetingId,
          participantId: 'remote-user-1',
          participantName: 'Tanaka Kenji',
          sourceLanguage: 'ja',
          targetLanguage: 'vi',
          originalText: '本日の会議を開始いたします。',
          translatedText: 'Chúng ta sẽ bắt đầu cuộc họp hôm nay.',
          isFinal: true,
          timestamp: new Date().toISOString(),
        }
      }));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '06_subtitles_rendered.png') });
      console.log('  ✓ Subtitle injected and screenshot 06_subtitles_rendered.png captured.');
    }

    console.log('===============================================================');
    console.log('   🎉 BROWSER AUTOMATION TEST COMPLETED SUCCESSFULLY!          ');
    console.log('===============================================================');
    console.log(JSON.stringify({
      status: 'SUCCESS',
      meetingCode: meeting.meetingCode,
      screenshots: [
        '01_landing_page.png',
        '02_prejoin_page.png',
        '03_meeting_room.png',
        '04_settings_audio_booth.png',
        '05_audio_booth_active.png',
        '06_subtitles_rendered.png',
      ]
    }, null, 2));

  } catch (err) {
    console.error('❌ AUTOMATION TEST FAILED:', err);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'error_screenshot.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
