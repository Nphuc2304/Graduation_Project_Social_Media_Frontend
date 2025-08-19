package com.graduation_project_social_media_frontend

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class KeepAlivePackage : ReactPackage {
  override fun createNativeModules(rc: ReactApplicationContext): List<NativeModule> =
    listOf(KeepAliveModule(rc))
  override fun createViewManagers(rc: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}