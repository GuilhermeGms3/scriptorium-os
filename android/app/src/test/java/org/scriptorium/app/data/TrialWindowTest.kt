package org.scriptorium.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrialWindowTest {
    private val start = 1_800_000_000_000L
    private val record = TrialRecord(start, start)

    @Test fun startsOnlyAfterInternetTimeIsAvailable() {
        assertEquals(TrialStatus.ACTIVATION_REQUIRED, evaluateTrial(null, null, start).status)
        val activated = evaluateTrial(null, start, start)
        assertEquals(TrialStatus.ACTIVE, activated.status)
        assertEquals(start, activated.record?.activatedAt)
        assertEquals(TRIAL_LENGTH_MILLIS, activated.remainingMillis)
    }

    @Test fun expiresAfterThirtyDaysUsingServerTime() {
        val expired = evaluateTrial(record, start + TRIAL_LENGTH_MILLIS, start)
        assertEquals(TrialStatus.EXPIRED, expired.status)
        assertEquals(0L, expired.remainingMillis)
    }

    @Test fun remainsUsableOfflineWithoutClockRollback() {
        val result = evaluateTrial(record, null, start + 5 * 24 * 60 * 60 * 1000L)
        assertEquals(TrialStatus.ACTIVE, result.status)
        assertTrue(result.remainingMillis > 0)
    }

    @Test fun requiresOnlineValidationAfterClockRollback() {
        val result = evaluateTrial(record.copy(lastObservedDeviceTime = start + 2_000_000L), null, start)
        assertEquals(TrialStatus.NEEDS_INTERNET, result.status)
    }

    @Test fun expiresOfflineWhenTheLocalDatePassesTheDeadline() {
        val result = evaluateTrial(record, null, start + TRIAL_LENGTH_MILLIS)
        assertEquals(TrialStatus.EXPIRED, result.status)
    }

    @Test fun onlineTimeOverridesAnIncorrectDeviceClock() {
        val result = evaluateTrial(record, start + 2_000_000L, start - 10_000_000L)
        assertEquals(TrialStatus.ACTIVE, result.status)
    }
}
