package com.kizuna.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyCreateRequest {

    @NotBlank(message = "Vocabulary term is required")
    private String term;

    @NotBlank(message = "Reading in Hiragana/Katakana is required")
    private String reading;

    private String romaji;

    @NotEmpty(message = "At least one meaning is required")
    @Builder.Default
    private List<String> meanings = new ArrayList<>();

    private String wordType;

    @NotBlank(message = "JLPT level is required (e.g. N5)")
    private String jlptLevel;

    private String audioUrl;
    private String exampleSentenceJa;
    private String exampleSentenceVi;
    private String lessonId;
}
