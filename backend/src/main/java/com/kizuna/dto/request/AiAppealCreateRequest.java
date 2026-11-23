package com.kizuna.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AiAppealCreateRequest {

    private String userId;
    private String username;
    private String milestoneId;
    private String milestoneTitle;
    private String questTitle;
    private String promptText;

    @NotBlank(message = "studentInput không được để trống")
    @Size(max = 1000)
    private String studentInput;

    private String aiFeedback;

    @Min(0)
    @Max(10)
    private int aiScore;

    @NotBlank(message = "studentReason không được để trống")
    @Size(max = 1000)
    private String studentReason;

    public AiAppealCreateRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getMilestoneTitle() { return milestoneTitle; }
    public void setMilestoneTitle(String milestoneTitle) { this.milestoneTitle = milestoneTitle; }

    public String getQuestTitle() { return questTitle; }
    public void setQuestTitle(String questTitle) { this.questTitle = questTitle; }

    public String getPromptText() { return promptText; }
    public void setPromptText(String promptText) { this.promptText = promptText; }

    public String getStudentInput() { return studentInput; }
    public void setStudentInput(String studentInput) { this.studentInput = studentInput; }

    public String getAiFeedback() { return aiFeedback; }
    public void setAiFeedback(String aiFeedback) { this.aiFeedback = aiFeedback; }

    public int getAiScore() { return aiScore; }
    public void setAiScore(int aiScore) { this.aiScore = aiScore; }

    public String getStudentReason() { return studentReason; }
    public void setStudentReason(String studentReason) { this.studentReason = studentReason; }
}
