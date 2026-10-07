/**
 * IndexNow Ping Script for LayaMeet (layameet.com)
 * Notifies Bing, Yandex, Naver, and Seznam about instant indexing.
 */

const INDEXNOW_KEY = '4d98a2e15bc34f77a83d6904fb3158c9';
const HOST = 'layameet.com';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const urlList = [
  `https://${HOST}/`,
  `https://${HOST}/developers`,
  `https://${HOST}/hop-song-ngu-tieng-nhat`,
  `https://${HOST}/hop-song-ngu-tieng-anh`,
  `https://${HOST}/so-sanh/layameet-vs-zoom`,
  `https://${HOST}/so-sanh/layameet-vs-google-meet`,
  `https://${HOST}/cam-nang`,
  `https://${HOST}/cam-nang/hop-song-ngu-viet-nhat-khong-can-phien-dich-vien`,
  `https://${HOST}/cam-nang/so-sanh-chi-tiet-layameet-vs-zoom-ai`,
  `https://${HOST}/ja`,
  `https://${HOST}/en`,
  `https://${HOST}/en/guide`,
  `https://${HOST}/en/guide/real-time-bilingual-meeting-translation-guide`,
  `https://${HOST}/en/guide/layameet-vs-zoom-ai-comparison`,
  `https://${HOST}/ja/guide`,
  `https://${HOST}/ja/guide/vietnam-japan-bilingual-meeting-guide`,
];

async function pingIndexNow() {
  console.log(`📡 Pinging IndexNow API for ${HOST}...`);
  console.log(`   Key: ${INDEXNOW_KEY}`);
  console.log(`   Key Location: ${KEY_LOCATION}`);
  console.log(`   URLs to submit (${urlList.length}):`);
  urlList.forEach((u) => console.log(`     - ${u}`));

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList,
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      console.log(`✅ IndexNow Ping Succeeded! HTTP Status: ${response.status}`);
      console.log('   Các công cụ tìm kiếm (Bing, Yandex, Seznam) đã tiếp nhận hàng đợi lập chỉ mục tức thì.\n');
    } else {
      const errorText = await response.text();
      console.warn(`⚠️ IndexNow returned HTTP ${response.status}: ${errorText}`);
    }
  } catch (err) {
    console.error('❌ Failed to ping IndexNow API:', err.message);
  }
}

pingIndexNow();
