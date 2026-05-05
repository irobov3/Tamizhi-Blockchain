package com.tamizhi.app.core.domain.model

data class LiteraryWork(
    val id: String,
    val title: String,
    val titleTa: String,
    val author: String,
    val authorTa: String,
    val category: LiteraryCategory,
    val era: String,
    val verseCount: Int,
    val thumbnailUrl: String?,
    val summary: String,
    val summaryTa: String
)

data class LiteraryWorkDetail(
    val id: String,
    val title: String,
    val titleTa: String,
    val author: String,
    val authorTa: String,
    val category: LiteraryCategory,
    val era: String,
    val verses: List<Verse>,
    val commentary: String?,
    val commentaryTa: String?
)

data class Verse(
    val number: Int,
    val textTa: String,
    val transliteration: String,
    val translationEn: String,
    val chapter: String?,
    val chapterTa: String?
)

enum class LiteraryCategory(val displayName: String, val displayNameTa: String) {
    THIRUKURAL("Thirukural", "திருக்குறள்"),
    SANGAM("Sangam Literature", "சங்க இலக்கியம்"),
    EPIC("Epics", "காப்பியங்கள்"),
    DEVOTIONAL("Devotional", "பக்தி இலக்கியம்"),
    MODERN("Modern", "நவீன இலக்கியம்");

    companion object {
        fun fromString(s: String): LiteraryCategory = when (s.uppercase()) {
            "THIRUKURAL" -> THIRUKURAL
            "SANGAM" -> SANGAM
            "EPIC" -> EPIC
            "DEVOTIONAL" -> DEVOTIONAL
            else -> MODERN
        }
    }
}
