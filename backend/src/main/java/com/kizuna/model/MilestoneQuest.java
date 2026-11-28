package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MilestoneQuest {
    private String id;
    private String milestoneId;
    private int stepIndex; // 1, 2, 3, 4
    private String questType;
    private String title;
    private String description;
    private int xpReward = 50;
    private int activePointsReward = 25;

    // Structured exercise payloads configured by Admin for each questType
    private List<String> srsCardIds = new ArrayList<>();
    private List<Map<String, Object>> srsCards = new ArrayList<>();
    private List<Map<String, Object>> quizQuestions = new ArrayList<>();
    private List<Map<String, Object>> scrambleSentences = new ArrayList<>();
    private List<Map<String, Object>> roleplayDialogues = new ArrayList<>();

    // Flexible payload for legacy/extra quest data (deckContent, grammarPoints, prompts, etc.)
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

    public List<String> getSrsCardIds() { return srsCardIds; }
    public void setSrsCardIds(List<String> srsCardIds) {
        this.srsCardIds = srsCardIds != null ? srsCardIds : new ArrayList<>();
    }

    public List<Map<String, Object>> getSrsCards() { return srsCards; }
    public void setSrsCards(List<Map<String, Object>> srsCards) {
        this.srsCards = srsCards != null ? srsCards : new ArrayList<>();
    }

    public List<Map<String, Object>> getQuizQuestions() { return quizQuestions; }
    public void setQuizQuestions(List<Map<String, Object>> quizQuestions) {
        this.quizQuestions = quizQuestions != null ? quizQuestions : new ArrayList<>();
    }

    public List<Map<String, Object>> getScrambleSentences() { return scrambleSentences; }
    public void setScrambleSentences(List<Map<String, Object>> scrambleSentences) {
        this.scrambleSentences = scrambleSentences != null ? scrambleSentences : new ArrayList<>();
    }

    public List<Map<String, Object>> getRoleplayDialogues() { return roleplayDialogues; }
    public void setRoleplayDialogues(List<Map<String, Object>> roleplayDialogues) {
        this.roleplayDialogues = roleplayDialogues != null ? roleplayDialogues : new ArrayList<>();
    }

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
