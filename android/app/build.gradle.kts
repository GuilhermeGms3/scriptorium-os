plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "org.scriptorium.app"
    compileSdk = 36
    defaultConfig {
        applicationId = "org.scriptorium.app"
        minSdk = 28
        targetSdk = 36
        versionCode = 23
        versionName = "0.6.11"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { compose = true }
    sourceSets.getByName("main").assets.directories.add(layout.buildDirectory.dir("generated/reading-assets").get().asFile.absolutePath)
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions { unitTests.isReturnDefaultValues = false }
}

check(!providers.gradleProperty("scriptoriumContentPack").isPresent) {
    "Acervos não são mais assets do APK. Use npm run mobile:bundle para entregar aplicativo e livros juntos no kit privado."
}
// Only software-owned configuration enters resources; user books travel in the private kit.
val prepareReadingAssets by tasks.registering {
    val source = rootProject.file("../services/semantic-engine/app/theological-glossary.json")
    val destination = layout.buildDirectory.dir("generated/reading-assets")
    inputs.file(source)
    inputs.file(rootProject.file("reading-labels.json"))
    outputs.dir(destination)
    doLast {
        val folder = destination.get().asFile
        folder.mkdirs()
        source.copyTo(folder.resolve("theological-glossary.json"), overwrite = true)
        rootProject.file("reading-labels.json").copyTo(folder.resolve("reading-labels.json"), overwrite = true)
    }
}
tasks.named("preBuild") { dependsOn(prepareReadingAssets) }
dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.10.00"))
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.sqlite:sqlite-bundled:2.6.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("androidx.media3:media3-exoplayer:1.9.4")
    implementation("androidx.media3:media3-session:1.9.4")
    implementation("com.google.mlkit:translate:17.0.3")
    implementation("com.google.mlkit:language-id:17.0.6")
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.23.2")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
}
