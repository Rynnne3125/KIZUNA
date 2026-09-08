package com.kizuna.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressSummaryResponse {

    private int totalStudied;
    private int dueForReviewToday;
    private int masteredCount;
    private int learningCount;
    private int dailyStreak;
    private long totalXp;
}
