package com.kizuna.dto.response;

import java.util.ArrayList;
import java.util.List;

public class JourneyMapResponse {
    private String username;
    private int currentStreak;
    private int totalXp;
    private int activePoints;
    private List<StageWithMilestonesDto> stages = new ArrayList<>();

    public JourneyMapResponse() {}

    public JourneyMapResponse(String username, int currentStreak, int totalXp, int activePoints, List<StageWithMilestonesDto> stages) {
        this.username = username;
        this.currentStreak = currentStreak;
        this.totalXp = totalXp;
        this.activePoints = activePoints;
        this.stages = stages;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

    public int getTotalXp() { return totalXp; }
    public void setTotalXp(int totalXp) { this.totalXp = totalXp; }

    public int getActivePoints() { return activePoints; }
    public void setActivePoints(int activePoints) { this.activePoints = activePoints; }

    public List<StageWithMilestonesDto> getStages() { return stages; }
    public void setStages(List<StageWithMilestonesDto> stages) { this.stages = stages; }
}
