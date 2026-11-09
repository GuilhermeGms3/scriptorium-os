package org.scriptorium.app.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.net.URL
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

internal const val TRIAL_LENGTH_MILLIS = 30L * 24 * 60 * 60 * 1000
private const val CLOCK_ROLLBACK_TOLERANCE_MILLIS = 2 * 60 * 1000L
private const val KEY_ALIAS = "org.scriptorium.app.trial.window.v1"
private const val PREFS = "trial-access-v1"
private const val STATE_KEY = "encrypted-state"

internal data class TrialRecord(val activatedAt: Long, val lastObservedDeviceTime: Long)
internal enum class TrialStatus { ACTIVE, NEEDS_INTERNET, EXPIRED, ACTIVATION_REQUIRED, INVALID }
internal data class TrialEvaluation(val status: TrialStatus, val record: TrialRecord?, val remainingMillis: Long)

internal fun evaluateTrial(
    record: TrialRecord?,
    serverTime: Long?,
    deviceTime: Long,
): TrialEvaluation {
    if (record == null) {
        if (serverTime == null || serverTime <= 0L)
            return TrialEvaluation(TrialStatus.ACTIVATION_REQUIRED, null, 0)
        val expiry = serverTime + TRIAL_LENGTH_MILLIS
        return TrialEvaluation(
            TrialStatus.ACTIVE,
            TrialRecord(serverTime, deviceTime),
            (expiry - serverTime).coerceAtLeast(0),
        )
    }
    if (record.activatedAt <= 0L || record.lastObservedDeviceTime <= 0L)
        return TrialEvaluation(TrialStatus.INVALID, null, 0)

    val expiry = record.activatedAt + TRIAL_LENGTH_MILLIS
    if (serverTime != null) {
        val remaining = expiry - serverTime
        return TrialEvaluation(
            if (remaining <= 0L) TrialStatus.EXPIRED else TrialStatus.ACTIVE,
            record.copy(lastObservedDeviceTime = deviceTime),
            remaining.coerceAtLeast(0),
        )
    }
    if (deviceTime + CLOCK_ROLLBACK_TOLERANCE_MILLIS < record.lastObservedDeviceTime)
        return TrialEvaluation(TrialStatus.NEEDS_INTERNET, record, 0)
    val remaining = expiry - deviceTime
    return TrialEvaluation(
        if (remaining <= 0L) TrialStatus.EXPIRED else TrialStatus.ACTIVE,
        record.copy(lastObservedDeviceTime = maxOf(record.lastObservedDeviceTime, deviceTime)),
        remaining.coerceAtLeast(0),
    )
}

internal class TrialAccessManager(context: Context) {
    private val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun validate(): TrialEvaluation {
        val record = readRecord()
        val serverTime = fetchInternetTime()
        val result = evaluateTrial(record, serverTime, System.currentTimeMillis())
        if (result.record != null && result.status != TrialStatus.INVALID) writeRecord(result.record)
        return result
    }

    private fun fetchInternetTime(): Long? = runCatching {
        val connection = URL("https://www.google.com/generate_204").openConnection()
        connection.connectTimeout = 5_000
        connection.readTimeout = 5_000
        connection.useCaches = false
        connection.setRequestProperty("Cache-Control", "no-cache, no-store")
        connection.setRequestProperty("Pragma", "no-cache")
        connection.connect()
        try {
            connection.getHeaderFieldDate("Date", 0).takeIf { it > 0L }
        } finally {
            (connection as? java.net.HttpURLConnection)?.disconnect()
        }
    }.getOrNull()

    private fun readRecord(): TrialRecord? {
        val encrypted = preferences.getString(STATE_KEY, null) ?: return null
        return runCatching {
            val payload = Base64.decode(encrypted, Base64.NO_WRAP)
            require(payload.size > 12) { "Dados de ativação inválidos." }
            val iv = payload.copyOfRange(0, 12)
            val ciphertext = payload.copyOfRange(12, payload.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
            val json = JSONObject(String(cipher.doFinal(ciphertext), Charsets.UTF_8))
            TrialRecord(json.getLong("activatedAt"), json.getLong("lastObservedDeviceTime"))
        }.getOrElse { throw IllegalStateException("Não foi possível validar os dados de ativação.", it) }
    }

    private fun writeRecord(record: TrialRecord) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val json = JSONObject()
            .put("activatedAt", record.activatedAt)
            .put("lastObservedDeviceTime", record.lastObservedDeviceTime)
        val payload = cipher.iv + cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))
        check(preferences.edit().putString(STATE_KEY, Base64.encodeToString(payload, Base64.NO_WRAP)).commit())
    }

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }
}
