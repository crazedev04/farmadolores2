# Retener clases necesarias para React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.common.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.overcode.farmadolores.** { *; }

# Retener clases para Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Crashlytics
-keepattributes SourceFile,LineNumberTable
-keep public class * extends com.google.firebase.crashlytics.FirebaseCrashlytics { *; }

# Retener clases para Notifee
-keep class io.invertase.notifee.** { *; }

# Retener clases para Google Sign-In
-keep class com.google.android.gms.auth.api.signin.** { *; }

# Para evitar problemas con serialización
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Mantener métodos usados por reflexión
-keepclassmembers class * {
   public <init>(android.content.Context, android.util.AttributeSet);
}

# Mantener clases relacionadas a actividades y servicios
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver

# Evita eliminar recursos usados dinámicamente
-keepclassmembers class ** {
    public static <fields>;
    public static <methods>;
}

# Proguard optimizations (opcional)
-dontwarn com.facebook.react.**
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
-dontwarn io.invertase.notifee.**
-dontwarn androidx.**

# No eliminar anotaciones
-keepattributes *Annotation*

# Permitir reflexiones en métodos anotados
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}
-keep @androidx.annotation.Keep class *

# Mantener clases de React Native Navigation si usás alguna
# -keep class com.reactnativenavigation.** { *; }

