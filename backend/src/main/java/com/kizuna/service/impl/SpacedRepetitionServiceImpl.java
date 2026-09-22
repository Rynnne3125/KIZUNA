package com.kizuna.service.impl;

import com.kizuna.dto.request.SrsReviewRequest;
import com.kizuna.model.LeaderboardEntry;
import com.kizuna.model.User;
import com.kizuna.model.UserSrsItem;
import com.kizuna.repository.LeaderboardRepository;
import com.kizuna.repository.UserRepository;
import com.kizuna.repository.UserSrsRepository;
import com.kizuna.service.SpacedRepetitionService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpacedRepetitionServiceImpl implements SpacedRepetitionService {

    private final UserSrsRepository userSrsRepository;
    private final UserRepository userRepository;
    private final LeaderboardRepository leaderboardRepository;

    public SpacedRepetitionServiceImpl(UserSrsRepository userSrsRepository,
                                       UserRepository userRepository,
                                       LeaderboardRepository leaderboardRepository) {
        this.userSrsRepository = userSrsRepository;
        this.userRepository = userRepository;
        this.leaderboardRepository = leaderboardRepository;
    }

    @Override
    public List<UserSrsItem> getDueItemsToday(String userId) {
        return userSrsRepository.findDueItems(userId, System.currentTimeMillis());
    }

    @Override
    public UserSrsItem reviewItem(String userId, String itemId, SrsReviewRequest request) {
        UserSrsItem item = userSrsRepository.findByUserIdAndItemId(userId, itemId)
                .orElse(new UserSrsItem(userId, "VOCABULARY", itemId));

        int q = request.getQuality(); // 0 to 5
        double ef = item.getEaseFactor();
        double newEf = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (newEf < 1.3) newEf = 1.3;
        item.setEaseFactor(newEf);

        int rep = item.getRepetitionLevel();
        int interval;
        if (q < 3) {
            rep = 0;
            interval = 1;
            item.setFailedCount(item.getFailedCount() + 1);
            item.setFailedQueue(true);
        } else {
            if (rep == 0) {
                interval = 1;
            } else if (rep == 1) {
                interval = 6;
            } else {
                interval = (int) Math.round(item.getIntervalDays() * newEf);
            }
            rep++;
            item.setFailedQueue(false);
        }

        item.setRepetitionLevel(rep);
        item.setIntervalDays(interval);
        item.setNextReviewDate(System.currentTimeMillis() + (long) interval * 86400000L);
        item.setLastReviewQuality(q);

        userSrsRepository.save(item);

        // Award +5 Active Points for review session
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            user.setActivePoints(user.getActivePoints() + 5);
            userRepository.save(user);

            LeaderboardEntry entry = leaderboardRepository.findByUserId(user.getId())
                    .orElse(new LeaderboardEntry(user.getId(), user.getFullName() != null ? user.getFullName() : user.getUsername(), user.getAvatarUrl(), user.getActivePoints(), user.getCurrentStreak()));
            entry.setActivePoints(user.getActivePoints());
            leaderboardRepository.save(entry);
        }

        return item;
    }

    @Override
    public List<UserSrsItem> getAllUserItems(String userId) {
        return userSrsRepository.findByUserId(userId);
    }
}
