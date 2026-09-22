package com.kizuna.dto.request;

import jakarta.validation.constraints.NotBlank;

public class AiSandboxRequest {

    private String milestoneId;
    private Double temperature = 0.7;
    private String systemPrompt;

    @NotBlank(message = "studentInput is required")
    private String studentInput;

    public AiSandboxRequest() {}

    public AiSandboxRequest(String milestoneId, Double temperature, String systemPrompt, String studentInput) {
        this.milestoneId = milestoneId;
        this.temperature = temperature;
        this.systemPrompt = systemPrompt;
        this.studentInput = studentInput;
    }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }

    public String getSystemPrompt() { return systemPrompt; }
    public void setSystemPrompt(String systemPrompt) { this.systemPrompt = systemPrompt; }

    public String getStudentInput() { return studentInput; }
    public void setStudentInput(String studentInput) { this.studentInput = studentInput; }
}
