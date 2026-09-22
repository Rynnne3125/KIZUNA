package com.kizuna.dto.response;

public class MilestoneProgressDto {
    private String id;
    private String stageId;
    private String title;
    private String nejUnit;
    private int orderIndex;
    private String communicationContext;
    private String status; // LOCKED, UNLOCKED, IN_PROGRESS, COMPLETED
    private int completedQuestsCount;
    private int totalQuests = 4;
    private int currentQuestIndex = 1;
    private int xpReward;
    private int activePointsReward;
    private double vocabMasteryRate;

    public MilestoneProgressDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStageId() { return stageId; }
    public void setStageId(String stageId) { this.stageId = stageId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getNejUnit() { return nejUnit; }
    public void setNejUnit(String nejUnit) { this.nejUnit = nejUnit; }

    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }

    public String getCommunicationContext() { return communicationContext; }
    public void setCommunicationContext(String communicationContext) { this.communicationContext = communicationContext; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getCompletedQuestsCount() { return completedQuestsCount; }
    public void setCompletedQuestsCount(int completedQuestsCount) { this.completedQuestsCount = completedQuestsCount; }

    public int getTotalQuests() { return totalQuests; }
    public void setTotalQuests(int totalQuests) { this.totalQuests = totalQuests; }

    public int getCurrentQuestIndex() { return currentQuestIndex; }
    public void setCurrentQuestIndex(int currentQuestIndex) { this.currentQuestIndex = currentQuestIndex; }

    public int getXpReward() { return xpReward; }
    public void setXpReward(int xpReward) { this.xpReward = xpReward; }

    public int getActivePointsReward() { return activePointsReward; }
    public void setActivePointsReward(int activePointsReward) { this.activePointsReward = activePointsReward; }

    public double getVocabMasteryRate() { return vocabMasteryRate; }
    public void setVocabMasteryRate(double vocabMasteryRate) { this.vocabMasteryRate = vocabMasteryRate; }
}
