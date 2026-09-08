package com.kizuna.dto.response;

import com.kizuna.model.Kanji;
import com.kizuna.model.Kanji.KanjiExample;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KanjiResponse {

    private String id;
    private String character;
    private List<String> meanings;
    private List<String> onyomi;
    private List<String> kunyomi;
    private int strokeCount;
    private String jlptLevel;
    private List<String> radicals;
    private List<KanjiExample> examples;

    public static KanjiResponse fromEntity(Kanji kanji) {
        if (kanji == null) return null;
        return KanjiResponse.builder()
                .id(kanji.getId())
                .character(kanji.getCharacter())
                .meanings(kanji.getMeanings())
                .onyomi(kanji.getOnyomi())
                .kunyomi(kanji.getKunyomi())
                .strokeCount(kanji.getStrokeCount())
                .jlptLevel(kanji.getJlptLevel())
                .radicals(kanji.getRadicals())
                .examples(kanji.getExamples())
                .build();
    }
}
