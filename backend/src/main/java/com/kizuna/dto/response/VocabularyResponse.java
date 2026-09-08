package com.kizuna.dto.response;

import com.kizuna.model.Vocabulary;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyResponse {

    private String id;
    private String term;
    private String reading;
    private String romaji;
    private List<String> meanings;
    private String wordType;
    private String jlptLevel;
    private String audioUrl;
    private String exampleSentenceJa;
    private String exampleSentenceVi;
    private String lessonId;

    public static VocabularyResponse fromEntity(Vocabulary vocab) {
        if (vocab == null) return null;
        return VocabularyResponse.builder()
                .id(vocab.getId())
                .term(vocab.getTerm())
                .reading(vocab.getReading())
                .romaji(vocab.getRomaji())
                .meanings(vocab.getMeanings())
                .wordType(vocab.getWordType())
                .jlptLevel(vocab.getJlptLevel())
                .audioUrl(vocab.getAudioUrl())
                .exampleSentenceJa(vocab.getExampleSentenceJa())
                .exampleSentenceVi(vocab.getExampleSentenceVi())
                .lessonId(vocab.getLessonId())
                .build();
    }
}
