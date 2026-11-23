package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SystemSettings {
    private boolean maintenanceMode = false;
    private String maintenanceMessage = "Hệ thống KIZUNA đang được bảo trì và cập nhật nội dung giáo trình. Vui lòng quay lại sau ít phút.";
    private boolean allowNewRegistrations = true;
    private boolean aiSenseiEnabled = true;
    private String updatedBy = "system";
    private String updatedAt;

    public SystemSettings() {}

    public boolean isMaintenanceMode() { return maintenanceMode; }
    public void setMaintenanceMode(boolean maintenanceMode) { this.maintenanceMode = maintenanceMode; }

    public String getMaintenanceMessage() { return maintenanceMessage; }
    public void setMaintenanceMessage(String maintenanceMessage) { this.maintenanceMessage = maintenanceMessage; }

    public boolean isAllowNewRegistrations() { return allowNewRegistrations; }
    public void setAllowNewRegistrations(boolean allowNewRegistrations) { this.allowNewRegistrations = allowNewRegistrations; }

    public boolean isAiSenseiEnabled() { return aiSenseiEnabled; }
    public void setAiSenseiEnabled(boolean aiSenseiEnabled) { this.aiSenseiEnabled = aiSenseiEnabled; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
