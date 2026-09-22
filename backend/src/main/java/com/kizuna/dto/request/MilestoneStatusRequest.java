package com.kizuna.dto.request;

import jakarta.validation.constraints.NotNull;

public class MilestoneStatusRequest {

    @NotNull(message = "active flag is required")
    private Boolean active;

    public MilestoneStatusRequest() {}

    public MilestoneStatusRequest(Boolean active) {
        this.active = active;
    }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
