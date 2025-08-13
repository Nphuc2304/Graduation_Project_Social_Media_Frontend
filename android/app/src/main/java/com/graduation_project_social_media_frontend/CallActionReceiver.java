package com.graduation_project_social_media_frontend;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.NotificationManager;
import android.os.Bundle;
import android.util.Log;

public class CallActionReceiver extends BroadcastReceiver {
    private static final String TAG = "CallActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Bundle extras = intent.getExtras();
        
        Log.d(TAG, "Received action: " + action);

        // Dismiss the notification
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(1001);
        }

        if ("ANSWER_CALL".equals(action)) {
            handleAnswerCall(context, extras);
        } else if ("DECLINE_CALL".equals(action)) {
            handleDeclineCall(context, extras);
        }
    }

    private void handleAnswerCall(Context context, Bundle callData) {
        Log.d(TAG, "Handling answer call action");
        
        try {
            // Launch the main activity with call data
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                                 Intent.FLAG_ACTIVITY_CLEAR_TOP |
                                 Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launchIntent.putExtra("ACTION", "ANSWER_CALL");
            if (callData != null) {
                launchIntent.putExtras(callData);
            }
            
            context.startActivity(launchIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling answer call", e);
        }
    }

    private void handleDeclineCall(Context context, Bundle callData) {
        Log.d(TAG, "Handling decline call action");
        
        try {
            // You could send a broadcast to React Native to handle the decline
            // or make a direct API call to notify the caller
            
            // For now, just log the decline
            if (callData != null) {
                String callId = callData.getString("callId");
                String userId = callData.getString("userId");
                Log.d(TAG, "Call declined - callId: " + callId + ", userId: " + userId);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling decline call", e);
        }
    }
}