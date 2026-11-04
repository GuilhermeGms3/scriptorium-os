package org.scriptorium.app.ui

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*

@Composable
fun PdfPagePreview(repository: MobileRepository, page: Row, height: Dp = 460.dp, zoomable: Boolean = false) {
    val pdf = remember(page.text("checksum")) { repository.pdf(page.text("checksum")) }
    if (pdf == null) { Text("PDF original não está instalado."); return }
    var scale by remember(page.text("id")) { mutableFloatStateOf(1f) }
    var pan by remember(page.text("id")) { mutableStateOf(Offset.Zero) }
    val transformation = rememberTransformableState { factor, offset, _ -> scale = (scale * factor).coerceIn(1f, 5f); pan += offset }
    Load(pdf.absolutePath to page.number("page_index"), {
        ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
            PdfRenderer(descriptor).use { renderer ->
                require(page.number("page_index") in 0 until renderer.pageCount)
                renderer.openPage(page.number("page_index")).use { source ->
                    val width = if (zoomable) 1500 else 500
                    val bitmapHeight = (width.toLong() * source.height / source.width).toInt().coerceIn(1, 2800)
                    Bitmap.createBitmap(width, bitmapHeight, Bitmap.Config.ARGB_8888).also { bitmap -> bitmap.eraseColor(android.graphics.Color.WHITE); source.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY) }
                }
            }
        }
    }) { bitmap ->
        Box(Modifier.fillMaxWidth().height(height).clipToBounds().then(if (zoomable) Modifier.transformable(transformation) else Modifier)) {
            Image(bitmap.asImageBitmap(), "Página física ${page.number("page_index") + 1}", Modifier.fillMaxSize().graphicsLayer(scaleX = scale, scaleY = scale, translationX = pan.x, translationY = pan.y))
        }
    }
}
