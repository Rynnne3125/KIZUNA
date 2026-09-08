package com.kizuna.config;

import com.kizuna.dto.request.KanjiCreateRequest;
import com.kizuna.dto.request.VocabularyCreateRequest;
import com.kizuna.model.Kanji.KanjiExample;
import com.kizuna.service.KanjiService;
import com.kizuna.service.VocabularyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final KanjiService kanjiService;
    private final VocabularyService vocabularyService;

    @Override
    public void run(String... args) {
        try {
            seedSampleKanjiIfEmpty();
            seedSampleVocabulariesIfEmpty();
        } catch (Exception e) {
            log.info("Sample data seeding skipped (Firestore credentials pending or offline): {}", e.getMessage());
        }
    }

    private void seedSampleKanjiIfEmpty() {
        if (!kanjiService.getKanjiByJlpt("N5", 1).isEmpty()) {
            return;
        }

        log.info("Seeding initial JLPT N5 Kanji sample data...");

        kanjiService.createKanji(KanjiCreateRequest.builder()
                .character("日")
                .meanings(List.of("mặt trời", "ngày", "Nhật Bản"))
                .onyomi(List.of("ニチ", "ジツ"))
                .kunyomi(List.of("ひ", "-び", "-か"))
                .strokeCount(4)
                .jlptLevel("N5")
                .radicals(List.of("日"))
                .examples(List.of(
                        new KanjiExample("日本", "にほん", "Nhật Bản"),
                        new KanjiExample("日曜日", "にちようび", "Chủ nhật")
                ))
                .build());

        kanjiService.createKanji(KanjiCreateRequest.builder()
                .character("本")
                .meanings(List.of("sách", "gốc", "nguồn gốc"))
                .onyomi(List.of("ホン"))
                .kunyomi(List.of("もと"))
                .strokeCount(5)
                .jlptLevel("N5")
                .radicals(List.of("木"))
                .examples(List.of(
                        new KanjiExample("本", "ほん", "Quyển sách"),
                        new KanjiExample("本人", "ほんにん", "Bản thân người đó")
                ))
                .build());

        kanjiService.createKanji(KanjiCreateRequest.builder()
                .character("人")
                .meanings(List.of("người", "nhân"))
                .onyomi(List.of("ジン", "ニン"))
                .kunyomi(List.of("ひと"))
                .strokeCount(2)
                .jlptLevel("N5")
                .radicals(List.of("人"))
                .examples(List.of(
                        new KanjiExample("日本人", "にほんじん", "Người Nhật"),
                        new KanjiExample("三人", "さんにん", "3 người")
                ))
                .build());

        log.info("Sample JLPT N5 Kanji seeded successfully.");
    }

    private void seedSampleVocabulariesIfEmpty() {
        if (!vocabularyService.getVocabulariesByJlpt("N5", 1).isEmpty()) {
            return;
        }

        log.info("Seeding initial JLPT N5 Vocabulary sample data...");

        vocabularyService.createVocabulary(VocabularyCreateRequest.builder()
                .term("こんにちは")
                .reading("こんにちは")
                .romaji("konnichiwa")
                .meanings(List.of("Xin chào (ban ngày)"))
                .wordType("expression")
                .jlptLevel("N5")
                .exampleSentenceJa("皆さん、こんにちは。")
                .exampleSentenceVi("Xin chào mọi người.")
                .build());

        vocabularyService.createVocabulary(VocabularyCreateRequest.builder()
                .term("先生")
                .reading("せんせい")
                .romaji("sensei")
                .meanings(List.of("Thầy giáo", "Cô giáo", "Bác sĩ"))
                .wordType("noun")
                .jlptLevel("N5")
                .exampleSentenceJa("田中先生は日本語を教えます。")
                .exampleSentenceVi("Thầy Tanaka dạy tiếng Nhật.")
                .build());

        vocabularyService.createVocabulary(VocabularyCreateRequest.builder()
                .term("学生")
                .reading("がくせい")
                .romaji("gakusei")
                .meanings(List.of("Học sinh", "Sinh viên"))
                .wordType("noun")
                .jlptLevel("N5")
                .exampleSentenceJa("私は東京大学の学生です。")
                .exampleSentenceVi("Tôi là sinh viên trường Đại học Tokyo.")
                .build());

        log.info("Sample JLPT N5 Vocabularies seeded successfully.");
    }
}
