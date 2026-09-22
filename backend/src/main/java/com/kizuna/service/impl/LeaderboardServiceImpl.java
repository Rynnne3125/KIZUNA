package com.kizuna.service.impl;

import com.kizuna.dto.response.LeaderboardResponse;
import com.kizuna.model.LeaderboardEntry;
import com.kizuna.repository.LeaderboardRepository;
import com.kizuna.service.LeaderboardService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LeaderboardServiceImpl implements LeaderboardService {

    private final LeaderboardRepository leaderboardRepository;

    public LeaderboardServiceImpl(LeaderboardRepository leaderboardRepository) {
        this.leaderboardRepository = leaderboardRepository;
    }

    @Override
    public LeaderboardResponse getLeaderboard(String currentUserId, String type) {
        String filterType = (type != null && !type.isBlank()) ? type : "all-time";
        List<LeaderboardEntry> topUsers = leaderboardRepository.getTop(50, filterType);

        LeaderboardEntry currentUserRank = null;
        if (currentUserId != null) {
            currentUserRank = topUsers.stream()
                    .filter(e -> currentUserId.equalsIgnoreCase(e.getUserId()))
                    .findFirst()
                    .orElseGet(() -> leaderboardRepository.findByUserId(currentUserId).orElse(null));
        }

        return new LeaderboardResponse(topUsers, currentUserRank, filterType);
    }

    @Override
    public void recordPoints(String userId, String username, int pointsDelta, int streak) {
        LeaderboardEntry entry = leaderboardRepository.findByUserId(userId)
                .orElse(new LeaderboardEntry(userId, username, "", 0, streak));

        entry.setActivePoints(entry.getActivePoints() + pointsDelta);
        entry.setWeeklyPoints(entry.getWeeklyPoints() + pointsDelta);
        entry.setCurrentStreak(streak);
        leaderboardRepository.save(entry);
    }
}
