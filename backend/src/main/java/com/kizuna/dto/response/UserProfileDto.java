package com.kizuna.dto.response;

import java.util.ArrayList;
import java.util.List;

public class UserProfileDto {
    private String id;
    private String username;
    private String fullName;
    private String email;
    private String role;
    private String level;
    private int totalXp;
    private int activePoints;
    private int currentStreak;
    private int longestStreak;
    private String avatarUrl;
    private int wordsMastered;
    private int kanjiMastered;
    private int milestonesCompleted;
    private List<String> badges = new ArrayList<>();

    public UserProfileDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public int getTotalXp() { return totalXp; }
    public void setTotalXp(int totalXp) { this.totalXp = totalXp; }

    public int getActivePoints() { return activePoints; }
    public void setActivePoints(int activePoints) { this.activePoints = activePoints; }

    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public int getWordsMastered() { return wordsMastered; }
    public void setWordsMastered(int wordsMastered) { this.wordsMastered = wordsMastered; }

    public int getKanjiMastered() { return kanjiMastered; }
    public void setKanjiMastered(int kanjiMastered) { this.kanjiMastered = kanjiMastered; }

    public int getMilestonesCompleted() { return milestonesCompleted; }
    public void setMilestonesCompleted(int milestonesCompleted) { this.milestonesCompleted = milestonesCompleted; }

    public List<String> getBadges() { return badges; }
    public void setBadges(List<String> badges) { this.badges = badges; }
}
