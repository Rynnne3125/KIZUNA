package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class User {

    private String id;
    private String username;
    private String password;
    private String fullName;
    private String email;
    private String role; // "ROLE_ADMIN" or "ROLE_USER"
    private boolean enabled = true;
    private String status = "ACTIVE";
    private boolean isDeleted = false;
    private int activePoints = 0;
    private int totalXp = 0;
    private int currentStreak = 0;
    private int longestStreak = 0;
    private int streakFreezes = 0;
    private int weeklyActivePoints = 0;
    private String weeklyPointsWeek;
    private String avatarUrl = "";
    private String level = "N5";
    private Boolean placementVerified;
    private Integer placementScore;
    private String placementMethod;
    private Map<String, Object> placementDetails;
    private String lastAntiCheatNote;
    private String lastActiveDate;
    private String lastStudiedAt;
    private String createdAt;
    private String updatedAt;

    public User() {
    }

    public User(String id, String username, String password, String fullName, String email, String role, boolean enabled) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.enabled = enabled;
        this.status = enabled ? "ACTIVE" : "BANNED";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        this.status = enabled ? "ACTIVE" : "BANNED";
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }

    public int getActivePoints() { return activePoints; }
    public void setActivePoints(int activePoints) { this.activePoints = activePoints; }

    public int getTotalXp() { return totalXp; }
    public void setTotalXp(int totalXp) { this.totalXp = totalXp; }

    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }

    public int getStreakFreezes() { return streakFreezes; }
    public void setStreakFreezes(int streakFreezes) { this.streakFreezes = streakFreezes; }

    public int getWeeklyActivePoints() { return weeklyActivePoints; }
    public void setWeeklyActivePoints(int weeklyActivePoints) { this.weeklyActivePoints = weeklyActivePoints; }

    public String getWeeklyPointsWeek() { return weeklyPointsWeek; }
    public void setWeeklyPointsWeek(String weeklyPointsWeek) { this.weeklyPointsWeek = weeklyPointsWeek; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public Boolean getPlacementVerified() { return placementVerified; }
    public void setPlacementVerified(Boolean placementVerified) { this.placementVerified = placementVerified; }

    public Integer getPlacementScore() { return placementScore; }
    public void setPlacementScore(Integer placementScore) { this.placementScore = placementScore; }

    public String getPlacementMethod() { return placementMethod; }
    public void setPlacementMethod(String placementMethod) { this.placementMethod = placementMethod; }

    public Map<String, Object> getPlacementDetails() { return placementDetails; }
    public void setPlacementDetails(Map<String, Object> placementDetails) { this.placementDetails = placementDetails; }

    public String getLastAntiCheatNote() { return lastAntiCheatNote; }
    public void setLastAntiCheatNote(String lastAntiCheatNote) { this.lastAntiCheatNote = lastAntiCheatNote; }

    public String getLastActiveDate() { return lastActiveDate; }
    public void setLastActiveDate(String lastActiveDate) { this.lastActiveDate = lastActiveDate; }

    public String getLastStudiedAt() { return lastStudiedAt; }
    public void setLastStudiedAt(String lastStudiedAt) { this.lastStudiedAt = lastStudiedAt; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
