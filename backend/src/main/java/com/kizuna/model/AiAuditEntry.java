package com.kizuna.model;

public class AiAuditEntry {
    private String id;
    private String userId;
    private String username;
    private String milestoneId;
    private String promptText;
    private String studentInput;
    private String aiResponse;
    private int aiScore;
    private String studentReason;
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED
    private String adminNote;
    private String resolvedBy;
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
        this.promptText = promptText;
        this.studentInput = studentInput;
        this.aiResponse = aiResponse;
        this.aiScore = aiScore;
        this.studentReason = studentReason;
        this.status = "PENDING";
        this.createdAt = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getPromptText() { return promptText; }
    public void setPromptText(String promptText) { this.promptText = promptText; }

    public String getStudentInput() { return studentInput; }
    public void setStudentInput(String studentInput) { this.studentInput = studentInput; }

    public String getAiResponse() { return aiResponse; }
    public void setAiResponse(String aiResponse) { this.aiResponse = aiResponse; }

    public int getAiScore() { return aiScore; }
    public void setAiScore(int aiScore) { this.aiScore = aiScore; }

    public String getStudentReason() { return studentReason; }
    public void setStudentReason(String studentReason) { this.studentReason = studentReason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String adminNote) { this.adminNote = adminNote; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    public Long getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Long resolvedAt) { this.resolvedAt = resolvedAt; }
}
