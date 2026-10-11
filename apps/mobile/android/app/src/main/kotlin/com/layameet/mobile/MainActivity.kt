package com.layameet.mobile

import android.content.Intent
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "com.layameet.mobile/meeting"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "startForegroundService" -> {
                        val meetingCode = call.argument<String>("meetingCode") ?: ""
                        val meetingName = call.argument<String>("meetingName") ?: "Laya Meet"
                        val intent = Intent(this, MeetingForegroundService::class.java).apply {
                            putExtra(MeetingForegroundService.EXTRA_MEETING_CODE, meetingCode)
                            putExtra(MeetingForegroundService.EXTRA_MEETING_NAME, meetingName)
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(intent)
                        } else {
                            startService(intent)
                        }
                        result.success(null)
                    }
                    "stopForegroundService" -> {
                        stopService(Intent(this, MeetingForegroundService::class.java))
                        result.success(null)
                    }
                    "configureAudioSession" -> {
                        // Android audio routing is handled by LiveKit / AudioManager.
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
