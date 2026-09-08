package com.kizuna.service.impl;

import com.kizuna.dto.request.KanjiCreateRequest;
import com.kizuna.dto.response.KanjiResponse;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.Kanji;
import com.kizuna.repository.KanjiRepository;
import com.kizuna.service.KanjiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KanjiServiceImpl implements KanjiService {

    private final KanjiRepository kanjiRepository;

    @Override
    public List<KanjiResponse> getKanjiByJlpt(String level, int limit) {
        List<Kanji> kanjis;
        if (level != null && !level.trim().isEmpty()) {
            kanjis = kanjiRepository.findByJlptLevel(level, limit);
        } else {
            kanjis = kanjiRepository.findAll(limit);
        }
        return kanjis.stream()
                .map(KanjiResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public KanjiResponse getKanjiById(String id) {
        Kanji kanji = kanjiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji", id));
        return KanjiResponse.fromEntity(kanji);
    }

    @Override
    public KanjiResponse createKanji(KanjiCreateRequest request) {
        String id = request.getCharacter() != null ? request.getCharacter() : UUID.randomUUID().toString();
        Date now = new Date();

        Kanji kanji = Kanji.builder()
                .id(id)
                .character(request.getCharacter())
                .meanings(request.getMeanings())
                .onyomi(request.getOnyomi())
                .kunyomi(request.getKunyomi())
                .strokeCount(request.getStrokeCount())
                .jlptLevel(request.getJlptLevel().toUpperCase())
                .radicals(request.getRadicals())
                .examples(request.getExamples())
                .createdAt(now)
                .updatedAt(now)
                .build();

        kanjiRepository.save(id, kanji);
        log.info("Created Kanji character: {} (JLPT {})", kanji.getCharacter(), kanji.getJlptLevel());
        return KanjiResponse.fromEntity(kanji);
    }

    @Override
    public void deleteKanji(String id) {
        if (!kanjiRepository.existsById(id)) {
            throw new ResourceNotFoundException("Kanji", id);
        }
        kanjiRepository.deleteById(id);
    }
}
