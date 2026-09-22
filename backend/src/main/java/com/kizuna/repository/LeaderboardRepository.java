package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.LeaderboardEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class LeaderboardRepository {

    private static final Logger logger = LoggerFactory.getLogger(LeaderboardRepository.class);
    private static final String COLLECTION_NAME = "leaderboard";

    private final Firestore firestore;
    private final Map<String, LeaderboardEntry> leaderboardStorage = new ConcurrentHashMap<>();

    public LeaderboardRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
        // Seed default leaderboard entries for demo/visual testing
        seedSampleLeaderboard();
    }

    private void seedSampleLeaderboard() {
        LeaderboardEntry e1 = new LeaderboardEntry("demo_1", "Nguyen Van An", "", 1240, 14);
        LeaderboardEntry e2 = new LeaderboardEntry("demo_2", "Le Thi Mai", "", 980, 10);
        LeaderboardEntry e3 = new LeaderboardEntry("demo_3", "Tran Minh Duc", "", 850, 7);
        LeaderboardEntry e4 = new LeaderboardEntry("demo_4", "Yamada Kenji", "", 710, 5);
        LeaderboardEntry e5 = new LeaderboardEntry("2", "Kizuna Standard User", "", 450, 3);
        save(e1);
        save(e2);
        save(e3);
        save(e4);
        save(e5);
    }

    public List<LeaderboardEntry> getTop(int limit, String type) {
        Comparator<LeaderboardEntry> comparator = "weekly".equalsIgnoreCase(type)
                ? Comparator.comparingInt(LeaderboardEntry::getWeeklyPoints).reversed()
                : Comparator.comparingInt(LeaderboardEntry::getActivePoints).reversed();

        List<LeaderboardEntry> sorted = leaderboardStorage.values().stream()
                .sorted(comparator)
                .collect(Collectors.toList());

        for (int i = 0; i < sorted.size(); i++) {
            sorted.get(i).setRankPosition(i + 1);
        }

        return sorted.stream().limit(limit).collect(Collectors.toList());
    }

    public Optional<LeaderboardEntry> findByUserId(String userId) {
        return Optional.ofNullable(leaderboardStorage.get(userId));
    }

    public LeaderboardEntry save(LeaderboardEntry entry) {
        entry.setUpdatedAt(System.currentTimeMillis());
        leaderboardStorage.put(entry.getUserId(), entry);

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(entry.getUserId()).set(entry);
            } catch (Exception e) {
                logger.debug("Firestore persist for leaderboard skipped: {}", e.getMessage());
            }
        }
        return entry;
    }
}
