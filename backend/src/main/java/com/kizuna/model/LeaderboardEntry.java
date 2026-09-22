package com.kizuna.model;

public class LeaderboardEntry {
    private String userId;
    private String displayName;
    private String avatarUrl = "";
    private int activePoints = 0;
    private int rankPosition = 0;
    private int currentStreak = 0;
    private int weeklyPoints = 0;
    private Long updatedAt;

    public LeaderboardEntry() {}

    public LeaderboardEntry(String userId, String displayName, String avatarUrl, int activePoints, int currentStreak) {
        this.userId = userId;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.activePoints = activePoints;
        this.weeklyPoints = activePoints;
        this.currentStreak = currentStreak;
        this.updatedAt = System.currentTimeMillis();
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public int getActivePoints() { return activePoints; }
    public void setActivePoints(int activePoints) { this.activePoints = activePoints; }

    public int getRankPosition() { return rankPosition; }
    public void setRankPosition(int rankPosition) { this.rankPosition = rankPosition; }

    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

    public int getWeeklyPoints() { return weeklyPoints; }
    public void setWeeklyPoints(int weeklyPoints) { this.weeklyPoints = weeklyPoints; }

    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
