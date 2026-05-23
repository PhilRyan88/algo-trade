package com.example.algotradepro.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.algotradepro.theme.PrimaryGreen
import com.example.algotradepro.theme.PrimaryRed
import com.example.algotradepro.theme.TextSecondary

data class CandleData(
    val time: String,
    val displayTime: String,
    var open: Double,
    var high: Double,
    var low: Double,
    var close: Double,
    var volume: Long
)

@OptIn(ExperimentalTextApi::class)
@Composable
fun CustomCandleChart(
    candles: List<CandleData>,
    modifier: Modifier = Modifier
) {
    val textMeasurer = rememberTextMeasurer()

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .padding(vertical = 12.dp)
    ) {
        if (candles.isEmpty()) return@Canvas

        val w = size.width
        val h = size.height

        // Reserved padding for right-side price scale axis
        val rightPadding = 140f
        val bottomPadding = 40f
        
        val chartWidth = w - rightPadding
        val chartHeight = h - bottomPadding

        // 1. Min / Max range calculation for scaling
        var maxPrice = candles.maxOf { it.high }
        var minPrice = candles.minOf { it.low }

        // Add 5% padding to top & bottom so candles don't touch the borders
        val priceDiff = maxPrice - minPrice
        val padding = if (priceDiff > 0) priceDiff * 0.05 else 10.0
        maxPrice += padding
        minPrice -= padding

        val finalDiff = maxPrice - minPrice

        fun getScaledY(price: Double): Float {
            if (finalDiff <= 0) return chartHeight / 2f
            return (chartHeight - ((price - minPrice) / finalDiff * chartHeight)).toFloat()
        }

        // 2. Draw Horizontal Gridlines & Price Axis Labels
        val gridCount = 5
        for (i in 0..gridCount) {
            val ratio = i.toFloat() / gridCount
            val gridY = chartHeight * ratio
            val gridPrice = maxPrice - (finalDiff * ratio)

            // Draw line
            drawLine(
                color = Color(0x0AFFFFFF),
                start = Offset(0f, gridY),
                end = Offset(chartWidth, gridY),
                strokeWidth = 1f
            )

            // Draw right price labels
            val priceStr = String.format("%.2f", gridPrice)
            drawText(
                textMeasurer = textMeasurer,
                text = priceStr,
                topLeft = Offset(chartWidth + 10f, gridY - 18f),
                style = TextStyle(
                    color = TextSecondary,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace
                )
            )
        }

        // 3. Render Candles
        val visibleCount = candles.size
        val candleWidth = chartWidth / visibleCount
        val spacing = candleWidth * 0.2f // 20% gap between candles
        val actualBodyWidth = candleWidth - spacing

        candles.forEachIndexed { index, candle ->
            val xCenter = (index * candleWidth) + (candleWidth / 2f)
            val xStart = xCenter - (actualBodyWidth / 2f)

            val yOpen = getScaledY(candle.open)
            val yClose = getScaledY(candle.close)
            val yHigh = getScaledY(candle.high)
            val yLow = getScaledY(candle.low)

            val isBullish = candle.close >= candle.open
            val color = if (isBullish) PrimaryGreen else PrimaryRed

            // Draw shadow wicks (low to high)
            drawLine(
                color = color,
                start = Offset(xCenter, yHigh),
                end = Offset(xCenter, yLow),
                strokeWidth = 2.5f
            )

            // Draw body rect (open to close)
            val top = minOf(yOpen, yClose)
            val bottom = maxOf(yOpen, yClose)
            val bodyHeight = maxOf(bottom - top, 2f) // Guarantee at least 2px height for flat bodies

            drawRect(
                color = color,
                topLeft = Offset(xStart, top),
                size = Size(actualBodyWidth, bodyHeight)
            )
            
            // Draw brief time labels on the X-axis for every 5th candle to avoid crowding
            if (index % 5 == 0) {
                drawText(
                    textMeasurer = textMeasurer,
                    text = candle.displayTime,
                    topLeft = Offset(xStart, chartHeight + 10f),
                    style = TextStyle(
                        color = TextSecondary,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace
                    )
                )
            }
        }
    }
}
