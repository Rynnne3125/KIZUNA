package com.kizuna.model;

import com.google.cloud.firestore.annotation.DocumentId;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IgnoreExtraProperties
public class UserProgress {

    @DocumentId
    private String id; // format: "{userId}_{itemType}_{itemId}"

    private String userId;
    private String itemId;
    private String itemType; // "KANJI", "VOCABULARY"
    private String status;   // "NEW", "LEARNING", "REVIEW", "MASTERED"

    @Builder.Default
    private int repetitionCount = 0;

    @Builder.Default
    private double intervalDays = 1.0;

    @Builder.Default
    private double easeFactor = 2.5; // SuperMemo-2 base ease factor

    private Date nextReviewDate;
    private Date lastReviewedDate;

    @Builder.Default
    private int correctStreak = 0;

    @Builder.Default
    private boolean bookmarked = false;

    private Date createdAt;
    private Date updatedAt;
}
