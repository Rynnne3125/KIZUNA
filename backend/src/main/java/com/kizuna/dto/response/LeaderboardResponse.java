package com.kizuna.dto.response;

import com.kizuna.model.LeaderboardEntry;

import java.util.ArrayList;
import java.util.List;

public class LeaderboardResponse {
    private List<LeaderboardEntry> topUsers = new ArrayList<>();
    private LeaderboardEntry currentUserRank;
    private String type; // "weekly" or "all-time"

    public LeaderboardResponse() {}

    public LeaderboardResponse(List<LeaderboardEntry> topUsers, LeaderboardEntry currentUserRank, String type) {
        this.topUsers = topUsers;
        this.currentUserRank = currentUserRank;
        this.type = type;
    }

    public List<LeaderboardEntry> getTopUsers() { return topUsers; }
    public void setTopUsers(List<LeaderboardEntry> topUsers) { this.topUsers = topUsers; }

    public LeaderboardEntry getCurrentUserRank() { return currentUserRank; }
    public void setCurrentUserRank(LeaderboardEntry currentUserRank) { this.currentUserRank = currentUserRank; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
