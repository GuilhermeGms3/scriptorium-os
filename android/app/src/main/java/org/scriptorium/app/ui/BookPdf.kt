package org.scriptorium.app.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.AtomicFile
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import java.io.File
import org.scriptorium.app.data.*

/** One PDF page at a time, with bounded bitmaps. Covers never load extracted page text. */
internal object BookPdfArtwork {
    fun render(pdf: File, index: Int, requestedWidth: Int): Bitmap =
        ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
            PdfRenderer(descriptor).use { renderer ->
                require(index in 0 until renderer.pageCount) { "Página não disponível no PDF." }
                renderer.openPage(index).use { page ->
                    val factor = minOf(requestedWidth.coerceIn(160, 1800).toFloat() / page.width, 4000f / page.height)
                    Bitmap.createBitmap((page.width * factor).toInt().coerceAtLeast(1), (page.height * factor).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888).also {
                        it.eraseColor(android.graphics.Color.WHITE)
                        page.render(it, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    }
                }
            }
        }

    @Synchronized fun cover(pdf: File, checksum: String, cache: File): Bitmap {
        require(checksum.matches(Regex("[a-f0-9]{64}")))
        val folder = File(cache, "library-covers-v1").also { check(it.isDirectory || it.mkdirs()) }
        val target = File(folder, "$checksum.jpg")
        BitmapFactory.decodeFile(target.path)?.let { return it }
        val bitmap = render(pdf, 0, 240)
        val atomic = AtomicFile(target)
        val output = atomic.startWrite()
        try { check(bitmap.compress(Bitmap.CompressFormat.JPEG, 82, output)); atomic.finishWrite(output) }
        catch (failure: Exception) { atomic.failWrite(output); throw failure }
        return bitmap
    }
}

@Composable
internal fun BookCover(repository: MobileRepository, document: Row) {
    val cache = LocalContext.current.cacheDir
    Load(document.text("checksum"), {
        runCatching { repository.pdf(document.text("checksum"))?.let { BookPdfArtwork.cover(it, document.text("checksum"), cache) } }.getOrNull()
    }) { bitmap ->
        if (bitmap != null) Image(bitmap.asImageBitmap(), "Capa de ${document.text("title")}", Modifier.fillMaxWidth().height(112.dp))
        else Surface(color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth().height(112.dp)) {
            Box(contentAlignment = Alignment.Center) { Text("▤", style = MaterialTheme.typography.headlineLarge) }
        }
    }
}

@Composable
internal fun BookPdfPage(pdf: File, page: Int) {
    Load(pdf.absolutePath to page, { BookPdfArtwork.render(pdf, page, 1600) }) { bitmap ->
        var zoom by remember(page, pdf) { mutableFloatStateOf(1f) }
        var offset by remember(page, pdf) { mutableStateOf(Offset.Zero) }
        BoxWithConstraints(Modifier.fillMaxSize().clipToBounds().background(MaterialTheme.colorScheme.surfaceContainer)) {
            val width = constraints.maxWidth.toFloat()
            val height = constraints.maxHeight.toFloat()
            val pageWidth = maxWidth
            val imageHeight = width * bitmap.height / bitmap.width
            fun bounded(value: Offset, scale: Float) = Offset(
                value.x.coerceIn((width - width * scale).coerceAtMost(0f), 0f),
                value.y.coerceIn((height - imageHeight * scale).coerceAtMost(0f), 0f))
            fun changeZoom(value: Float, center: Offset = Offset(width / 2, height / 2)) {
                val next = value.coerceIn(1f, 4f)
                offset = bounded(center - (center - offset) * (next / zoom), next)
                zoom = next
            }
            Box(Modifier.fillMaxSize().pointerInput(bitmap, width, height) {
                detectTransformGestures { centroid, pan, factor, _ ->
                    changeZoom(zoom * factor, centroid)
                    offset = bounded(offset + pan, zoom)
                }
            }) {
                Image(bitmap.asImageBitmap(), "Página física ${page + 1} do PDF original",
                    Modifier.wrapContentSize(Alignment.TopStart, unbounded = true)
                        .requiredSize(pageWidth, pageWidth * (bitmap.height.toFloat() / bitmap.width))
                        .graphicsLayer { scaleX = zoom; scaleY = zoom; translationX = offset.x; translationY = offset.y; transformOrigin = TransformOrigin(0f, 0f) })
            }
            Surface(Modifier.align(Alignment.BottomEnd).padding(10.dp), shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { changeZoom(zoom - 0.5f) }, modifier = Modifier.semantics { contentDescription = "Reduzir página" }) { Text("−") }
                    TextButton(onClick = { zoom = 1f; offset = Offset.Zero }) { Text("${(zoom * 100).toInt()}%") }
                    IconButton(onClick = { changeZoom(zoom + 0.5f) }, modifier = Modifier.semantics { contentDescription = "Ampliar página" }) { Text("+") }
                }
            }
        }
    }
}
