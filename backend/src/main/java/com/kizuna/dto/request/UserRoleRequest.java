package com.kizuna.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UserRoleRequest {

    @NotBlank(message = "role is required")
    @Pattern(regexp = "^(ROLE_ADMIN|ROLE_USER)$", message = "Role must be either ROLE_ADMIN or ROLE_USER")
    private String role;

    public UserRoleRequest() {}

    public UserRoleRequest(String role) {
        this.role = role;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
