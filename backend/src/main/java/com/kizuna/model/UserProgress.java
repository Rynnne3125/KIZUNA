package com.kizuna.model;

import java.util.ArrayList;
import java.util.List;

public class UserProgress {
    private String id; // Format: {userId}_{milestoneId}
    private String userId;
    private String milestoneId;
    private String status = "LOCKED"; // LOCKED, UNLOCKED, IN_PROGRESS, COMPLETED
    private List<String> completedQuests = new ArrayList<>();
    private int currentQuestIndex = 1;
    private double vocabMasteryRate = 0.0;
    private int activePointsEarned = 0;
    private Long unlockedAt;
    private Long completedAt;
    private Long lastReviewedAt;

    public UserProgress() {}

    public UserProgress(String userId, String milestoneId, String status) {
        this.id = userId + "_" + milestoneId;
        this.userId = userId;
        this.milestoneId = milestoneId;
        this.status = status;
        this.unlockedAt = System.currentTimeMillis();
        this.lastReviewedAt = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<String> getCompletedQuests() { return completedQuests; }
    public void setCompletedQuests(List<String> completedQuests) { this.completedQuests = completedQuests; }

    public int getCurrentQuestIndex() { return currentQuestIndex; }
    public void setCurrentQuestIndex(int currentQuestIndex) { this.currentQuestIndex = currentQuestIndex; }

    public double getVocabMasteryRate() { return vocabMasteryRate; }
    public void setVocabMasteryRate(double vocabMasteryRate) { this.vocabMasteryRate = vocabMasteryRate; }

    public int getActivePointsEarned() { return activePointsEarned; }
    public void setActivePointsEarned(int activePointsEarned) { this.activePointsEarned = activePointsEarned; }

    public Long getUnlockedAt() { return unlockedAt; }
    public void setUnlockedAt(Long unlockedAt) { this.unlockedAt = unlockedAt; }

    public Long getCompletedAt() { return completedAt; }
    public void setCompletedAt(Long completedAt) { this.completedAt = completedAt; }

    public Long getLastReviewedAt() { return lastReviewedAt; }
    public void setLastReviewedAt(Long lastReviewedAt) { this.lastReviewedAt = lastReviewedAt; }
}
