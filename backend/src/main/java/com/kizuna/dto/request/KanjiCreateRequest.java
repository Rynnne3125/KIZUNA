package com.kizuna.dto.request;

import com.kizuna.model.Kanji.KanjiExample;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
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
public class KanjiCreateRequest {

    @NotBlank(message = "Kanji character must not be blank")
    private String character;

    @NotEmpty(message = "At least one meaning must be provided")
    @Builder.Default
    private List<String> meanings = new ArrayList<>();

    @Builder.Default
    private List<String> onyomi = new ArrayList<>();

    @Builder.Default
    private List<String> kunyomi = new ArrayList<>();

    @Positive(message = "Stroke count must be a positive integer")
    private int strokeCount;

    @NotBlank(message = "JLPT level is required (e.g. N5, N4, N3)")
    private String jlptLevel;

    @Builder.Default
    private List<String> radicals = new ArrayList<>();

    @Builder.Default
    private List<KanjiExample> examples = new ArrayList<>();
}
