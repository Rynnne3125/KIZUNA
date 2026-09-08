package com.kizuna.model;

import com.google.cloud.firestore.annotation.DocumentId;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IgnoreExtraProperties
public class Kanji {

    @DocumentId
    private String id;

    private String character; // e.g. "日"

    @Builder.Default
    private List<String> meanings = new ArrayList<>(); // e.g. ["mặt trời", "ngày", "Nhật"]

    @Builder.Default
    private List<String> onyomi = new ArrayList<>(); // e.g. ["ニチ", "ジツ"]

    @Builder.Default
    private List<String> kunyomi = new ArrayList<>(); // e.g. ["ひ", "-び", "-か"]

    private int strokeCount;
    private String jlptLevel; // "N5", "N4", "N3", "N2", "N1"

    @Builder.Default
    private List<String> radicals = new ArrayList<>();

    @Builder.Default
    private List<KanjiExample> examples = new ArrayList<>();

    private Date createdAt;
    private Date updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @IgnoreExtraProperties
    public static class KanjiExample {
        private String word;      // e.g. "日本"
        private String reading;   // e.g. "にほん"
        private String meaning;   // e.g. "Nhật Bản"
    }
}
