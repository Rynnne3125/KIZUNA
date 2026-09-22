package com.kizuna.dto.request;

import jakarta.validation.constraints.NotNull;

public class AntiCheatAdjustPointsRequest {

    @NotNull(message = "pointsAdjustment is required")
    private Integer pointsAdjustment;

    private String reason;

    public AntiCheatAdjustPointsRequest() {}

    public AntiCheatAdjustPointsRequest(Integer pointsAdjustment, String reason) {
        this.pointsAdjustment = pointsAdjustment;
        this.reason = reason;
    }

    public Integer getPointsAdjustment() { return pointsAdjustment; }
    public void setPointsAdjustment(Integer pointsAdjustment) { this.pointsAdjustment = pointsAdjustment; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
