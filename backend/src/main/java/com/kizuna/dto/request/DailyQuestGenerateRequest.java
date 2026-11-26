package com.kizuna.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class DailyQuestGenerateRequest {

    @Size(max = 128)
    private String userId;

    @Size(max = 20)
    private String date; // YYYY-MM-DD

    @Size(max = 32)
    private String level; // N5, N4, N3, N2, N1

    @Size(max = 120)
    private String currentStageTitle;

    @Size(max = 128)
    private String currentMilestoneId;

    @Size(max = 160)
    private String currentMilestoneTitle;

    @Min(0)
    private int vocabLearned;

    @Min(0)
    private int kanjiLearned;

    @Min(0)
    private int grammarLearned;

    @Min(0)
    private int examsCompleted;

    @Min(0)
    private int completedMilestonesCount;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getCurrentStageTitle() { return currentStageTitle; }
    public void setCurrentStageTitle(String currentStageTitle) { this.currentStageTitle = currentStageTitle; }

    public String getCurrentMilestoneId() { return currentMilestoneId; }
    public void setCurrentMilestoneId(String currentMilestoneId) { this.currentMilestoneId = currentMilestoneId; }

    public String getCurrentMilestoneTitle() { return currentMilestoneTitle; }
    public void setCurrentMilestoneTitle(String currentMilestoneTitle) { this.currentMilestoneTitle = currentMilestoneTitle; }

    public int getVocabLearned() { return vocabLearned; }
    public void setVocabLearned(int vocabLearned) { this.vocabLearned = vocabLearned; }

    public int getKanjiLearned() { return kanjiLearned; }
    public void setKanjiLearned(int kanjiLearned) { this.kanjiLearned = kanjiLearned; }

    public int getGrammarLearned() { return grammarLearned; }
    public void setGrammarLearned(int grammarLearned) { this.grammarLearned = grammarLearned; }

    public int getExamsCompleted() { return examsCompleted; }
    public void setExamsCompleted(int examsCompleted) { this.examsCompleted = examsCompleted; }

    public int getCompletedMilestonesCount() { return completedMilestonesCount; }
    public void setCompletedMilestonesCount(int completedMilestonesCount) { this.completedMilestonesCount = completedMilestonesCount; }
}
