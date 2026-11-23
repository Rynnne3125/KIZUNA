package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AiRuntimeConfig {
    private String model = "gemini-3.5-flash-lite";
    private int dailyLimit = 100;
    private int timeoutSeconds = 5;
    private int maxConcurrency = 2;
    private boolean senseiEnabled = true;
    private String senseiSystemPrompt =
            "Bạn là AI Sensei tiếng Nhật của hệ thống KIZUNA. Chấm câu viết tiếng Nhật của học viên dựa trên Whitelist từ vựng và ngữ pháp của cột mốc, phát hiện lỗi trợ từ (は/が/を/に/で/へ/の), trả về điểm thang 10 và gợi ý diễn đạt tự nhiên.";
    private String updatedBy = "system";
    private String updatedAt;

    public AiRuntimeConfig() {}

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public int getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(int dailyLimit) { this.dailyLimit = dailyLimit; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public int getMaxConcurrency() { return maxConcurrency; }
    public void setMaxConcurrency(int maxConcurrency) { this.maxConcurrency = maxConcurrency; }

    public boolean isSenseiEnabled() { return senseiEnabled; }
    public void setSenseiEnabled(boolean senseiEnabled) { this.senseiEnabled = senseiEnabled; }

    public String getSenseiSystemPrompt() { return senseiSystemPrompt; }
    public void setSenseiSystemPrompt(String senseiSystemPrompt) { this.senseiSystemPrompt = senseiSystemPrompt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
