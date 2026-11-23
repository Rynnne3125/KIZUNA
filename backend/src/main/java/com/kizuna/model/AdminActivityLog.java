package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AdminActivityLog {
    private String id;
    private String adminUsername;
    private String action; // e.g. USER_ROLE_UPDATE, USER_BAN, RESET_STREAK, ADJUST_POINTS, AI_AUDIT_RESOLVE, AI_CONFIG_UPDATE, BULK_IMPORT, RESTORE_SEED, SYSTEM_SETTINGS_UPDATE
    private String targetType; // USER, STAGE, MILESTONE, VOCABULARY, KANJI, GRAMMAR, EXAM, AI_AUDIT, AI_CONFIG, SYSTEM
    private String targetId;
    private String details;
    private String timestamp;

    public AdminActivityLog() {}

    public AdminActivityLog(String id, String adminUsername, String action,
                            String targetType, String targetId, String details, String timestamp) {
        this.id = id;
        this.adminUsername = adminUsername;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.details = details;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAdminUsername() { return adminUsername; }
    public void setAdminUsername(String adminUsername) { this.adminUsername = adminUsername; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
