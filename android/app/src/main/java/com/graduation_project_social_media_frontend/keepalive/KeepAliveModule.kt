package com.graduation_project_social_media_frontend.keepalive

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

class KeepAliveModule(private val ctx: ReactApplicationContext)
: ReactContextBaseJavaModule(ctx) {

  override fun getName() = "KeepAlive"

  @ReactMethod
  fun start(options: ReadableMap?, promise: Promise) {
    try {
      val i = Intent(ctx, KeepAliveService::class.java)
      if (options?.hasKey("title") == true) {
        i.putExtra(KeepAliveService.EXTRA_TITLE, options.getString("title"))
      }
      if (options?.hasKey("text") == true) {
        i.putExtra(KeepAliveService.EXTRA_TEXT, options.getString("text"))
      }
      ContextCompat.startForegroundService(ctx, i)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("START_ERROR", e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val stopped = ctx.stopService(Intent(ctx, KeepAliveService::class.java))
      promise.resolve(stopped)
    } catch (e: Exception) {
      promise.reject("STOP_ERROR", e)
    }
  }
}