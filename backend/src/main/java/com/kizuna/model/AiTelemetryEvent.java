package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AiTelemetryEvent {
    private String id;
    private String type; // PLACEMENT or SENSEI
    private String model;
    private String confidence; // HIGH, MODERATE, LOW, or N/A
    private String milestoneId;
    private String assignedLevel;
    private long latencyMs;
    private String status; // SUCCESS, RATE_LIMITED, FALLBACK, ERROR
    private int httpStatus;
    private long timestamp;

    public AiTelemetryEvent() {}

    public AiTelemetryEvent(String id, String type, String model, String confidence,
                            String milestoneId, String assignedLevel, long latencyMs,
                            String status, int httpStatus, long timestamp) {
        this.id = id;
        this.type = type;
        this.model = model;
        this.confidence = confidence;
        this.milestoneId = milestoneId;
        this.assignedLevel = assignedLevel;
        this.latencyMs = latencyMs;
        this.status = status;
        this.httpStatus = httpStatus;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getAssignedLevel() { return assignedLevel; }
    public void setAssignedLevel(String assignedLevel) { this.assignedLevel = assignedLevel; }

    public long getLatencyMs() { return latencyMs; }
    public void setLatencyMs(long latencyMs) { this.latencyMs = latencyMs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getHttpStatus() { return httpStatus; }
    public void setHttpStatus(int httpStatus) { this.httpStatus = httpStatus; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
