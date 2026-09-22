package com.kizuna.service;

import com.kizuna.dto.response.LeaderboardResponse;

public interface LeaderboardService {
    LeaderboardResponse getLeaderboard(String currentUserId, String type);
    void recordPoints(String userId, String username, int pointsDelta, int streak);
}
