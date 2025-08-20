package com.graduation_project_social_media_frontend.keepalive

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class KeepAliveService : Service() {
  companion object {
    const val CHANNEL_ID = "call_keepalive_channel"
    const val NOTIF_ID = 1001
    const val EXTRA_TITLE = "title"
    const val EXTRA_TEXT = "text"
  }

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NotificationManager::class.java)
      val ch = NotificationChannel(
        CHANNEL_ID,
        "Cuộc gọi (giữ kết nối)",
        NotificationManager.IMPORTANCE_HIGH
      )
      ch.description = "Giữ tiến trình hoạt động để đảm bảo tín hiệu cuộc gọi ổn định."
      mgr.createNotificationChannel(ch)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Đang kết nối cuộc gọi…"
    val text  = intent?.getStringExtra(EXTRA_TEXT)  ?: "Giữ ứng dụng hoạt động để kết nối ổn định."

    val notif = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      // dùng icon hệ thống để khỏi phụ thuộc R của app
      .setSmallIcon(android.R.drawable.stat_sys_phone_call)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build()

    startForeground(NOTIF_ID, notif)
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}