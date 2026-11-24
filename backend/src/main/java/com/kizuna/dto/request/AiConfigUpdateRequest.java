package com.kizuna.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

public class AiConfigUpdateRequest {

    @Pattern(regexp = "^gemini-[a-z0-9.-]+$", message = "Model phải tuân theo định dạng gemini-*")
    private String model;

    @Min(value = 0, message = "dailyLimit phải >= 0")
    @Max(value = 100000, message = "dailyLimit quá lớn")
    private Integer dailyLimit;

    @Min(value = 2, message = "timeoutSeconds tối thiểu 2 giây")
    @Max(value = 30, message = "timeoutSeconds tối đa 30 giây")
    private Integer timeoutSeconds;

    private Boolean senseiEnabled;
    private String senseiSystemPrompt;

    public AiConfigUpdateRequest() {}

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(Integer dailyLimit) { this.dailyLimit = dailyLimit; }

    public Integer getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(Integer timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public Boolean getSenseiEnabled() { return senseiEnabled; }
    public void setSenseiEnabled(Boolean senseiEnabled) { this.senseiEnabled = senseiEnabled; }

    public String getSenseiSystemPrompt() { return senseiSystemPrompt; }
    public void setSenseiSystemPrompt(String senseiSystemPrompt) { this.senseiSystemPrompt = senseiSystemPrompt; }
}
