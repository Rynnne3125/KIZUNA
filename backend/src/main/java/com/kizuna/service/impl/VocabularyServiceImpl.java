package com.kizuna.service.impl;

import com.kizuna.dto.request.VocabularyCreateRequest;
import com.kizuna.dto.response.VocabularyResponse;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.Vocabulary;
import com.kizuna.repository.VocabularyRepository;
import com.kizuna.service.VocabularyService;
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
public class VocabularyServiceImpl implements VocabularyService {

    private final VocabularyRepository vocabularyRepository;

    @Override
    public List<VocabularyResponse> getVocabulariesByJlpt(String level, int limit) {
        List<Vocabulary> list;
        if (level != null && !level.trim().isEmpty()) {
            list = vocabularyRepository.findByJlptLevel(level, limit);
        } else {
            list = vocabularyRepository.findAll(limit);
        }
        return list.stream()
                .map(VocabularyResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<VocabularyResponse> getVocabulariesByLesson(String lessonId) {
        return vocabularyRepository.findByLessonId(lessonId).stream()
                .map(VocabularyResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public VocabularyResponse getVocabularyById(String id) {
        Vocabulary vocab = vocabularyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vocabulary", id));
        return VocabularyResponse.fromEntity(vocab);
    }

    @Override
    public VocabularyResponse createVocabulary(VocabularyCreateRequest request) {
        String id = UUID.randomUUID().toString();
        Date now = new Date();

        Vocabulary vocab = Vocabulary.builder()
                .id(id)
                .term(request.getTerm())
                .reading(request.getReading())
                .romaji(request.getRomaji())
                .meanings(request.getMeanings())
                .wordType(request.getWordType())
                .jlptLevel(request.getJlptLevel().toUpperCase())
                .audioUrl(request.getAudioUrl())
                .exampleSentenceJa(request.getExampleSentenceJa())
                .exampleSentenceVi(request.getExampleSentenceVi())
                .lessonId(request.getLessonId())
                .createdAt(now)
                .updatedAt(now)
                .build();

        vocabularyRepository.save(id, vocab);
        log.info("Created Vocabulary: {} / {} (JLPT {})", vocab.getTerm(), vocab.getReading(), vocab.getJlptLevel());
        return VocabularyResponse.fromEntity(vocab);
    }

    @Override
    public void deleteVocabulary(String id) {
        if (!vocabularyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vocabulary", id);
        }
        vocabularyRepository.deleteById(id);
    }
}
