package com.graduation_project_social_media_frontend;

import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService; // RN-Firebase wrapper
import com.google.firebase.messaging.RemoteMessage; // Firebase message object

import java.util.Map;
import java.util.UUID;

/**
 * Custom messaging service that extends RN-Firebase's ReactNativeFirebaseMessagingService.
 * This keeps RN-Firebase lifecycle wiring while allowing custom behaviour.
 */
public class CustomFirebaseMessagingService extends ReactNativeFirebaseMessagingService {
  private static final String TAG = "CustomFCMService";
  private static final String CALL_CHANNEL_ID = "incoming_calls";
  private static final String DEFAULT_CHANNEL_ID = "default";

  @Override
  public void onCreate() {
    super.onCreate();
    createNotificationChannels();
  }

  @Override
  public void onMessageReceived(RemoteMessage remoteMessage) {
    try {
      Log.d(TAG, "From: " + remoteMessage.getFrom());
      Map<String, String> data = remoteMessage.getData();
      RemoteMessage.Notification notification = remoteMessage.getNotification();

      if (data != null && "incoming_call".equals(data.get("type"))) {
        handleIncomingCall(data, notification);
      } else {
        handleRegularNotification(data, notification);
      }

      // call super so RN-Firebase internal handlers run too
      super.onMessageReceived(remoteMessage);
    } catch (Exception e) {
      Log.e(TAG, "onMessageReceived error", e);
    }
  }

  private void handleIncomingCall(Map<String, String> data, RemoteMessage.Notification notification) {
    Log.d(TAG, "Handling incoming call notification");
    try {
      wakeUpScreen();

      String callUuid = data.get("callUuid");
      if (callUuid == null) callUuid = UUID.randomUUID().toString();

      String callerName = data.get("userName");
      if (callerName == null && notification != null) callerName = notification.getTitle();
      if (callerName == null) callerName = "Unknown Caller";

      // Launch main activity with flags
      Context ctx = getApplicationContext();
      Intent intent = new Intent(ctx, MainActivity.class);
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

      Bundle callData = new Bundle();
      if (data != null) {
        for (Map.Entry<String, String> entry : data.entrySet()) {
          callData.putString(entry.getKey(), entry.getValue());
        }
      }
      intent.putExtras(callData);

      PendingIntent pendingIntent = PendingIntent.getActivity(
        ctx,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CALL_CHANNEL_ID)
        .setContentTitle("Incoming Call")
        .setContentText(callerName + " is calling...")
        .setSmallIcon(R.drawable.ic_call)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setAutoCancel(false)
        .setOngoing(true)
        .setFullScreenIntent(pendingIntent, true)
        .setContentIntent(pendingIntent)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setDefaults(Notification.DEFAULT_ALL);

      // Answer / Decline actions
      Intent answerIntent = new Intent(ctx, CallActionReceiver.class);
      answerIntent.setAction("ANSWER_CALL");
      answerIntent.putExtras(callData);
      PendingIntent answerPendingIntent = PendingIntent.getBroadcast(
        ctx, 1, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      Intent declineIntent = new Intent(ctx, CallActionReceiver.class);
      declineIntent.setAction("DECLINE_CALL");
      declineIntent.putExtras(callData);
      PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
        ctx, 2, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      builder.addAction(R.drawable.ic_call_answer, "Answer", answerPendingIntent);
      builder.addAction(R.drawable.ic_call_decline, "Decline", declinePendingIntent);

      NotificationManager notificationManager =
        (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);

      if (notificationManager != null) {
        notificationManager.notify(1001, builder.build());
        Log.d(TAG, "Displayed incoming call notification");
      }
    } catch (Exception e) {
      Log.e(TAG, "Error handling incoming call", e);
    }
  }

  private void handleRegularNotification(Map<String, String> data, RemoteMessage.Notification notification) {
    if (notification == null) return;

    Context ctx = getApplicationContext();
    String title = notification.getTitle();
    String body = notification.getBody();

    NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, DEFAULT_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(R.drawable.ic_notification)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true);

    NotificationManager notificationManager =
      (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);

    if (notificationManager != null) {
      notificationManager.notify(2001, builder.build());
    }
  }

  private void wakeUpScreen() {
    try {
      Context ctx = getApplicationContext();
      PowerManager powerManager = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
      if (powerManager != null) {
        PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
          PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
          "CirlaApp:IncomingCall"
        );
        if (wakeLock != null && !wakeLock.isHeld()) {
          wakeLock.acquire(10000);
          new android.os.Handler().postDelayed(() -> {
            if (wakeLock.isHeld()) {
              wakeLock.release();
            }
          }, 8000);
        }
      }

      KeyguardManager keyguardManager = (KeyguardManager) ctx.getSystemService(Context.KEYGUARD_SERVICE);
      if (keyguardManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        keyguardManager.requestDismissKeyguard(null, null);
      }
    } catch (Exception e) {
      Log.e(TAG, "Error waking up screen", e);
    }
  }

  private void createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Context ctx = getApplicationContext();
      NotificationManager notificationManager = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);

      NotificationChannel callChannel = new NotificationChannel(
        CALL_CHANNEL_ID, "Incoming Calls", NotificationManager.IMPORTANCE_HIGH
      );
      callChannel.setDescription("Notifications for incoming calls");
      callChannel.enableVibration(true);
      callChannel.setVibrationPattern(new long[]{0,1000,500,1000});
      callChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
      callChannel.setBypassDnd(true);

      NotificationChannel defaultChannel = new NotificationChannel(
        DEFAULT_CHANNEL_ID, "General Notifications", NotificationManager.IMPORTANCE_DEFAULT
      );
      defaultChannel.setDescription("General app notifications");

      if (notificationManager != null) {
        notificationManager.createNotificationChannel(callChannel);
        notificationManager.createNotificationChannel(defaultChannel);
      }
    }
  }
}
