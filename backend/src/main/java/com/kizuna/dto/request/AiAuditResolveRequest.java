package com.kizuna.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class AiAuditResolveRequest {

    @NotBlank(message = "decision is required")
    @Pattern(regexp = "^(APPROVE|REJECT)$", message = "Decision must be either APPROVE or REJECT")
    private String decision;

    private int bonusPoints = 25;
    private String adminNote;

    public AiAuditResolveRequest() {}

    public AiAuditResolveRequest(String decision, int bonusPoints, String adminNote) {
        this.decision = decision;
        this.bonusPoints = bonusPoints;
        this.adminNote = adminNote;
    }

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public int getBonusPoints() { return bonusPoints; }
    public void setBonusPoints(int bonusPoints) { this.bonusPoints = bonusPoints; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String adminNote) { this.adminNote = adminNote; }
}
