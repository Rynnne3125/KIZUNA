package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAuditEntry {
    private String id;
    private String userId;
    private String username;
    private String milestoneId;
    private String milestoneTitle;
    private String questTitle;
    private String promptText;
    private String studentInput;
    private String userSubmission;
    private String aiResponse;
    private String aiFeedback;
    private int aiScore;
    private String studentReason;
    private String studentAppealReason;
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED
    private String adminNote;
    private String resolvedBy;
    private int bonusPointsAwarded = 0;
    private String submittedAt;
    private Long createdAt;
    private Long resolvedAt;

    public AiAuditEntry() {}

    public AiAuditEntry(String id, String userId, String username, String milestoneId,
                        String promptText, String studentInput, String aiResponse,
                        int aiScore, String studentReason) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.milestoneId = milestoneId;
        this.milestoneTitle = milestoneId;
        this.questTitle = "Quest 4: Thực hành viết câu AI Sensei";
        this.promptText = promptText;
        this.studentInput = studentInput;
        this.userSubmission = studentInput;
        this.aiResponse = aiResponse;
        this.aiFeedback = aiResponse;
        this.aiScore = aiScore;
        this.studentReason = studentReason;
        this.studentAppealReason = studentReason;
        this.status = "PENDING";
        this.createdAt = System.currentTimeMillis();
        this.submittedAt = Instant.ofEpochMilli(this.createdAt).toString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getMilestoneTitle() {
        return milestoneTitle != null && !milestoneTitle.isBlank() ? milestoneTitle : milestoneId;
    }
    public void setMilestoneTitle(String milestoneTitle) { this.milestoneTitle = milestoneTitle; }

    public String getQuestTitle() { return questTitle; }
    public void setQuestTitle(String questTitle) { this.questTitle = questTitle; }

    public String getPromptText() { return promptText; }
    public void setPromptText(String promptText) { this.promptText = promptText; }

    public String getStudentInput() {
        return studentInput != null ? studentInput : userSubmission;
    }
    public void setStudentInput(String studentInput) {
        this.studentInput = studentInput;
        if (this.userSubmission == null) this.userSubmission = studentInput;
    }

    public String getUserSubmission() {
        return userSubmission != null ? userSubmission : studentInput;
    }
    public void setUserSubmission(String userSubmission) {
        this.userSubmission = userSubmission;
        if (this.studentInput == null) this.studentInput = userSubmission;
    }

    public String getAiResponse() {
        return aiResponse != null ? aiResponse : aiFeedback;
    }
    public void setAiResponse(String aiResponse) {
        this.aiResponse = aiResponse;
        if (this.aiFeedback == null) this.aiFeedback = aiResponse;
    }

    public String getAiFeedback() {
        return aiFeedback != null ? aiFeedback : aiResponse;
    }
    public void setAiFeedback(String aiFeedback) {
        this.aiFeedback = aiFeedback;
        if (this.aiResponse == null) this.aiResponse = aiFeedback;
    }

    public int getAiScore() { return aiScore; }
    public void setAiScore(int aiScore) { this.aiScore = aiScore; }

    public String getStudentReason() {
        return studentReason != null ? studentReason : studentAppealReason;
    }
    public void setStudentReason(String studentReason) {
        this.studentReason = studentReason;
        if (this.studentAppealReason == null) this.studentAppealReason = studentReason;
    }

    public String getStudentAppealReason() {
        return studentAppealReason != null ? studentAppealReason : studentReason;
    }
    public void setStudentAppealReason(String studentAppealReason) {
        this.studentAppealReason = studentAppealReason;
        if (this.studentReason == null) this.studentReason = studentAppealReason;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String adminNote) { this.adminNote = adminNote; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public int getBonusPointsAwarded() { return bonusPointsAwarded; }
    public void setBonusPointsAwarded(int bonusPointsAwarded) { this.bonusPointsAwarded = bonusPointsAwarded; }

    public String getSubmittedAt() {
        if (submittedAt != null && !submittedAt.isBlank()) return submittedAt;
        if (createdAt != null) return Instant.ofEpochMilli(createdAt).toString();
        return null;
    }
    public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    public Long getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Long resolvedAt) { this.resolvedAt = resolvedAt; }
}
