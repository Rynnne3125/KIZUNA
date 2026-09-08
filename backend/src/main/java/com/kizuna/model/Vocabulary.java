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
public class Vocabulary {

    @DocumentId
    private String id;

    private String term;                 // e.g. "学生"
    private String reading;              // e.g. "がくせい"
    private String romaji;               // e.g. "gakusei"

    @Builder.Default
    private List<String> meanings = new ArrayList<>(); // e.g. ["học sinh", "sinh viên"]

    private String wordType;             // e.g. "noun", "verb-group-1", "i-adjective"
    private String jlptLevel;            // "N5", "N4", "N3", "N2", "N1"
    private String audioUrl;
    private String exampleSentenceJa;    // e.g. "私は学生です。"
    private String exampleSentenceVi;    // e.g. "Tôi là học sinh."
    private String lessonId;

    private Date createdAt;
    private Date updatedAt;
}
