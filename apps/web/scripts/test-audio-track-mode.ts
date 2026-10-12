import assert from 'node:assert/strict';
import { audioDuckingRegistry } from '../src/utils/audioDuckingRegistry.ts';
import { DEFAULT_USER_SETTINGS } from '../src/utils/userSettings.ts';

console.log('[Test] Running Live Multi-Track Audio Selector unit tests...');

// 1. Verify UserSettings defaults
assert.equal(DEFAULT_USER_SETTINGS.audioTrackMode, 'dual_ducking');
assert.equal(DEFAULT_USER_SETTINGS.dubbingVolume, 1.0);
assert.equal(DEFAULT_USER_SETTINGS.duckedVolume, 0.18);
console.log('✓ DEFAULT_USER_SETTINGS contains audioTrackMode, dubbingVolume, and duckedVolume');

// 2. Mock HTMLMediaElement for AudioDuckingRegistry testing
class MockMediaElement {
  volume = 1.0;
  style = { display: '' };
}

const mockElement1 = new MockMediaElement() as unknown as HTMLMediaElement;
const mockElement2 = new MockMediaElement() as unknown as HTMLMediaElement;

// Reset registry to clean state
audioDuckingRegistry.reset();
assert.equal(audioDuckingRegistry.getMode(), 'dual_ducking');
assert.equal(audioDuckingRegistry.getDucked(), false);

// Register elements
audioDuckingRegistry.register(mockElement1);
audioDuckingRegistry.register(mockElement2);
assert.equal(mockElement1.volume, 1.0);
assert.equal(mockElement2.volume, 1.0);
console.log('✓ Registered media elements initialize at full volume (1.0) in dual_ducking idle state');

// 3. Test mode transition to 'translated_only' (remote muted 100%)
audioDuckingRegistry.setMode('translated_only');
assert.equal(audioDuckingRegistry.getMode(), 'translated_only');
assert.equal(mockElement1.volume, 0.0);
assert.equal(mockElement2.volume, 0.0);
console.log('✓ setMode("translated_only") instantly mutes remote elements (0.0 volume)');

// While in translated_only, setting ducked state preserves 0.0 volume
audioDuckingRegistry.setDucked(true);
assert.equal(mockElement1.volume, 0.0);
audioDuckingRegistry.setDucked(false);
assert.equal(mockElement1.volume, 0.0);
console.log('✓ setDucked maintains strict 0.0 volume under translated_only mode');

// 4. Test mode transition to 'original' (remote unmuted 100%, no ducking)
audioDuckingRegistry.setMode('original');
assert.equal(audioDuckingRegistry.getMode(), 'original');
assert.equal(mockElement1.volume, 1.0);
assert.equal(mockElement2.volume, 1.0);
console.log('✓ setMode("original") restores remote elements to 100% (1.0 volume)');

// 5. Test mode transition back to 'dual_ducking'
audioDuckingRegistry.setMode('dual_ducking');
assert.equal(audioDuckingRegistry.getMode(), 'dual_ducking');
assert.equal(mockElement1.volume, 1.0);

// Ducking active: drops to duckedVolume (0.18)
audioDuckingRegistry.setDucked(true);
assert.equal(mockElement1.volume, 0.18);
assert.equal(mockElement2.volume, 0.18);
console.log('✓ setDucked(true) under dual_ducking drops volume to 0.18 (-18dB)');

// Ducking released: restores to 1.0
audioDuckingRegistry.setDucked(false);
assert.equal(mockElement1.volume, 1.0);
assert.equal(mockElement2.volume, 1.0);
console.log('✓ setDucked(false) under dual_ducking restores volume to 1.0');

// 6. Test custom ducked volume configuration
audioDuckingRegistry.setDuckedVolume(0.10); // -24dB deep ducking
audioDuckingRegistry.setDucked(true);
assert.equal(mockElement1.volume, 0.10);
audioDuckingRegistry.setDucked(false);
assert.equal(mockElement1.volume, 1.0);
console.log('✓ setDuckedVolume(0.10) successfully adjusts ducking depth');

// 7. Cleanup & Unregister
audioDuckingRegistry.unregister(mockElement1);
audioDuckingRegistry.unregister(mockElement2);
audioDuckingRegistry.reset();
assert.equal(mockElement1.volume, 1.0);
assert.equal(audioDuckingRegistry.getMode(), 'dual_ducking');
console.log('✓ Unregister and reset clean up gracefully');

console.log('All Live Multi-Track Audio Selector tests passed successfully! [7/7]');
