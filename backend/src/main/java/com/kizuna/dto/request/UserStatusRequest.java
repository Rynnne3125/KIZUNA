package com.kizuna.dto.request;

import jakarta.validation.constraints.NotNull;

public class UserStatusRequest {

    @NotNull(message = "enabled flag is required")
    private Boolean enabled;

    public UserStatusRequest() {}

    public UserStatusRequest(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
