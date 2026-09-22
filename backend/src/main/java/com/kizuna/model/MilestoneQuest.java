package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;

import java.util.HashMap;
import java.util.Map;

public class MilestoneQuest {
    private String id;
    private String milestoneId;
    private int stepIndex; // 1, 2, 3, 4
    private String questType;
    private String title;
    private String description;
    private int xpReward = 50;
    private int activePointsReward = 25;

    // Flexible payload for quest data (deckContent, quizQuestions, wordTokens, etc.)
    private Map<String, Object> additionalData = new HashMap<>();

    public MilestoneQuest() {}

    public MilestoneQuest(String id, String milestoneId, int stepIndex, String questType, String title, String description, int xpReward, int activePointsReward) {
        this.id = id;
        this.milestoneId = milestoneId;
        this.stepIndex = stepIndex;
        this.questType = questType;
        this.title = title;
        this.description = description;
        this.xpReward = xpReward;
        this.activePointsReward = activePointsReward;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public int getStepIndex() { return stepIndex; }
    public void setStepIndex(int stepIndex) { this.stepIndex = stepIndex; }

    public String getQuestType() { return questType; }
    public void setQuestType(String questType) { this.questType = questType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getXpReward() { return xpReward; }
    public void setXpReward(int xpReward) { this.xpReward = xpReward; }

    public int getActivePointsReward() { return activePointsReward; }
    public void setActivePointsReward(int activePointsReward) { this.activePointsReward = activePointsReward; }

    @JsonAnyGetter
    public Map<String, Object> getAdditionalData() {
        return additionalData;
    }

    @JsonAnySetter
    public void setAdditionalData(String key, Object value) {
        this.additionalData.put(key, value);
    }

    public void setAdditionalDataMap(Map<String, Object> data) {
        if (data != null) {
            this.additionalData = data;
        }
    }
}
