package com.kizuna.service;

import com.kizuna.dto.request.VocabularyCreateRequest;
import com.kizuna.dto.response.VocabularyResponse;

import java.util.List;

public interface VocabularyService {

    List<VocabularyResponse> getVocabulariesByJlpt(String level, int limit);

    List<VocabularyResponse> getVocabulariesByLesson(String lessonId);

    VocabularyResponse getVocabularyById(String id);

    VocabularyResponse createVocabulary(VocabularyCreateRequest request);

    void deleteVocabulary(String id);
}
