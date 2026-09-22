package com.kizuna.model;

public class Milestone {
    private String id;
    private String stageId;
    private String title;
    private String nejUnit;
    private int orderIndex;
    private String communicationContext;
    private int xpReward = 50;
    private int activePointsReward = 70;
    private String prerequisiteMilestoneId;
    private boolean isActive = true;

    public Milestone() {}

    public Milestone(String id, String stageId, String title, String nejUnit, int orderIndex,
                     String communicationContext, int xpReward, int activePointsReward,
                     String prerequisiteMilestoneId, boolean isActive) {
        this.id = id;
        this.stageId = stageId;
        this.title = title;
        this.nejUnit = nejUnit;
        this.orderIndex = orderIndex;
        this.communicationContext = communicationContext;
        this.xpReward = xpReward;
        this.activePointsReward = activePointsReward;
        this.prerequisiteMilestoneId = prerequisiteMilestoneId;
        this.isActive = isActive;
    }

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

    public int getXpReward() { return xpReward; }
    public void setXpReward(int xpReward) { this.xpReward = xpReward; }

    public int getActivePointsReward() { return activePointsReward; }
    public void setActivePointsReward(int activePointsReward) { this.activePointsReward = activePointsReward; }

    public String getPrerequisiteMilestoneId() { return prerequisiteMilestoneId; }
    public void setPrerequisiteMilestoneId(String prerequisiteMilestoneId) { this.prerequisiteMilestoneId = prerequisiteMilestoneId; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
