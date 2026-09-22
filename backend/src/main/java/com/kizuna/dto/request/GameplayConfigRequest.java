package com.kizuna.dto.request;

import jakarta.validation.constraints.Min;

public class GameplayConfigRequest {

    @Min(value = 0, message = "xpReward must be non-negative")
    private Integer xpReward;

    @Min(value = 0, message = "activePointsReward must be non-negative")
    private Integer activePointsReward;

    private String prerequisiteMilestoneId;

    public GameplayConfigRequest() {}

    public GameplayConfigRequest(Integer xpReward, Integer activePointsReward, String prerequisiteMilestoneId) {
        this.xpReward = xpReward;
        this.activePointsReward = activePointsReward;
        this.prerequisiteMilestoneId = prerequisiteMilestoneId;
    }

    public Integer getXpReward() { return xpReward; }
    public void setXpReward(Integer xpReward) { this.xpReward = xpReward; }

    public Integer getActivePointsReward() { return activePointsReward; }
    public void setActivePointsReward(Integer activePointsReward) { this.activePointsReward = activePointsReward; }

    public String getPrerequisiteMilestoneId() { return prerequisiteMilestoneId; }
    public void setPrerequisiteMilestoneId(String prerequisiteMilestoneId) { this.prerequisiteMilestoneId = prerequisiteMilestoneId; }
}
